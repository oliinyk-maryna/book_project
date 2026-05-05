package service

import (
	"context"

	"book_project/backend/internal/models"
	"book_project/backend/internal/repository"
)

type GroupService struct {
	repo *repository.GroupRepository
}

func NewGroupService(repo *repository.GroupRepository) *GroupService {
	return &GroupService{repo: repo}
}

func (s *GroupService) CreateClub(ctx context.Context, req models.CreateClubRequest, creatorID string) (*models.Club, error) {
	return s.repo.CreateClub(ctx, req, creatorID)
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

func (s *GroupService) JoinClub(ctx context.Context, clubID, userID string) error {
	return s.repo.JoinClub(ctx, clubID, userID)
}

func (s *GroupService) JoinByInviteCode(ctx context.Context, code, userID string) (*models.Club, error) {
	club, err := s.repo.GetClubByInviteCode(ctx, code)
	if err != nil {
		return nil, err
	}
	if err := s.repo.JoinClub(ctx, club.ID.String(), userID); err != nil {
		return nil, err
	}
	return club, nil
}

func (s *GroupService) LeaveClub(ctx context.Context, clubID, userID string) error {
	return s.repo.LeaveClub(ctx, clubID, userID)
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
	return s.repo.CreateInvite(ctx, clubID, inviterID, invitedUserID)
}

func (s *GroupService) IsMember(ctx context.Context, clubID, userID string) (bool, error) {
	return s.repo.IsMember(ctx, clubID, userID)
}

// backend/internal/service/group_service.go

func (s *GroupService) AddComment(ctx context.Context, comment models.GroupComment, userID, groupID string) (models.GroupComment, error) {
	// Делегуємо збереження коментаря у репозиторій
	return s.repo.AddComment(ctx, comment, userID, groupID)
}

func (s *GroupService) GetComments(ctx context.Context, groupID string) ([]models.GroupComment, error) {
	// Отримуємо коментарі через репозиторій
	return s.repo.GetComments(ctx, groupID)
}