package service

import (
	"context"
	"fmt"

	"book_project/backend/internal/models"
	"book_project/backend/internal/repository"

	"github.com/google/uuid"
)

type GroupService struct {
	repo      *repository.GroupRepository
	notifRepo *repository.NotificationRepository
}

// NewGroupService now accepts notifRepo so it can fire notifications.
// Update router.go: service.NewGroupService(groupRepo, notifRepo)
func NewGroupService(repo *repository.GroupRepository, notifRepo *repository.NotificationRepository) *GroupService {
	return &GroupService{repo: repo, notifRepo: notifRepo}
}

func (s *GroupService) CreateClub(ctx context.Context, req models.CreateClubRequest, creatorID string) (*models.Club, error) {
	// 1. Спочатку створюємо сам клуб
	club, err := s.repo.CreateClub(ctx, req, creatorID)
	if err != nil {
		return nil, err
	}

	// 2. ДОДАНО: Автоматично додаємо книгу на особисту полицю творця, якщо клуб прив'язаний до книги
	// (ігноруємо помилку, бо це фонова дія, головне що клуб створено)
	if req.WorkID != "" {
		_ = s.repo.EnsureUserBookExists(ctx, creatorID, req.WorkID)
	}

	return club, nil
}

func (s *GroupService) GetClubs(ctx context.Context, workID, userID string) ([]models.Club, error) {
	return s.repo.GetClubs(ctx, workID, userID)
}

func (s *GroupService) GetClubByID(ctx context.Context, clubID, userID string) (*models.Club, error) {
	return s.repo.GetClubByID(ctx, clubID, userID)
}

func (s *GroupService) GetClubByInviteCode(ctx context.Context, code string) (*models.Club, error) {
	return s.repo.GetClubByInviteCode(ctx, code)
}

// JoinClub joins the club and, on success, notifies the club owner (JOIN_CLUB).
func (s *GroupService) JoinClub(ctx context.Context, clubID, userID string) error {
	if err := s.repo.JoinClub(ctx, clubID, userID); err != nil {
		return err
	}

	// ДОДАНО: Дістаємо work_id клубу і додаємо книгу на особисту полицю нового учасника
	workID, _ := s.repo.GetWorkIDByGroupID(ctx, clubID)
	if workID != "" {
		_ = s.repo.EnsureUserBookExists(ctx, userID, workID)
	}

	// Fire JOIN_CLUB notification to the club owner (best-effort, ignore errors).
	go func() {
		bgCtx := context.Background()

		club, err := s.repo.GetClubByID(bgCtx, clubID, "")
		if err != nil {
			return
		}

		ownerID := club.CreatorID.String()
		if ownerID == userID {
			return // owner joined their own club – no notification needed
		}

		joinerName, _ := s.repo.GetUserInfo(bgCtx, userID)

		clubUUID, err := uuid.Parse(clubID)
		if err != nil {
			return
		}

		_ = s.notifRepo.Create(
			bgCtx,
			ownerID,
			"JOIN_CLUB",
			fmt.Sprintf("Новий учасник у «%s»", club.Name),
			fmt.Sprintf("@%s приєднався до вашого клубу.", joinerName),
			&clubUUID,
			"club",
		)
	}()

	return nil
}

func (s *GroupService) JoinByInviteCode(ctx context.Context, code, userID string) (*models.Club, error) {
	club, err := s.repo.GetClubByInviteCode(ctx, code)
	if err != nil {
		return nil, err
	}
	// У JoinClub вже є логіка додавання книги на полицю, тому тут додатково нічого не треба
	if err := s.JoinClub(ctx, club.ID.String(), userID); err != nil {
		return nil, err
	}
	return club, nil
}

func (s *GroupService) LeaveClub(ctx context.Context, clubID, userID string) error {
	return s.repo.LeaveClub(ctx, clubID, userID)
}

func (s *GroupService) DeleteClub(ctx context.Context, clubID, userID string) error {
	return s.repo.DeleteClub(ctx, clubID, userID)
}

func (s *GroupService) CloseRecruiting(ctx context.Context, clubID, userID string) error {
	return s.repo.UpdateClubStatus(ctx, clubID, userID, "active")
}

func (s *GroupService) SetDiscussionDate(ctx context.Context, clubID, userID, date string) error {
	return s.repo.SetDiscussionDate(ctx, clubID, userID, date)
}

func (s *GroupService) GetMembers(ctx context.Context, clubID string) ([]models.GroupMember, error) {
	return s.repo.GetMembers(ctx, clubID)
}

