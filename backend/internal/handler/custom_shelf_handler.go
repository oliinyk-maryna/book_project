package handler

import (
	"encoding/json"
	"net/http"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/repository"
)

type CustomShelfHandler struct {
	repo *repository.CustomShelfRepository
}

func NewCustomShelfHandler(repo *repository.CustomShelfRepository) *CustomShelfHandler {
	return &CustomShelfHandler{repo: repo}
}

// GET /api/me/shelves
func (h *CustomShelfHandler) GetShelves(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	shelves, err := h.repo.GetByUser(r.Context(), userID)
	if err != nil || shelves == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shelves)
}

// POST /api/me/shelves
func (h *CustomShelfHandler) CreateShelf(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		IsPublic    bool   `json:"is_public"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "Назва обов'язкова", http.StatusBadRequest)
		return
	}
	shelf, err := h.repo.Create(r.Context(), userID, req.Name, req.Description, req.IsPublic)
	if err != nil {
		http.Error(w, "Помилка: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(shelf)
}

// DELETE /api/me/shelves/{id}
func (h *CustomShelfHandler) DeleteShelf(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	h.repo.Delete(r.Context(), id, userID)
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/me/shelves/{id}/books
func (h *CustomShelfHandler) AddBookToShelf(w http.ResponseWriter, r *http.Request) {
	shelfID := r.PathValue("id")
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	var req struct {
		WorkID string `json:"work_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.WorkID == "" {
		http.Error(w, "work_id обов'язковий", http.StatusBadRequest)
		return
	}
	if err := h.repo.AddBook(r.Context(), shelfID, userID, req.WorkID); err != nil {
		http.Error(w, "Помилка: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /api/me/shelves/{id}/books/{bookId}
func (h *CustomShelfHandler) RemoveBookFromShelf(w http.ResponseWriter, r *http.Request) {
	shelfID := r.PathValue("id")
	workID := r.PathValue("bookId")
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	h.repo.RemoveBook(r.Context(), shelfID, userID, workID)
	w.WriteHeader(http.StatusNoContent)
}
