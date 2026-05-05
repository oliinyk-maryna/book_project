package handler

import (
	"encoding/json"
	"net/http"

	"book_project/backend/internal/middleware"
	"book_project/backend/internal/models"
	"book_project/backend/internal/service"
)

type GroupHandler struct {
	service *service.GroupService
	hub     *WSHub
}

func NewGroupHandler(s *service.GroupService, hub *WSHub) *GroupHandler {
	return &GroupHandler{service: s, hub: hub}
}

// POST /api/clubs
func (h *GroupHandler) CreateClub(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req models.CreateClubRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний JSON", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		http.Error(w, "Назва клубу обов'язкова", http.StatusBadRequest)
		return
	}

	club, err := h.service.CreateClub(r.Context(), req, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(club)
}

// GET /api/clubs?work_id=...
func (h *GroupHandler) GetClubs(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)
	workID := r.URL.Query().Get("work_id")

	clubs, err := h.service.GetClubs(r.Context(), workID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(clubs)
}

// GET /api/clubs/:id
func (h *GroupHandler) GetClub(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	userID, _ := r.Context().Value(middleware.ContextUserID).(string)

	club, err := h.service.GetClubByID(r.Context(), clubID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(club)
}

// GET /api/clubs/join/:code
func (h *GroupHandler) JoinByCode(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	club, err := h.service.JoinByInviteCode(r.Context(), code, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(club)
}

// POST /api/clubs/:id/join
func (h *GroupHandler) JoinClub(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	if err := h.service.JoinClub(r.Context(), clubID, userID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Системне повідомлення в чат
	h.hub.BroadcastToClub(clubID, WSMessage{
		Type:        "system",
		ClubID:      clubID,
		Content:     "Новий учасник приєднався до клубу",
		MessageType: "system",
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Ви успішно приєднались до клубу"})
}

// DELETE /api/clubs/:id/leave
func (h *GroupHandler) LeaveClub(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	if err := h.service.LeaveClub(r.Context(), clubID, userID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/clubs/:id/close-recruiting
func (h *GroupHandler) CloseRecruiting(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	if err := h.service.CloseRecruiting(r.Context(), clubID, userID); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	h.hub.BroadcastToClub(clubID, WSMessage{
		Type:    "system",
		ClubID:  clubID,
		Content: "Набір до клубу завершено. Починаємо читати!",
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Набір закрито"})
}

// POST /api/clubs/:id/discussion-date
func (h *GroupHandler) SetDiscussionDate(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		Date string `json:"date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Date == "" {
		http.Error(w, "Вкажіть дату", http.StatusBadRequest)
		return
	}

	if err := h.service.SetDiscussionDate(r.Context(), clubID, userID, req.Date); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	h.hub.BroadcastToClub(clubID, WSMessage{
		Type:    "system",
		ClubID:  clubID,
		Content: "Засновник призначив дату фінального обговорення: " + req.Date,
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Дату обговорення встановлено"})
}

// GET /api/clubs/:id/members
func (h *GroupHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	members, err := h.service.GetMembers(r.Context(), clubID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

// DELETE /api/clubs/:id/members/:uid
func (h *GroupHandler) KickMember(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	targetID := r.PathValue("uid")
	adminID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	if err := h.service.KickMember(r.Context(), clubID, adminID, targetID); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/clubs/:id/milestones
func (h *GroupHandler) AddMilestone(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req models.CreateMilestoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний JSON", http.StatusBadRequest)
		return
	}
	if req.PageLimit <= 0 || req.DeadlineDate == "" {
		http.Error(w, "Вкажіть сторінку і дедлайн", http.StatusBadRequest)
		return
	}

	milestone, err := h.service.AddMilestone(r.Context(), clubID, userID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	h.hub.BroadcastToClub(clubID, WSMessage{
		Type:    "system",
		ClubID:  clubID,
		Content: "Додано нову контрольну точку: " + req.Title,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(milestone)
}

// GET /api/clubs/:id/milestones
func (h *GroupHandler) GetMilestones(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	milestones, err := h.service.GetMilestones(r.Context(), clubID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(milestones)
}

// GET /api/clubs/:id/messages?before=UUID
func (h *GroupHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	isMember, _ := h.service.IsMember(r.Context(), clubID, userID)
	if !isMember {
		http.Error(w, "Ви не є учасником цього клубу", http.StatusForbidden)
		return
	}

	beforeID := r.URL.Query().Get("before")
	msgs, err := h.service.GetMessages(r.Context(), clubID, beforeID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

// DELETE /api/clubs/:id/messages/:msgid
func (h *GroupHandler) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	msgID := r.PathValue("msgid")
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	if err := h.service.DeleteMessage(r.Context(), msgID, userID); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	clubID := r.PathValue("id")
	h.hub.BroadcastToClub(clubID, WSMessage{
		Type:      "delete_message",
		ClubID:    clubID,
		MessageID: msgID,
	})

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/clubs/:id/invite
func (h *GroupHandler) InviteUser(w http.ResponseWriter, r *http.Request) {
	clubID := r.PathValue("id")
	inviterID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		http.Error(w, "Вкажіть user_id", http.StatusBadRequest)
		return
	}

	if err := h.service.CreateInvite(r.Context(), clubID, inviterID, req.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Запрошення надіслано"})
}
