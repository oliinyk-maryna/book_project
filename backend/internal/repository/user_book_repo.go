package repository

import (
	"context"
	"time"

	"book_project/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserBookRepository struct {
	db *pgxpool.Pool
}

func NewUserBookRepository(db *pgxpool.Pool) *UserBookRepository {
	return &UserBookRepository{db: db}
}

// AddWorkToShelf — додає або оновлює книгу на полиці за workID
func (r *UserBookRepository) AddWorkToShelf(ctx context.Context, userID, workID, status string) error {
	// Визначаємо кількість сторінок (беремо з першого-ліпшого видання або 1)
	var totalPages int
	err := r.db.QueryRow(ctx, `SELECT COALESCE(page_count, 1) FROM editions WHERE work_id = $1::uuid LIMIT 1`, workID).Scan(&totalPages)
	if err != nil {
		totalPages = 1 // Якщо видання немає, ставимо 1
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO user_editions (user_id, work_id, status, total_pages)
		VALUES ($1::uuid, $2::uuid, $3::reading_status, $4)
		ON CONFLICT (user_id, work_id)
		DO UPDATE SET status = EXCLUDED.status::reading_status, updated_at = CURRENT_TIMESTAMP`,
		userID, workID, status, totalPages,
	)

	// ДОДАЄМО В АКТИВНІСТЬ
	if err == nil {
		r.db.Exec(ctx, `INSERT INTO activity_feed(actor_id, type, work_id) VALUES($1::uuid, 'add_book', $2::uuid) ON CONFLICT DO NOTHING`, userID, workID)
	}

	return err
}

func (r *UserBookRepository) UpdateProgress(ctx context.Context, userID, workID uuid.UUID, status string, currentPage int, notes string, startDate, endDate *time.Time) error {
	// 1. Отримуємо загальну кількість сторінок та поточні дати з бази
	var totalPages int
	var dbStartedAt, dbFinishedAt *time.Time

	selectQuery := `
		SELECT COALESCE(total_pages, 0), started_at, finished_at 
		FROM user_editions 
		WHERE user_id = $1 AND work_id = $2
	`
	err := r.db.QueryRow(ctx, selectQuery, userID, workID).Scan(&totalPages, &dbStartedAt, &dbFinishedAt)
	if err != nil {
		totalPages = 0
	}

	// 2. ПРАВИЛО: Коли "прочитано" -> кількість сторінок максимум
	if status == "read" && totalPages > 0 {
		currentPage = totalPages
	}

	// 3. ПРАВИЛО: Якщо максимальна кількість сторінок -> статус "прочитано"
	if totalPages > 0 && currentPage >= totalPages {
		status = "read"
		currentPage = totalPages // Запобігає виходу за межі (наприклад 305/300)
	}

	// ЗАХИСТ ВІД ЗАТИРАННЯ ДАТ
	if startDate == nil {
		startDate = dbStartedAt
	}
	if endDate == nil {
		endDate = dbFinishedAt
	}

	// Оновлення запису
	query := `
		UPDATE user_editions 
		SET status = $1::reading_status, 
			current_page = $2, 
			notes = $3, 
			started_at = $4, 
			finished_at = $5, 
			updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $6 AND work_id = $7
	`
	_, err = r.db.Exec(ctx, query, status, currentPage, notes, startDate, endDate, userID, workID)
	return err
}

// RemoveFromShelf — видалити книгу з полиці
func (r *UserBookRepository) RemoveFromShelf(ctx context.Context, userID, workID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM user_editions WHERE user_id = $1::uuid AND work_id = $2::uuid`, userID, workID)
	return err
}

// GetUserBooks — повертає всі книги з полиці
func (r *UserBookRepository) GetUserBooks(ctx context.Context, userID string) ([]models.Book, error) {
	query := `
		SELECT
			w.id::text, w.title,
			COALESCE(a.name, 'Невідомий автор') AS author,
			COALESCE(e.cover_url, '') AS cover_url,
			COALESCE(ue.status::text, 'planned') AS status,
			COALESCE(ue.total_pages, e.page_count, 0) AS page_count,
			COALESCE(ue.current_page, 0) AS current_page,
			COALESCE(ue.personal_rating::text, '') AS personal_rating,
			COALESCE(w.description, '') AS description
		FROM user_editions ue
		JOIN works w ON ue.work_id = w.id
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON w.id = e.work_id
		WHERE ue.user_id = $1::uuid
		ORDER BY ue.updated_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return []models.Book{}, err
	}
	defer rows.Close()

	books := []models.Book{}
	for rows.Next() {
		var b models.Book
		var personalRating string // Використовуємо локальну змінну, оскільки цього поля немає в структурі Book

		err := rows.Scan(
			&b.ID, &b.Title, &b.Author, &b.CoverURL,
			&b.Status, &b.PageCount, &b.CurrentPage, &personalRating, &b.Description,
		)
		if err != nil {
			continue
		}
		if b.Author != "" && b.Author != "Невідомий автор" {
			b.Authors = []string{b.Author}
		}
		books = append(books, b)
	}

	return books, nil
}

// Метод для старого парсера, який додавав книгу цілком
func (r *UserBookRepository) AddBookToShelf(ctx context.Context, userID uuid.UUID, bookData models.Book, status string) error {
	// Спрощений виклик для сумісності
	return r.AddWorkToShelf(ctx, userID.String(), bookData.ID, status)
}
