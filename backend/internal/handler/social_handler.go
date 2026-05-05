package handler

import (
	"encoding/json"
	"net/http"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/repository"
)

type SocialHandler struct {
	repo *repository.SocialRepository
}

func NewSocialHandler(repo *repository.SocialRepository) *SocialHandler {
	return &SocialHandler{repo: repo}
}

// GET /api/users/search?q=...
func (h *SocialHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	viewerID, _ := r.Context().Value(middleware.ContextUserID).(string)
	if viewerID == "" {
		viewerID = "00000000-0000-0000-0000-000000000000"
	}
	users, err := h.repo.SearchUsers(r.Context(), query, viewerID)
	if err != nil {
		http.Error(w, "Помилка пошуку", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// GET /api/users/{id}/profile
func (h *SocialHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("id")
	viewerID, _ := r.Context().Value(middleware.ContextUserID).(string)
	if viewerID == "" {
		viewerID = "00000000-0000-0000-0000-000000000000"
	}
	profile, err := h.repo.GetProfile(r.Context(), targetID, viewerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

// POST /api/users/{id}/follow
func (h *SocialHandler) Follow(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("id")
	myID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	if err := h.repo.Follow(r.Context(), myID, targetID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/users/{id}/follow
func (h *SocialHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("id")
	myID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	h.repo.Unfollow(r.Context(), myID, targetID)
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/users/{id}/friend-request
func (h *SocialHandler) SendFriendRequest(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("id")
	myID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	if err := h.repo.SendFriendRequest(r.Context(), myID, targetID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Запит надіслано"})
}

// POST /api/me/friend-requests/{id}/accept
func (h *SocialHandler) AcceptFriendRequest(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("id")
	myID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	if err := h.repo.AcceptFriendRequest(r.Context(), requestID, myID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Дружба підтверджена!"})
}

// POST /api/me/friend-requests/{id}/decline
func (h *SocialHandler) DeclineFriendRequest(w http.ResponseWriter, r *http.Request) {
	requestID := r.PathValue("id")
	myID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	h.repo.DeclineFriendRequest(r.Context(), requestID, myID)
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/me/friend-requests
func (h *SocialHandler) GetFriendRequests(w http.ResponseWriter, r *http.Request) {
	myID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	reqs, err := h.repo.GetFriendRequests(r.Context(), myID)
	if err != nil {
		http.Error(w, "Помилка", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reqs)
}

// GET /api/me/feed
func (h *SocialHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	myID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	events, err := h.repo.GetActivityFeed(r.Context(), myID, 30)
	if err != nil {
		http.Error(w, "Помилка", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
