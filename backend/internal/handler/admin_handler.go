package handler

import (
	"encoding/json"
	"net/http"

	"book_project/backend/internal/models" // переконайтеся, що імпорт правильний
	"book_project/backend/internal/repository"
)

type AdminHandler struct {
	bookRepo      *repository.BookRepository
	userRepo      *repository.UserRepository
	analyticsRepo *repository.AnalyticsRepository // Додано поле
}

// Оновлено конструктор: додано третій аргумент
func NewAdminHandler(bookRepo *repository.BookRepository, userRepo *repository.UserRepository, analyticsRepo *repository.AnalyticsRepository) *AdminHandler {
	return &AdminHandler{
		bookRepo:      bookRepo,
		userRepo:      userRepo,
		analyticsRepo: analyticsRepo,
	}
}

func adminCheck(r *http.Request) bool {
	role, _ := r.Context().Value("user_role").(string)
	return role == "admin" || role == "moderator"
}

// GET /api/admin/books — список книг для адмінки
func (h *AdminHandler) ListBooks(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	// Використовуємо порожні фільтри для отримання списку
	books, err := h.bookRepo.GetAll(r.Context(), models.BookFilters{})
	if err != nil {
		http.Error(w, "Помилка завантаження книг", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(books)
}

// POST /api/admin/books — додати книгу
func (h *AdminHandler) CreateBook(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req struct {
		Title       string   `json:"title"`
		Authors     []string `json:"authors"` // Масив авторів
		Description string   `json:"description"`
		CoverURL    string   `json:"cover_url"`
		PageCount   int      `json:"page_count"`
		Publisher   string   `json:"publisher"`
		PubDate     string   `json:"publication_date"`
		ISBN        string   `json:"isbn"`
		Genres      []string `json:"genres"`
		Language    string   `json:"language"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний JSON", http.StatusBadRequest)
		return
	}

	// ЗМІНЕНО: перевіряємо довжину масиву Authors замість старого req.Author
	if req.Title == "" || len(req.Authors) == 0 {
		http.Error(w, "Назва та хоча б один автор обов'язкові", http.StatusBadRequest)
		return
	}

	// ЗМІНЕНО: передаємо Authors замість Author
	workID, err := h.bookRepo.AdminCreateBook(r.Context(), repository.AdminCreateBookParams{
		Title:       req.Title,
		Authors:     req.Authors, // Ось тут було Author: req.Author
		Description: req.Description,
		CoverURL:    req.CoverURL,
		PageCount:   req.PageCount,
		Publisher:   req.Publisher,
		PubDate:     req.PubDate,
		ISBN:        req.ISBN,
		Genres:      req.Genres,
		Language:    req.Language,
	})

	if err != nil {
		http.Error(w, "Помилка створення: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"work_id": workID, "message": "Книгу успішно додано"})
}

// PUT /api/admin/books/{id} — редагувати книгу
func (h *AdminHandler) UpdateBook(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	workID := r.PathValue("id")

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		CoverURL    *string `json:"cover_url"`
		PageCount   *int    `json:"page_count"`
		Publisher   *string `json:"publisher"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if err := h.bookRepo.AdminUpdateBook(r.Context(), workID, req.Title, req.Description, req.CoverURL, req.PageCount, req.Publisher); err != nil {
		http.Error(w, "Помилка оновлення: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Книгу оновлено"})
}

// DELETE /api/admin/books/{id}
func (h *AdminHandler) DeleteBook(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	workID := r.PathValue("id")

	if err := h.bookRepo.AdminDeleteBook(r.Context(), workID); err != nil {
		http.Error(w, "Помилка видалення: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/users — змінено назву з GetUsers на ListUsers
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	users, err := h.userRepo.AdminGetUsers(r.Context(), r.URL.Query().Get("q"), 50)
	if err != nil {
		http.Error(w, "Помилка", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *AdminHandler) SetUserRole(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	userID := r.PathValue("id")

	var req struct {
		Role string `json:"role"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	allowed := map[string]bool{"user": true, "admin": true, "moderator": true}
	if !allowed[req.Role] {
		http.Error(w, "Невірна роль", http.StatusBadRequest)
		return
	}

	h.userRepo.AdminSetRole(r.Context(), userID, req.Role)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Роль змінено"})
}

func (h *AdminHandler) DeleteReview(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	reviewID := r.PathValue("id")
	h.bookRepo.AdminDeleteReview(r.Context(), reviewID)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) DeleteThread(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	threadID := r.PathValue("id")
	h.bookRepo.AdminDeleteThread(r.Context(), threadID)
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/stats — змінено назву з GetPlatformStats на GetSiteStats
func (h *AdminHandler) GetSiteStats(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	stats, err := h.bookRepo.AdminGetPlatformStats(r.Context())
	if err != nil {
		http.Error(w, "Помилка", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