func (s *GroupService) KickMember(ctx context.Context, clubID, adminID, targetID string) error {
	return s.repo.KickMember(ctx, clubID, adminID, targetID)
}

func (s *GroupService) AddMilestone(ctx context.Context, clubID, adminID string, req models.CreateMilestoneRequest) (*models.Milestone, error) {
	return s.repo.AddMilestone(ctx, clubID, adminID, req)
}

func (s *GroupService) GetMilestones(ctx context.Context, clubID string) ([]models.Milestone, error) {
	return s.repo.GetMilestones(ctx, clubID)
}

func (s *GroupService) GetMessages(ctx context.Context, clubID, beforeID string) ([]models.ChatMessage, error) {
	if beforeID != "" {
		return s.repo.GetMessagesBefore(ctx, clubID, beforeID, 30)
	}
	return s.repo.GetRecentMessages(ctx, clubID, 30)
}

func (s *GroupService) DeleteMessage(ctx context.Context, msgID, userID string) error {
	return s.repo.DeleteMessage(ctx, msgID, userID)
}

func (s *GroupService) CreateInvite(ctx context.Context, clubID, inviterID, invitedUserID string) error {
	// 1. Отримуємо ID запрошення з репозиторію
	inviteID, err := s.repo.CreateInvite(ctx, clubID, inviterID, invitedUserID)
	if err != nil {
		return err
	}

	// 2. Використовуємо цей ID для сповіщення
	go func() {
		bgCtx := context.Background()
		club, _ := s.repo.GetClubByID(bgCtx, clubID, "")
		inviterName, _ := s.repo.GetUserInfo(bgCtx, inviterID)

		// Парсимо ID запрошення, а не клубу!
		inviteUUID, err := uuid.Parse(inviteID)
		if err != nil {
			return
		}

		_ = s.notifRepo.Create(
			bgCtx,
			invitedUserID,
			"INVITE_CLUB",
			fmt.Sprintf("Запрошення до клубу «%s»", club.Name),
			fmt.Sprintf("@%s запрошує вас до книжкового клубу.", inviterName),
			&inviteUUID, // <-- Тепер тут ID запрошення
			"invite",    // <-- Тип змінено на "invite"
		)
	}()

	return nil
}

func (s *GroupService) IsMember(ctx context.Context, clubID, userID string) (bool, error) {
	return s.repo.IsMember(ctx, clubID, userID)
}

func (s *GroupService) AddComment(ctx context.Context, comment models.GroupComment, userID, groupID string) (models.GroupComment, error) {
	return s.repo.AddComment(ctx, comment, userID, groupID)
}

func (s *GroupService) GetComments(ctx context.Context, groupID string) ([]models.GroupComment, error) {
	return s.repo.GetComments(ctx, groupID)
}

func (s *GroupService) GetUserInvites(ctx context.Context, userID string) ([]models.UserInviteResponse, error) {
	return s.repo.GetUserInvites(ctx, userID)
}

func (s *GroupService) AcceptInvite(ctx context.Context, inviteID, userID string) error {
	// 1. Отримуємо дані ДО видалення запрошення.
	// Важливо: переконайтеся, що GetClubIDByInviteID працює, навіть якщо запрошення "активне"
	clubID, err := s.repo.GetClubIDByInviteID(ctx, inviteID)
	if err != nil || clubID == "" {
		// Якщо не вдалося отримати clubID, все одно пробуємо прийняти запрошення,
		// але книгу автоматично не додамо
		return s.repo.AcceptInvite(ctx, inviteID, userID)
	}

	// 2. Викликаємо прийняття запрошення (тут воно видаляється або змінює статус)
	err = s.repo.AcceptInvite(ctx, inviteID, userID)
	if err != nil {
		return err
	}

	// 3. Тепер, маючи збережений clubID, шукаємо книгу
	workID, err := s.repo.GetWorkIDByGroupID(ctx, clubID)
	if err == nil && workID != "" {
		// 4. Додаємо на полицю
		_ = s.repo.EnsureUserBookExists(ctx, userID, workID)
	}

	return nil
}
func (s *GroupService) RejectInvite(ctx context.Context, inviteID, userID string) error {
	return s.repo.RejectInvite(ctx, inviteID, userID)
}

func (s *GroupService) EditMessage(ctx context.Context, messageID, userID, newContent string) error {
	// Жодних додаткових перевірок, делегуємо всю логіку безпеки в репозиторій
	return s.repo.EditMessage(ctx, messageID, userID, newContent)
}
