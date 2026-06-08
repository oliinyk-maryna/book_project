package handler

import (
	"book_project/backend/internal/middleware"
	"book_project/backend/internal/models"
	"book_project/backend/internal/service"
	"encoding/json"
	"net/http"
)

type CommentHandler struct {
	service *service.GroupService
}

func NewCommentHandler(s *service.GroupService) *CommentHandler {
	return &CommentHandler{service: s}
}

// POST /api/clubs/{id}/comments  <-- Змінено на clubs для відповідності
func (h *CommentHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований доступ", http.StatusUnauthorized)
		return
	}

	groupID := r.PathValue("id")
	if groupID == "" {
		http.Error(w, "ID клубу обов'язковий", http.StatusBadRequest)
		return
	}

	var comment models.GroupComment
	// Виправлено: Обов'язково перевіряємо помилку декодування
	if err := json.NewDecoder(r.Body).Decode(&comment); err != nil {
		http.Error(w, "Невалідний JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	if comment.Content == "" {
		http.Error(w, "Текст коментаря не може бути порожнім", http.StatusBadRequest)
		return
	}

	savedComment, err := h.service.AddComment(r.Context(), comment, userID, groupID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Виправлено: додано заголовок типу контенту
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(savedComment)
}

// GET /api/clubs/{id}/comments  <-- Змінено на clubs для відповідності
func (h *CommentHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	if groupID == "" {
		http.Error(w, "ID клубу обов'язковий", http.StatusBadRequest)
		return
	}

	comments, err := h.service.GetComments(r.Context(), groupID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if comments == nil {
		comments = []models.GroupComment{}
	}

	// Виправлено: обов'язково вказуємо фронтенду, що повертаємо JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(comments)
}
