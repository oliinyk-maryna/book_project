package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/service"
)

type SocialHandler struct {
	socialService *service.SocialService
}

func NewSocialHandler(s *service.SocialService) *SocialHandler {
	return &SocialHandler{socialService: s}
}

// Helper для безпечного діставання ID
func getSocialUserID(r *http.Request) string {
	if val := r.Context().Value(middleware.ContextUserID); val != nil {
		if s, ok := val.(string); ok {
			return s
		}
	}
	return ""
}

// ════════════════════════════════════════════════════════════════════════
// ПІДПИСКИ (FOLLOWERS)
// ════════════════════════════════════════════════════════════════════════

// POST /api/users/{id}/follow
func (h *SocialHandler) FollowUser(w http.ResponseWriter, r *http.Request) {
	targetUserID := r.PathValue("id")
	currentUserID := getSocialUserID(r)

	if currentUserID == "" || targetUserID == "" {
		http.Error(w, "Неавторизований або невірний ID", http.StatusUnauthorized)
		return
	}

	if currentUserID == targetUserID {
		http.Error(w, "Не можна підписатися на самого себе", http.StatusBadRequest)
		return
	}

	if err := h.socialService.FollowUser(r.Context(), currentUserID, targetUserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Ви успішно підписалися"})
}

// DELETE /api/users/{id}/follow
func (h *SocialHandler) UnfollowUser(w http.ResponseWriter, r *http.Request) {
	targetUserID := r.PathValue("id")
	currentUserID := getSocialUserID(r)

	if currentUserID == "" {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	if err := h.socialService.UnfollowUser(r.Context(), currentUserID, targetUserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/users/{id}/followers
func (h *SocialHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("id")
	followers, err := h.socialService.GetFollowers(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(followers)
}

// GET /api/users/{id}/following
func (h *SocialHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("id")
	following, err := h.socialService.GetFollowing(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(following)
}

// ════════════════════════════════════════════════════════════════════════
// ВІДНОВЛЕНІ МЕТОДИ (Профіль, Пошук, Фід, Зв'язки)
// ════════════════════════════════════════════════════════════════════════

// GET /api/users/search?q=...
func (h *SocialHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		// Якщо фронтенд передає через параметр `query`
		query = r.URL.Query().Get("query")
	}
	viewerID := getSocialUserID(r)

	users, err := h.socialService.SearchUsers(r.Context(), query, viewerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// GET /api/users/{id}/profile
func (h *SocialHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("id")
	viewerID := getSocialUserID(r)

	profile, err := h.socialService.GetProfile(r.Context(), targetID, viewerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile)
}

// GET /api/me/feed
func (h *SocialHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	userID := getSocialUserID(r)
	if userID == "" {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	events, err := h.socialService.GetActivityFeed(r.Context(), userID, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// GET /api/me/connections?type=followers|following
func (h *SocialHandler) GetConnections(w http.ResponseWriter, r *http.Request) {
	userID := getSocialUserID(r)
	if userID == "" {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	connType := r.URL.Query().Get("type")
	var connections interface{}
	var err error

	if connType == "followers" {
		connections, err = h.socialService.GetFollowers(r.Context(), userID)
	} else {
		connections, err = h.socialService.GetFollowing(r.Context(), userID)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(connections)
}

