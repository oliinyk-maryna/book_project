package handler

import (
	"encoding/json"
	"net/http"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/repository"
)

type QuoteHandler struct {
	repo *repository.QuoteRepository
}

func NewQuoteHandler(repo *repository.QuoteRepository) *QuoteHandler {
	return &QuoteHandler{repo: repo}
}

// GET /api/me/quotes
func (h *QuoteHandler) GetMyQuotes(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	quotes, err := h.repo.GetByUser(r.Context(), userID)
	if err != nil || quotes == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(quotes)
}

// POST /api/me/quotes
func (h *QuoteHandler) CreateQuote(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		WorkID   string `json:"work_id"`
		Text     string `json:"text"`
		PageRef  *int   `json:"page_ref"`
		IsPublic bool   `json:"is_public"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Text == "" {
		http.Error(w, "Текст цитати обов'язковий", http.StatusBadRequest)
		return
	}

	q, err := h.repo.Create(r.Context(), userID, req.WorkID, req.Text, req.PageRef, req.IsPublic)
	if err != nil {
		http.Error(w, "Помилка: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(q)
}

// DELETE /api/me/quotes/{id}
func (h *QuoteHandler) DeleteQuote(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)

	if err := h.repo.Delete(r.Context(), id, userID); err != nil {
		http.Error(w, "Помилка видалення", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/books/{id}/quotes
func (h *QuoteHandler) GetBookQuotes(w http.ResponseWriter, r *http.Request) {
	workID := r.PathValue("id")
	quotes, err := h.repo.GetByWork(r.Context(), workID)
	if err != nil || quotes == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(quotes)
}
