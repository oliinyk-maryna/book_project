package service

import (
	"context"
	"fmt"

	"book_project/backend/internal/models"
	"book_project/backend/internal/repository"
)

type BookService struct {
	repo *repository.BookRepository
}

func NewBookService(repo *repository.BookRepository) *BookService {
	return &BookService{repo: repo}
}

func (s *BookService) GetAllBooks(ctx context.Context, filters models.BookFilters) ([]models.Book, error) {
	books, err := s.repo.GetAll(ctx, filters)
	if err != nil {
		return nil, fmt.Errorf("помилка завантаження книг: %w", err)
	}
	if books == nil {
		books = []models.Book{}
	}
	return books, nil
}

func (s *BookService) SearchBooks(ctx context.Context, query string) ([]models.Book, error) {
	if query == "" {
		return []models.Book{}, nil
	}
	books, err := s.repo.SearchLocal(ctx, query)
	if err != nil {
		return nil, err
	}
	if books == nil {
		books = []models.Book{}
	}
	return books, nil
}

func (s *BookService) GetBookByID(ctx context.Context, id string, userID string) (*models.BookDetails, error) {
	book, err := s.repo.GetByIDWithDetails(ctx, id, userID)
	if err != nil {
		return nil, fmt.Errorf("книгу не знайдено: %w", err)
	}
	return book, nil
}

func (s *BookService) GetFilterOptions(ctx context.Context) (*models.FilterOptions, error) {
	return s.repo.GetFilterOptions(ctx)
}

func (s *BookService) GetReviewsByWorkID(ctx context.Context, workID string) ([]models.WorkReview, error) {
	reviews, err := s.repo.GetReviewsByWorkID(ctx, workID)
	if err != nil {
		return []models.WorkReview{}, nil
	}
	if reviews == nil {
		return []models.WorkReview{}, nil
	}
	return reviews, nil
}

func (s *BookService) AddReview(ctx context.Context, workID, userID string, rating int, comment string, hasSpoiler bool) error {
	if rating < 1 || rating > 5 {
		return fmt.Errorf("оцінка має бути від 1 до 5")
	}
	return s.repo.AddReview(ctx, workID, userID, rating, comment, hasSpoiler)
}

func (s *BookService) LikeReview(ctx context.Context, reviewID, userID, emoji string) error {
	return s.repo.LikeReview(ctx, reviewID, userID, emoji)
}

func (s *BookService) GetClubsByWorkID(ctx context.Context, workID string) ([]models.BookClub, error) {
	clubs, err := s.repo.GetClubsByWorkID(ctx, workID)
	if err != nil {
		return []models.BookClub{}, nil
	}
	if clubs == nil {
		return []models.BookClub{}, nil
	}
	return clubs, nil
}

func (s *BookService) AddReadingSession(ctx context.Context, userID, workID string, duration, pagesRead int) error {
	if pagesRead <= 0 {
		return fmt.Errorf("кількість сторінок має бути більше 0")
	}
	return s.repo.SaveReadingSession(ctx, userID, workID, duration, pagesRead)
}

func (s *BookService) AddReadingSessionFull(ctx context.Context, userID, workID string, duration, pagesRead, startPage, endPage int) error {
	pages := pagesRead
	if pages <= 0 && endPage > startPage {
		pages = endPage - startPage
	}
	return s.repo.SaveReadingSessionFull(ctx, userID, workID, duration, pages, startPage, endPage)
}

func (s *BookService) SearchAuthors(ctx context.Context, query string) ([]string, error) {
	return s.repo.SearchAuthors(ctx, query)
}

func (s *BookService) GetTopByYear(ctx context.Context, year, limit int) ([]models.Book, error) {
	books, err := s.repo.GetTopByYear(ctx, year, limit)
	if err != nil || books == nil {
		return []models.Book{}, nil
	}
	return books, nil
}
