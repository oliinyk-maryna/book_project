package service

import (
	"context"

	"book_project/backend/internal/models"
	"book_project/backend/internal/repository"

	"github.com/google/uuid"
)

type UserBookService struct {
	repo *repository.UserBookRepository
}

func NewUserBookService(repo *repository.UserBookRepository) *UserBookService {
	return &UserBookService{repo: repo}
}

func (s *UserBookService) AddBookToShelf(ctx context.Context, userID string, bookData models.Book, status string) error {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return err
	}
	return s.repo.AddBookToShelf(ctx, userUUID, bookData, status)
}

func (s *UserBookService) GetUserBooks(ctx context.Context, userID string) ([]models.Book, error) {
	return s.repo.GetUserBooks(ctx, userID)
}

func (s *UserBookService) AddWorkToShelf(ctx context.Context, userID, workID, status string) error {
	return s.repo.AddWorkToShelf(ctx, userID, workID, status)
}

func (s *UserBookService) UpdateProgress(ctx context.Context, userID, workID string, currentPage int, status string) error {
	return s.repo.UpdateProgress(ctx, userID, workID, currentPage, status)
}

func (s *UserBookService) RemoveFromShelf(ctx context.Context, userID, workID string) error {
	return s.repo.RemoveFromShelf(ctx, userID, workID)
}
