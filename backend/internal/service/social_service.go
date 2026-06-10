package service

import (
	"context"

	"book_project/backend/internal/models"
	"book_project/backend/internal/repository"

	"github.com/google/uuid"
)

type SocialService struct {
	socialRepo       *repository.SocialRepository
	notificationRepo *repository.NotificationRepository
}

// NewSocialService тепер приймає два репозиторії
func NewSocialService(sr *repository.SocialRepository, nr *repository.NotificationRepository) *SocialService {
	return &SocialService{
		socialRepo:       sr,
		notificationRepo: nr,
	}
}

func (s *SocialService) GetProfile(ctx context.Context, targetID, viewerID string) (*models.UserProfile, error) {
	return s.socialRepo.GetProfile(ctx, targetID, viewerID)
}

func (s *SocialService) FollowUser(ctx context.Context, followerID, followingID string) error {
	// 1. Записуємо підписку в БД
	err := s.socialRepo.Follow(ctx, followerID, followingID)
	if err != nil {
		return err
	}

	// 2. Отримуємо username підписника для сповіщення
	followerUsername := "Хтось"
	if uname, err := s.socialRepo.GetUsernameByID(ctx, followerID); err == nil {
		followerUsername = uname
	}

	// 3. Сповіщення з конкретним ім'ям
	if s.notificationRepo != nil {
		parsedID, parseErr := uuid.Parse(followerID)
		var entityIDPtr *uuid.UUID
		if parseErr == nil {
			entityIDPtr = &parsedID
		}
		_ = s.notificationRepo.Create(
			ctx,
			followingID,
			"new_follower",
			"Новий підписник!",
			followerUsername+" підписався на вас.",
			entityIDPtr,
			"user",
		)
	}

	return nil
}

func (s *SocialService) UnfollowUser(ctx context.Context, followerID, followingID string) error {
	return s.socialRepo.Unfollow(ctx, followerID, followingID)
}

func (s *SocialService) GetFollowers(ctx context.Context, userID string) ([]models.UserProfile, error) {
	return s.socialRepo.GetConnections(ctx, userID, "followers")
}

func (s *SocialService) GetFollowing(ctx context.Context, userID string) ([]models.UserProfile, error) {
	return s.socialRepo.GetConnections(ctx, userID, "following")
}

func (s *SocialService) SearchUsers(ctx context.Context, query, viewerID string) ([]models.UserProfile, error) {
	return s.socialRepo.SearchUsers(ctx, query, viewerID)
}

func (s *SocialService) GetActivityFeed(ctx context.Context, userID string, limit int) ([]models.ActivityEvent, error) {
	return s.socialRepo.GetActivityFeed(ctx, userID, limit)
}
