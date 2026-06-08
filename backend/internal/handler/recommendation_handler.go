package handler

import (
	"encoding/json"
	"net/http"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/service"
)

type RecommendationHandler struct {
	svc *service.RecommendationService
}

func NewRecommendationHandler(svc *service.RecommendationService) *RecommendationHandler {
	return &RecommendationHandler{svc: svc}
}

func (h *RecommendationHandler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	// ВИПРАВЛЕНО: використовуємо middleware.ContextUserID
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)

	var req struct {
		Query string `json:"query"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var result interface{}
	var err error

	if req.Query != "" {
		result, err = h.svc.GetByQuery(r.Context(), userID, req.Query, 8)
	} else {
		result, err = h.svc.GetPersonalized(r.Context(), userID, 8)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *RecommendationHandler) GetPersonalized(w http.ResponseWriter, r *http.Request) {
	// ВИПРАВЛЕНО: використовуємо middleware.ContextUserID
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)

	result, err := h.svc.GetPersonalized(r.Context(), userID, 6)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
