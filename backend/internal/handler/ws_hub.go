package handler

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// WSMessage — структура повідомлення через WebSocket
type WSMessage struct {
	Type        string `json:"type"` // "chat", "system", "typing", "history"
	ClubID      string `json:"club_id,omitempty"`
	UserID      string `json:"user_id,omitempty"`
	Username    string `json:"username,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
	Content     string `json:"content,omitempty"`
	MessageType string `json:"message_type,omitempty"` // text, spoiler, quote, system
	PageRef     *int   `json:"page_ref,omitempty"`
	ReplyToID   string `json:"reply_to_id,omitempty"`
	MessageID   string `json:"message_id,omitempty"`
	Timestamp   string `json:"timestamp,omitempty"`
	// Для "typing" подій
	IsTyping bool `json:"is_typing,omitempty"`
}

// WSClient — один підключений клієнт
type WSClient struct {
	Hub    *WSHub
	ClubID string
	UserID string
	Send   chan []byte
	mu     sync.Mutex
	closed bool
}

func (c *WSClient) SafeSend(msg []byte) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return false
	}
	select {
	case c.Send <- msg:
		return true
	default:
		return false
	}
}

func (c *WSClient) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.closed {
		c.closed = true
		close(c.Send)
	}
}

// WSHub — центральний хаб для всіх WebSocket з'єднань
type WSHub struct {
	// clubs: clubID → set of clients
	clubs      map[string]map[*WSClient]bool
	mu         sync.RWMutex
	Register   chan *WSClient
	Unregister chan *WSClient
	Broadcast  chan *ClubBroadcast
}

type ClubBroadcast struct {
	ClubID  string
	Message []byte
	Sender  *WSClient // nil = broadcast to all
}

func NewWSHub() *WSHub {
	return &WSHub{
		clubs:      make(map[string]map[*WSClient]bool),
		Register:   make(chan *WSClient, 64),
		Unregister: make(chan *WSClient, 64),
		Broadcast:  make(chan *ClubBroadcast, 256),
	}
}

func (h *WSHub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if _, ok := h.clubs[client.ClubID]; !ok {
				h.clubs[client.ClubID] = make(map[*WSClient]bool)
			}
			h.clubs[client.ClubID][client] = true
			h.mu.Unlock()
			log.Printf("[WS] client joined club=%s user=%s", client.ClubID, client.UserID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if members, ok := h.clubs[client.ClubID]; ok {
				if _, exists := members[client]; exists {
					delete(members, client)
					client.Close()
					if len(members) == 0 {
						delete(h.clubs, client.ClubID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("[WS] client left club=%s user=%s", client.ClubID, client.UserID)

		case broadcast := <-h.Broadcast:
			h.mu.RLock()
			members, ok := h.clubs[broadcast.ClubID]
			h.mu.RUnlock()
			if !ok {
				continue
			}
			for client := range members {
				if broadcast.Sender != nil && client == broadcast.Sender {
					continue
				}
				if !client.SafeSend(broadcast.Message) {
					h.Unregister <- client
				}
			}
		}
	}
}

// BroadcastToClub — зручна функція для відправки в клуб
func (h *WSHub) BroadcastToClub(clubID string, msg WSMessage) {
	msg.Timestamp = time.Now().UTC().Format(time.RFC3339)
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("[WS] marshal error: %v", err)
		return
	}
	h.Broadcast <- &ClubBroadcast{ClubID: clubID, Message: data}
}

// GetOnlineCount — кількість онлайн-учасників клубу
func (h *WSHub) GetOnlineCount(clubID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clubs[clubID])
}

// BroadcastToConversation sends a DM to all participants in a conversation room.
// Reuses the same room mechanism as club chat (conversation_id as room key).
func (h *WSHub) BroadcastToConversation(conversationID string, msg WSMessage) {
	h.BroadcastToClub("dm:"+conversationID, msg)
}
