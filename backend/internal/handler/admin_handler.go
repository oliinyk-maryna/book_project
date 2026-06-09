package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/repository"
)

type AdminHandler struct {
	bookRepo      *repository.BookRepository
	userRepo      *repository.UserRepository
	analyticsRepo *repository.AnalyticsRepository
}

func NewAdminHandler(bookRepo *repository.BookRepository, userRepo *repository.UserRepository, analyticsRepo *repository.AnalyticsRepository) *AdminHandler {
	return &AdminHandler{
		bookRepo:      bookRepo,
		userRepo:      userRepo,
		analyticsRepo: analyticsRepo,
	}
}

func adminCheck(r *http.Request) bool {
	role, _ := r.Context().Value(middleware.ContextUserRole).(string)
	return role == "admin" || role == "moderator"
}

// Універсальна структура для валідації та парсингу JSON книг (Виправляє баг зі сторінками та жанрами)
type BookAdminRequest struct {
	Title       string   `json:"title"`
	Authors     []string `json:"authors"`
	Description string   `json:"description"`
	CoverURL    string   `json:"cover_url"`
	PageCount   int      `json:"page_count"`
	Publisher   string   `json:"publisher"`
	PubDate     string   `json:"publication_date"`
	ISBN        string   `json:"isbn"`
	Genres      []string `json:"genres"`
	Language    string   `json:"language"`
}

// GET /api/admin/books/{id} — отримати повні дані книги для редагування
func (h *AdminHandler) GetBook(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	id := r.PathValue("id")
	book, err := h.bookRepo.GetByIDWithDetails(r.Context(), id, "")
	if err != nil {
		http.Error(w, "Книгу не знайдено: "+err.Error(), http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(book)
}

// POST /api/admin/books — додати книгу
func (h *AdminHandler) CreateBook(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	var req BookAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний JSON", http.StatusBadRequest)
		return
	}

	if req.Title == "" || len(req.Authors) == 0 {
		http.Error(w, "Назва та хоча б один автор обов'язкові", http.StatusBadRequest)
		return
	}

	workID, err := h.bookRepo.AdminCreateBook(r.Context(), repository.AdminCreateBookParams{
		Title:       req.Title,
		Authors:     req.Authors,
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
	id := r.PathValue("id")

	var req BookAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний JSON", http.StatusBadRequest)
		return
	}

	// Перетворюємо нашу перевірену JSON структуру у параметри репозиторію
	repoParams := repository.AdminCreateBookParams{
		Title:       req.Title,
		Authors:     req.Authors,
		Description: req.Description,
		CoverURL:    req.CoverURL,
		PageCount:   req.PageCount,
		Publisher:   req.Publisher,
		PubDate:     req.PubDate,
		ISBN:        req.ISBN,
		Genres:      req.Genres,
		Language:    req.Language,
	}

	if err := h.bookRepo.AdminUpdateBook(r.Context(), id, repoParams); err != nil {
		http.Error(w, "Помилка оновлення: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Книгу успішно оновлено"})
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

// GET /api/admin/users
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	users, err := h.userRepo.AdminGetUsers(r.Context(), r.URL.Query().Get("q"), 50)
	if err != nil {
		http.Error(w, "Помилка завантаження користувачів", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// POST /api/admin/users/{id}/role
func (h *AdminHandler) SetUserRole(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	userID := r.PathValue("id")

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	allowed := map[string]bool{"user": true, "admin": true, "moderator": true}
	if !allowed[req.Role] {
		http.Error(w, "Невірна роль", http.StatusBadRequest)
		return
	}

	if err := h.userRepo.AdminSetRole(r.Context(), userID, req.Role); err != nil {
		http.Error(w, "Помилка зміни ролі: "+err.Error(), http.StatusInternalServerError)
		return
	}
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

// GET /api/admin/stats — Повноцінна аналітика для Адміна
func (h *AdminHandler) GetSiteStats(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Беремо базові лічильники з репозиторію книг
	stats, err := h.bookRepo.AdminGetPlatformStats(r.Context())
	if err != nil {
		http.Error(w, "Помилка базової статистики", http.StatusInternalServerError)
		return
	}

	// Оскільки stats це map[string]interface{}, ми звертаємося до ключів через квадратні дужки.
	// Зверніть увагу: якщо у вашому map ключі називаються інакше (напр. "TotalBooks" замість "total_books"),
	// змініть рядки у дужках [] на ваші.
	response := map[string]interface{}{
		"total_books":       stats["total_books"],
		"total_users":       stats["total_users"],
		"total_reviews":     stats["total_reviews"],
		"total_clubs":       stats["total_clubs"],
		"new_users_30d":     stats["new_users_30d"],
		"new_reviews_30d":   stats["new_reviews_30d"],
		"active_readers_7d": stats["active_readers_7d"],
		"system_status":     "Healthy",
		"last_updated":      time.Now().Format("15:04:05"),
	}

	if h.analyticsRepo != nil {
		// Додаткова аналітика
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// DELETE /api/admin/users/{id}
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	userID := r.PathValue("id")
	if err := h.userRepo.AdminDeleteUser(r.Context(), userID); err != nil {
		http.Error(w, "Помилка видалення: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/reviews
func (h *AdminHandler) ListReviews(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	reviews, err := h.bookRepo.AdminListReviews(r.Context(), 100)
	if err != nil {
		http.Error(w, "Помилка завантаження відгуків", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reviews)
}

// GET /api/admin/clubs
func (h *AdminHandler) ListClubs(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	clubs, err := h.bookRepo.AdminListClubs(r.Context(), 100)
	if err != nil {
		http.Error(w, "Помилка завантаження клубів", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(clubs)
}

// DELETE /api/admin/clubs/{id}
func (h *AdminHandler) AdminDeleteClub(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	clubID := r.PathValue("id")
	if err := h.bookRepo.AdminForceDeleteClub(r.Context(), clubID); err != nil {
		http.Error(w, "Помилка видалення клубу: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/admin/books
func (h *AdminHandler) ListBooks(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	sortField := r.URL.Query().Get("sort")
	if sortField == "" {
		sortField = "created_at"
	}

	sortOrder := r.URL.Query().Get("order")
	if sortOrder == "" {
		sortOrder = "DESC"
	}

	search := r.URL.Query().Get("q")

	books, total, err := h.bookRepo.AdminListBooks(r.Context(), page, limit, sortField, sortOrder, search)
	if err != nil {
		http.Error(w, "Помилка завантаження книг: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":  books,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// POST /api/admin/upload
func (h *AdminHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if !adminCheck(r) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil {
		http.Error(w, "Файл занадто великий (макс 5MB)", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Не вдалося отримати файл", http.StatusBadRequest)
		return
	}
	defer file.Close()

	os.MkdirAll("./uploads", os.ModePerm)

	ext := filepath.Ext(header.Filename)
	newFileName := fmt.Sprintf("cover_%d%s", time.Now().UnixNano(), ext)
	savePath := filepath.Join(".", "uploads", newFileName)

	dst, err := os.Create(savePath)
	if err != nil {
		http.Error(w, "Помилка збереження файлу на сервері", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Помилка під час копіювання файлу", http.StatusInternalServerError)
		return
	}

	fileURL := fmt.Sprintf("/uploads/%s", newFileName)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"url": fileURL})
}
