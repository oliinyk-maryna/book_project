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

	// 2. Створюємо автоматичне сповіщення для користувача, на якого підписались!
	if s.notificationRepo != nil {
		// Парсимо followerID у UUID для поля entity_id у сповіщенні
		parsedID, parseErr := uuid.Parse(followerID)
		var entityIDPtr *uuid.UUID
		if parseErr == nil {
			entityIDPtr = &parsedID
		}

		// Відправляємо сповіщення
		_ = s.notificationRepo.Create(
			ctx, 
			followingID,       // Кому відправляємо (той, на кого підписалися)
			"new_follower",    // Тип сповіщення
			"Новий підписник!", // Заголовок
			"На вас підписався новий користувач.", // Тіло
			entityIDPtr,       // ID підписника, щоб при кліку перейти на його профіль
			"user",            // Тип сутності
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