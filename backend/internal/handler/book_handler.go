package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"book_project/backend/internal/models"
	"book_project/backend/internal/service"
)

type BookHandler struct {
	bookService *service.BookService
}

func NewBookHandler(bookService *service.BookService) *BookHandler {
	return &BookHandler{bookService: bookService}
}

// GET /api/books?search=...&genres=...&sort=...&page_min=...&page_max=...&rating_min=...&author=...
func (h *BookHandler) GetAllBooks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	pageMin, _ := strconv.Atoi(q.Get("page_min"))
	pageMax, _ := strconv.Atoi(q.Get("page_max"))
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	filters := models.BookFilters{
		Genres:       q["genres"],
		Languages:    q["languages"],
		Publishers:   q["publishers"],
		YearFrom:     q.Get("year_from"),
		YearTo:       q.Get("year_to"),
		Search:       q.Get("search"),
		Sort:         q.Get("sort"),
		Author:       q.Get("author"),
		RatingMin:    q.Get("rating_min"),
		PageCountMin: pageMin,
		PageCountMax: pageMax,
		Limit:        limit,
		Offset:       offset,
	}

	books, err := h.bookService.GetAllBooks(r.Context(), filters)
	if err != nil {
		http.Error(w, "Помилка завантаження книг", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(books)
}

// GET /api/books/search?q=...
func (h *BookHandler) SearchBooks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		q = r.URL.Query().Get("query")
	}
	books, err := h.bookService.SearchBooks(r.Context(), q)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]models.Book{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(books)
}

// GET /api/books/{id}
func (h *BookHandler) GetBookByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID, _ := r.Context().Value("user_id").(string)

	book, err := h.bookService.GetBookByID(r.Context(), id, userID)
	if err != nil {
		http.Error(w, "Книгу не знайдено", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(book)
}

// GET /api/filters
func (h *BookHandler) GetFilters(w http.ResponseWriter, r *http.Request) {
	filters, err := h.bookService.GetFilterOptions(r.Context())
	if err != nil {
		http.Error(w, "Помилка завантаження фільтрів", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(filters)
}

// GET /api/authors/search?q=...
func (h *BookHandler) SearchAuthors(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]string{})
		return
	}
	authors, err := h.bookService.SearchAuthors(r.Context(), q)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]string{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(authors)
}

// GET /api/top-year?year=2025&limit=10
func (h *BookHandler) GetTopByYear(w http.ResponseWriter, r *http.Request) {
	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	if year == 0 {
		year = 2025
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit == 0 {
		limit = 10
	}

	books, err := h.bookService.GetTopByYear(r.Context(), year, limit)
	if err != nil || books == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]models.Book{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(books)
}

// GET /api/books/{id}/reviews
func (h *BookHandler) GetReviews(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	reviews, _ := h.bookService.GetReviewsByWorkID(r.Context(), id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reviews)
}

// POST /api/books/{id}/reviews
func (h *BookHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		Rating     int    `json:"rating"`
		Comment    string `json:"comment"`
		HasSpoiler bool   `json:"has_spoiler"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний JSON", http.StatusBadRequest)
		return
	}

	if err := h.bookService.AddReview(r.Context(), id, userID, req.Rating, req.Comment, req.HasSpoiler); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Відгук опубліковано"})
}

// POST /api/reviews/{id}/like
func (h *BookHandler) LikeReview(w http.ResponseWriter, r *http.Request) {
	reviewID := r.PathValue("id")
	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}
	var req struct {
		Emoji string `json:"emoji"`
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Emoji == "" {
		req.Emoji = "❤️"
	}
	if err := h.bookService.LikeReview(r.Context(), reviewID, userID, req.Emoji); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/books/{id}/clubs
func (h *BookHandler) GetBookClubs(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	clubs, _ := h.bookService.GetClubsByWorkID(r.Context(), id)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(clubs)
}

// POST /api/me/books/{id}/sessions
func (h *BookHandler) AddReadingSession(w http.ResponseWriter, r *http.Request) {
	workID := r.PathValue("id")
	userID, ok := r.Context().Value("user_id").(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req models.ReadingSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний формат даних", http.StatusBadRequest)
		return
	}

	// Якщо startPage/endPage передані — використовуємо повну версію
	if req.StartPage > 0 || req.EndPage > 0 {
		if err := h.bookService.AddReadingSessionFull(r.Context(), userID, workID, req.DurationSeconds, req.PagesRead, req.StartPage, req.EndPage); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		if err := h.bookService.AddReadingSession(r.Context(), userID, workID, req.DurationSeconds, req.PagesRead); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "Сесію збережено"})
}
