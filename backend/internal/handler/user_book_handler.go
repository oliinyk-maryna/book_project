package handler

import (
	"encoding/json"
	"net/http"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/models"
	"book_project/backend/internal/service"
)

type UserBookHandler struct {
	userBookService *service.UserBookService
}

func NewUserBookHandler(s *service.UserBookService) *UserBookHandler {
	return &UserBookHandler{userBookService: s}
}

// POST /api/me/books — додати книгу на полицю (Universal: local або google)
func (h *UserBookHandler) AddToShelf(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований доступ", http.StatusUnauthorized)
		return
	}

	var requestData struct {
		Book   models.Book `json:"book"`
		Status string      `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Помилка читання запиту", http.StatusBadRequest)
		return
	}

	if requestData.Status == "" {
		requestData.Status = "planned"
	}

	err := h.userBookService.AddBookToShelf(r.Context(), userID, requestData.Book, requestData.Status)
	if err != nil {
		http.Error(w, "Помилка збереження книги: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Книгу успішно додано на полицю!"})
}

// GET /api/me/books — отримати всі книги з полиці
func (h *UserBookHandler) GetUserBooks(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований доступ", http.StatusUnauthorized)
		return
	}

	books, err := h.userBookService.GetUserBooks(r.Context(), userID)
	if err != nil {
		// Повертаємо порожній масив, не помилку — щоб фронт не падав
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(books)
}

// POST /api/me/books/{id} — додати/оновити статус книги за work_id
func (h *UserBookHandler) AddWorkToShelf(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований доступ", http.StatusUnauthorized)
		return
	}

	workID := r.PathValue("id")
	if workID == "" {
		http.Error(w, "ID книги обов'язковий", http.StatusBadRequest)
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Status == "" {
		req.Status = "planned"
	}

	err := h.userBookService.AddWorkToShelf(r.Context(), userID, workID, req.Status)
	if err != nil {
		http.Error(w, "Помилка збереження: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Статус книги оновлено!"})
}

// PATCH /api/me/books/{id}/progress — оновити прогрес читання
func (h *UserBookHandler) UpdateProgress(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований доступ", http.StatusUnauthorized)
		return
	}

	workID := r.PathValue("id")
	if workID == "" {
		http.Error(w, "ID книги обов'язковий", http.StatusBadRequest)
		return
	}

	var req struct {
		CurrentPage int    `json:"current_page"`
		Status      string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Помилка читання запиту", http.StatusBadRequest)
		return
	}

	err := h.userBookService.UpdateProgress(r.Context(), userID, workID, req.CurrentPage, req.Status)
	if err != nil {
		http.Error(w, "Помилка оновлення прогресу: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Прогрес оновлено!"})
}

// DELETE /api/me/books/{id} — видалити книгу з полиці
func (h *UserBookHandler) RemoveFromShelf(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований доступ", http.StatusUnauthorized)
		return
	}

	workID := r.PathValue("id")
	if workID == "" {
		http.Error(w, "ID книги обов'язковий", http.StatusBadRequest)
		return
	}

	if err := h.userBookService.RemoveFromShelf(r.Context(), userID, workID); err != nil {
		http.Error(w, "Помилка видалення: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
