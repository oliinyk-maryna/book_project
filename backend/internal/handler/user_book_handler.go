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
// GET /api/users/{id}/books або /api/me/books
func (h *UserBookHandler) GetUserBooks(w http.ResponseWriter, r *http.Request) {
	// 1. Спробуємо взяти ID з URL ({id})
	userID := r.PathValue("id")

	// 2. Якщо в URL немає ID, беремо ID авторизованого користувача з контексту
	if userID == "" {
		uid, ok := r.Context().Value(middleware.ContextUserID).(string)
		if !ok {
			http.Error(w, "Неавторизований доступ", http.StatusUnauthorized)
			return
		}
		userID = uid
	}

	// 3. Використовуємо сервіс (а не репозиторій напряму, для дотримання архітектури)
	books, err := h.userBookService.GetUserBooks(r.Context(), userID)
	if err != nil {
		// Повертаємо порожній масив, якщо книг немає, це краще ніж 500 помилка
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Помилка читання запиту", http.StatusBadRequest)
		return
	}
	if req.Status == "" {
		req.Status = "planned"
	}

	if err := h.userBookService.AddWorkToShelf(r.Context(), userID, workID, req.Status); err != nil {
		http.Error(w, "Помилка збереження: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Книгу додано на полицю!"})
}

// PATCH /api/me/books/{id}/progress — оновити прогрес, статус, нотатки, дати
// PATCH /api/me/books/{id}/progress
func (h *UserBookHandler) UpdateProgress(w http.ResponseWriter, r *http.Request) {
	workID := r.PathValue("id")
	// Використовуємо контекст для авторизації
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok || userID == "" {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		CurrentPage int    `json:"current_page"`
		Status      string `json:"status"`
		Notes       string `json:"notes"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний JSON", http.StatusBadRequest)
		return
	}

	err := h.userBookService.UpdateProgress(r.Context(), userID, workID, req.CurrentPage, req.Status, req.Notes, req.StartDate, req.EndDate)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Прогрес та нотатки збережено"})
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
