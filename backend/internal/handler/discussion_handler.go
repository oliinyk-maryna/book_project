package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/repository"

	"github.com/google/uuid"
)

type DiscussionHandler struct {
	repo      *repository.DiscussionRepository
	notifRepo *repository.NotificationRepository
}

func NewDiscussionHandler(repo *repository.DiscussionRepository, notifRepo *repository.NotificationRepository) *DiscussionHandler {
	return &DiscussionHandler{repo: repo, notifRepo: notifRepo}
}

// GET /api/books/{id}/discussions
func (h *DiscussionHandler) GetDiscussions(w http.ResponseWriter, r *http.Request) {
	workID := r.PathValue("id")
	items, err := h.repo.GetByWorkID(r.Context(), workID)
	if err != nil || items == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

// POST /api/books/{id}/discussions
func (h *DiscussionHandler) CreateDiscussion(w http.ResponseWriter, r *http.Request) {
	workID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		Title      string `json:"title"`
		Body       string `json:"body"`
		HasSpoiler bool   `json:"has_spoiler"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Title == "" || req.Body == "" {
		http.Error(w, "Заголовок і текст обов'язкові", http.StatusBadRequest)
		return
	}

	disc, err := h.repo.Create(r.Context(), workID, userID, req.Title, req.Body, req.HasSpoiler)
	if err != nil {
		http.Error(w, "Помилка створення: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(disc)
}

// GET /api/discussions/{id}
func (h *DiscussionHandler) GetDiscussion(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	disc, err := h.repo.GetWithReplies(r.Context(), id)
	if err != nil {
		http.Error(w, "Не знайдено", http.StatusNotFound)
		return
	}
	// Збільшуємо лічильник переглядів
	go h.repo.IncrementViews(r.Context(), id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(disc)
}

// POST /api/discussions/{id}/replies
func (h *DiscussionHandler) AddReply(w http.ResponseWriter, r *http.Request) {
	discID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		Body       string `json:"body"`
		HasSpoiler bool   `json:"has_spoiler"`
		ReplyToID  string `json:"reply_to_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Body == "" {
		http.Error(w, "Текст обов'язковий", http.StatusBadRequest)
		return
	}

	reply, err := h.repo.AddReply(r.Context(), discID, userID, req.Body, req.HasSpoiler, req.ReplyToID)
	if err != nil {
		http.Error(w, "Помилка: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// Сповіщення автору обговорення
	go func() {
		// Використовуємо context.Background() для фонової горутини
		ctx := context.Background()

		disc, err := h.repo.GetByID(ctx, discID)
		if err == nil && disc.UserID != userID {
			// 1. Конвертуємо string у uuid.UUID
			uID, err := uuid.Parse(discID)
			if err != nil {
				return // Якщо ID невалідний, виходимо
			}

			// 2. Визначаємо прев'ю тексту
			preview := reply.Body
			if len(preview) > 50 {
				preview = preview[:50]
			}

			// 3. Передаємо &uID (вказівник на UUID)
			h.notifRepo.Create(
				ctx,
				disc.UserID,
				"discussion_reply",
				"Нова відповідь у вашому обговоренні",
				preview,
				&uID, // Передаємо адресу
				"discussion",
			)
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(reply)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
