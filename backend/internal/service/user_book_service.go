package service

import (
	"context"
	"errors"
	"time"

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

func (s *UserBookService) RemoveFromShelf(ctx context.Context, userID, workID string) error {
	return s.repo.RemoveFromShelf(ctx, userID, workID)
}

// UpdateProgress оновлює прогрес читання, конвертуючи дані для репозиторію
func (s *UserBookService) UpdateProgress(ctx context.Context, userIDStr, workIDStr string, currentPage int, status, notes, startDateStr, endDateStr string) error {
	// 1. Конвертуємо рядки в UUID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("невалідний ID користувача")
	}

	workID, err := uuid.Parse(workIDStr)
	if err != nil {
		return errors.New("невалідний ID книги")
	}

	// 2. Конвертуємо дати (Підтримуємо і короткий формат YYYY-MM-DD, і повний ISO/RFC3339)
	var startDate *time.Time
	if startDateStr != "" {
		t, err := time.Parse(time.RFC3339, startDateStr) // Спершу пробуємо повний формат
		if err != nil {
			t, err = time.Parse("2006-01-02", startDateStr) // Потім короткий
		}
		if err == nil {
			startDate = &t
		}
	}

	var endDate *time.Time
	if endDateStr != "" {
		t, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			t, err = time.Parse("2006-01-02", endDateStr)
		}
		if err == nil {
			endDate = &t
		}
	}

	// 3. Викликаємо ваш метод у репозиторії
	// Зверніть увагу на порядок аргументів: він має збігатися з тим, що ви написали в репозиторії
	return s.repo.UpdateProgress(ctx, userID, workID, status, currentPage, notes, startDate, endDate)
}
