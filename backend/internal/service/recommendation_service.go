package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"book_project/backend/internal/models"
	"book_project/backend/internal/repository"
)

type RecommendationService struct {
	bookRepo      *repository.BookRepository
	analyticsRepo *repository.AnalyticsRepository
	httpClient    *http.Client
}

func NewRecommendationService(
	bookRepo *repository.BookRepository,
	analyticsRepo *repository.AnalyticsRepository,
) *RecommendationService {
	return &RecommendationService{
		bookRepo:      bookRepo,
		analyticsRepo: analyticsRepo,
		httpClient:    &http.Client{Timeout: 20 * time.Second},
	}
}

type RecommendResult struct {
	Books  []models.Book `json:"books"`
	Reason string        `json:"reason"`
}

// GetPersonalized — персональні рекомендації на основі прочитаного
func (s *RecommendationService) GetPersonalized(ctx context.Context, userID string, limit int) (*RecommendResult, error) {
	// Беремо топ книги користувача (оцінка 4+)
	topBookIDs, err := s.analyticsRepo.GetHighRatedBooks(ctx, userID, 10)
	if err != nil || len(topBookIDs) == 0 {
		return s.getFallback(ctx, limit)
	}

	// Отримуємо деталі цих книг
	var bookTitles []string
	for _, id := range topBookIDs {
		book, err := s.bookRepo.GetByIDWithDetails(ctx, id, "")
		if err == nil && book != nil {
			bookTitles = append(bookTitles, fmt.Sprintf("%s (%s)", book.Title, strings.Join(book.Authors, ", ")))
		}
	}

	if len(bookTitles) == 0 {
		return s.getFallback(ctx, limit)
	}

	// AI-рекомендації
	query := fmt.Sprintf("На основі книг, які читач любить: %s", strings.Join(bookTitles, "; "))
	return s.GetByQuery(ctx, userID, query, limit)
}

// GetByQuery — рекомендації за текстовим запитом
func (s *RecommendationService) GetByQuery(ctx context.Context, userID, query string, limit int) (*RecommendResult, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return s.getFallback(ctx, limit)
	}

	// Беремо каталог книг з БД для контексту
	allBooks, _ := s.bookRepo.GetAll(ctx, models.BookFilters{})
	var catalogLines []string
	for i, b := range allBooks {
		if i >= 200 {
			break
		}
		authors := strings.Join(b.Authors, ", ")
		if authors == "" {
			authors = b.Author
		}
		catalogLines = append(catalogLines, fmt.Sprintf("ID:%s | %s | %s | жанр: %s", b.ID, b.Title, authors, b.Category))
	}
	catalog := strings.Join(catalogLines, "\n")

	systemPrompt := `Ти — книжковий рекомендаційний асистент для додатку ReadLounge.
У тебе є каталог книг. Твоє завдання — порекомендувати від 3 до 6 книг із КАТАЛОГУ на основі запиту користувача.
Відповідай ТІЛЬКИ у форматі JSON без жодного тексту до або після:
{
  "ids": ["uuid1", "uuid2", ...],
  "reason": "Коротке пояснення чому ці книги підходять (1-2 речення українською)"
}
Обирай ТІЛЬКИ книги з наданого каталогу, використовуй їхні точні ID.`

	userPrompt := fmt.Sprintf("Каталог:\n%s\n\nЗапит: %s", catalog, query)

	resp, err := s.callOpenAI(ctx, apiKey, systemPrompt, userPrompt)
	if err != nil {
		return s.getFallback(ctx, limit)
	}

	var parsed struct {
		IDs    []string `json:"ids"`
		Reason string   `json:"reason"`
	}
	cleanResp := strings.TrimSpace(resp)
	if idx := strings.Index(cleanResp, "{"); idx > 0 {
		cleanResp = cleanResp[idx:]
	}
	if err := json.Unmarshal([]byte(cleanResp), &parsed); err != nil {
		return s.getFallback(ctx, limit)
	}

	var books []models.Book
	for _, id := range parsed.IDs {
		details, err := s.bookRepo.GetByIDWithDetails(ctx, id, userID)
		if err != nil {
			continue
		}
		books = append(books, models.Book{
			ID:       details.ID,
			Title:    details.Title,
			Authors:  details.Authors,
			CoverURL: details.CoverURL,
			Category: details.Category,
		})
		if len(books) >= limit {
			break
		}
	}

	if len(books) == 0 {
		return s.getFallback(ctx, limit)
	}

	return &RecommendResult{Books: books, Reason: parsed.Reason}, nil
}

func (s *RecommendationService) getFallback(ctx context.Context, limit int) (*RecommendResult, error) {
	books, err := s.bookRepo.GetTrending(ctx, limit)
	if err != nil {
		books = []models.Book{}
	}
	return &RecommendResult{
		Books:  books,
		Reason: "Популярні книги серед читачів ReadLounge",
	}, nil
}

func (s *RecommendationService) callOpenAI(ctx context.Context, apiKey, system, user string) (string, error) {
	payload := map[string]interface{}{
		"model": "gpt-4o-mini",
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
		"temperature": 0.7,
		"max_tokens":  500,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("OpenAI request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenAI returned status %d", resp.StatusCode)
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if len(result.Choices) == 0 {
		return "", errors.New("no choices in OpenAI response")
	}
	return result.Choices[0].Message.Content, nil
}
