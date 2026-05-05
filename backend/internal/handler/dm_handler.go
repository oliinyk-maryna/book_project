package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/repository"
)

type DMHandler struct {
	repo *repository.DMRepository
	hub  *WSHub
}

func NewDMHandler(repo *repository.DMRepository, hub *WSHub) *DMHandler {
	return &DMHandler{repo: repo, hub: hub}
}

// GET /api/me/conversations
func (h *DMHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	convs, err := h.repo.GetConversations(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(convs)
}

// GET /api/me/conversations/{id}
func (h *DMHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	convID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	limit := 50
	if l, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && l > 0 {
		limit = l
	}

	msgs, err := h.repo.GetMessages(r.Context(), convID, userID, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

// POST /api/me/conversations/{id}
func (h *DMHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	convID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		http.Error(w, "Вміст повідомлення обов'язковий", http.StatusBadRequest)
		return
	}

	msg, err := h.repo.SendMessage(r.Context(), convID, userID, req.Content)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	// Broadcast via WS
	h.hub.BroadcastToConversation(convID, WSMessage{
		Type:      "dm",
		Content:   msg.Content,
		UserID:    userID,
		MessageID: msg.ID.String(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msg)
}

// POST /api/me/conversations/start/{uid}
func (h *DMHandler) StartConversation(w http.ResponseWriter, r *http.Request) {
	otherUID := r.PathValue("uid")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	if userID == otherUID {
		http.Error(w, "Не можна писати самому собі", http.StatusBadRequest)
		return
	}

	convID, err := h.repo.StartOrGetConversation(r.Context(), userID, otherUID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"conversation_id": convID})
}
