package handler

import (
	"book_project/backend/internal/middleware"
	"book_project/backend/internal/models"
	"book_project/backend/internal/service"
	"encoding/json"
	"net/http"
)

type CommentHandler struct {
	service *service.GroupService // Використовуємо той самий сервіс
}

func NewCommentHandler(s *service.GroupService) *CommentHandler {
	return &CommentHandler{service: s}
}

// POST /api/groups/{id}/comments
func (h *CommentHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.ContextUserID).(string)
	groupID := r.PathValue("id")

	var comment models.GroupComment
	json.NewDecoder(r.Body).Decode(&comment)

	savedComment, err := h.service.AddComment(r.Context(), comment, userID, groupID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(savedComment)
}

// GET /api/groups/{id}/comments
func (h *CommentHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")

	comments, err := h.service.GetComments(r.Context(), groupID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if comments == nil {
		comments = []models.GroupComment{}
	}

	json.NewEncoder(w).Encode(comments)
}
