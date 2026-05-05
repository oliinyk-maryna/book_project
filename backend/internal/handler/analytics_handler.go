package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/repository"
)

type AnalyticsHandler struct {
	repo *repository.AnalyticsRepository
}

func NewAnalyticsHandler(repo *repository.AnalyticsRepository) *AnalyticsHandler {
	return &AnalyticsHandler{repo: repo}
}

// GET /api/trending
func (h *AnalyticsHandler) GetTrending(w http.ResponseWriter, r *http.Request) {
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	// Викликаємо GetTrendingBooks за останні 7 днів
	books, err := h.repo.GetTrendingBooks(r.Context(), 7, limit)
	if err != nil || len(books) == 0 {
		books2, err2 := h.repo.GetNewest(r.Context(), limit)
		if err2 != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode([]interface{}{})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(books2)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(books)
}

// GET /api/newest
func (h *AnalyticsHandler) GetNewest(w http.ResponseWriter, r *http.Request) {
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	books, err := h.repo.GetNewest(r.Context(), limit)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(books)
}

// GET /api/awards
func (h *AnalyticsHandler) GetAwards(w http.ResponseWriter, r *http.Request) {
	awards, err := h.repo.GetAwards(r.Context())
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{}) // Виправлено: повертаємо порожній масив замість об'єкта
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(awards)
}

// GET /api/me/stats
func (h *AnalyticsHandler) GetMyStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	stats, err := h.repo.GetUserStats(r.Context(), userID)
	if err != nil {
		http.Error(w, "Помилка", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GET /api/me/calendar?year=2025
func (h *AnalyticsHandler) GetCalendar(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	// Оскільки календарна статистика (heatmap) вже формується в GetUserStats
	// під ключем "daily_stats", ми просто беремо її звідти.
	stats, err := h.repo.GetUserStats(r.Context(), userID)
	if err != nil {
		http.Error(w, "Помилка", http.StatusInternalServerError)
		return
	}

	dailyStats := stats["daily_stats"]
	if dailyStats == nil {
		dailyStats = []interface{}{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dailyStats)
}

// ReadingGoalRequest — структура для парсингу запиту встановлення цілі
type ReadingGoalRequest struct {
	Year        int `json:"year"`
	TargetBooks int `json:"target_books"`
	TargetPages int `json:"target_pages"`
}

// POST /api/me/goals
func (h *AnalyticsHandler) SetGoal(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req ReadingGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний формат", http.StatusBadRequest)
		return
	}

	if req.Year == 0 {
		req.Year = time.Now().Year()
	}

	// Передаємо розгорнуті аргументи в репозиторій
	if err := h.repo.SetGoal(r.Context(), userID, req.Year, req.TargetBooks, req.TargetPages); err != nil {
		http.Error(w, "Помилка збереження", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Ціль збережено!"})
}

// GET /api/me/goals
func (h *AnalyticsHandler) GetGoal(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	yearStr := r.URL.Query().Get("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil {
		year = time.Now().Year()
	}

	goal, err := h.repo.GetGoal(r.Context(), userID, year)
	if err != nil {
		// Якщо ціль не знайдена, повертаємо порожній об'єкт або 404
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"year": year, "target_books": 0, "target_pages": 0})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(goal)
}

// GET /api/me/streak
func (h *AnalyticsHandler) GetStreak(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	streak, err := h.repo.GetUserStreak(r.Context(), userID)
	if err != nil {
		http.Error(w, "Помилка отримання стріка", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"streak": streak})
}
