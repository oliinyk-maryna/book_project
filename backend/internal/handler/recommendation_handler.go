package handler

import (
	"encoding/json"
	"net/http"

	"book_project/backend/internal/service"
)

type RecommendationHandler struct {
	svc *service.RecommendationService
}

func NewRecommendationHandler(svc *service.RecommendationService) *RecommendationHandler {
	return &RecommendationHandler{svc: svc}
}

// POST /api/me/recommendations  {"query": "щось похмуре..."}
func (h *RecommendationHandler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)

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

// GET /api/me/recommendations/personalized  — для блоку на головній
func (h *RecommendationHandler) GetPersonalized(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)

	result, err := h.svc.GetPersonalized(r.Context(), userID, 6)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
