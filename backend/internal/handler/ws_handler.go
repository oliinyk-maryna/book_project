package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/models"
	"book_project/backend/internal/repository"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // В продакшні обмежити до свого домену
	},
}

type WSHandler struct {
	hub      *WSHub
	clubRepo *repository.GroupRepository
}

func NewWSHandler(hub *WSHub, clubRepo *repository.GroupRepository) *WSHandler {
	return &WSHandler{hub: hub, clubRepo: clubRepo}
}

// ServeClubWS — WebSocket ендпоінт: GET /api/clubs/:id/ws
func (h *WSHandler) ServeClubWS(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Перевіряємо чи юзер є членом клубу
	isMember, err := h.clubRepo.IsMember(r.Context(), clubID, userID)
	if err != nil || !isMember {
		http.Error(w, "Not a club member", http.StatusForbidden)
		return
	}

	// Отримуємо username
	username, avatar := h.clubRepo.GetUserInfo(r.Context(), userID)

	// Апгрейдимо HTTP → WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] upgrade error: %v", err)
		return
	}

	client := &WSClient{
		Hub:    h.hub,
		ClubID: clubID,
		UserID: userID,
		Send:   make(chan []byte, 128),
	}

	h.hub.Register <- client

	// Відправляємо системне повідомлення про вхід
	h.hub.BroadcastToClub(clubID, WSMessage{
		Type:        "system",
		ClubID:      clubID,
		Username:    username,
		Content:     username + " приєднався до чату",
		MessageType: "system",
	})

	// Відправляємо останні 30 повідомлень новому учаснику
	go h.sendHistory(client, conn, clubID)

	// Горутини для читання і запису
	go h.writePump(client, conn)
	h.readPump(client, conn, username, avatar)
}

func (h *WSHandler) sendHistory(client *WSClient, conn *websocket.Conn, clubID string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	msgs, err := h.clubRepo.GetRecentMessages(ctx, clubID, 30)
	if err != nil {
		return
	}

	histMsg := struct {
		Type     string               `json:"type"`
		Messages []models.ChatMessage `json:"messages"`
	}{
		Type:     "history",
		Messages: msgs,
	}

	data, err := json.Marshal(histMsg)
	if err != nil {
		return
	}
	client.SafeSend(data)
}

func (h *WSHandler) readPump(client *WSClient, conn *websocket.Conn, username, avatar string) {
	defer func() {
		h.hub.Unregister <- client
		conn.Close()
	}()

	conn.SetReadLimit(8192)
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] read error: %v", err)
			}
			break
		}

		var incoming WSMessage
		if err := json.Unmarshal(rawMsg, &incoming); err != nil {
			continue
		}

		incoming.UserID = client.UserID
		incoming.Username = username
		incoming.AvatarURL = avatar
		incoming.ClubID = client.ClubID
		incoming.Timestamp = time.Now().UTC().Format(time.RFC3339)

		// Обробляємо тип
		switch incoming.Type {
		case "chat":
			if incoming.Content == "" {
				continue
			}
			// Зберігаємо в БД
			msgID := uuid.New()
			incoming.MessageID = msgID.String()

			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			h.clubRepo.SaveMessage(ctx, models.ChatMessage{
				ID:       msgID,
				ClubID:   uuidPtr(client.ClubID),
				UserID:   uuid.MustParse(client.UserID),
				Username: username,
				Content:  incoming.Content,
				Type:     incoming.MessageType,
				PageRef:  incoming.PageRef,
			})
			cancel()

			// Розсилаємо в клуб (включно з відправником)
			data, _ := json.Marshal(incoming)
			h.hub.Broadcast <- &ClubBroadcast{
				ClubID:  client.ClubID,
				Message: data,
			}

		case "typing":
			// Розсилаємо typing indicator (не зберігаємо)
			incoming.IsTyping = true
			data, _ := json.Marshal(incoming)
			h.hub.Broadcast <- &ClubBroadcast{
				ClubID:  client.ClubID,
				Message: data,
				Sender:  client,
			}
		}
	}
}

func (h *WSHandler) writePump(client *WSClient, conn *websocket.Conn) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		conn.Close()
	}()

	for {
		select {
		case msg, ok := <-client.Send:
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func uuidPtr(s string) *uuid.UUID {
	id, err := uuid.Parse(s)
	if err != nil {
		return nil
	}
	return &id
}
