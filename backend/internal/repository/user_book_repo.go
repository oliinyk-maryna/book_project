package repository

import (
	"context"
	"errors"

	"book_project/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserBookRepository struct {
	db *pgxpool.Pool
}

func NewUserBookRepository(db *pgxpool.Pool) *UserBookRepository {
	return &UserBookRepository{db: db}
}

// AddBookToShelf додає книгу в базу (якщо її немає) і прив'язує до користувача
func (r *UserBookRepository) AddBookToShelf(ctx context.Context, userID uuid.UUID, bookData models.Book, status string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Отримуємо або створюємо АВТОРА
	var authorID string
	authorName := "Невідомий автор"

	if len(bookData.Authors) > 0 && bookData.Authors[0] != "" {
		authorName = bookData.Authors[0]
	} else if bookData.Author != "" {
		authorName = bookData.Author
	}

	err = tx.QueryRow(ctx, `SELECT id::text FROM authors WHERE name = $1 LIMIT 1`, authorName).Scan(&authorID)
	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(ctx, `INSERT INTO authors (name) VALUES ($1) RETURNING id::text`, authorName).Scan(&authorID)
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	// 2. Отримуємо або створюємо ТВІР (Work)
	var workID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM works WHERE title = $1 AND author_id = $2::uuid LIMIT 1`, bookData.Title, authorID).Scan(&workID)
	if errors.Is(err, pgx.ErrNoRows) {
		desc := bookData.Description
		err = tx.QueryRow(ctx, `
			INSERT INTO works (title, author_id, description)
			VALUES ($1, $2::uuid, $3) RETURNING id::text`,
			bookData.Title, authorID, desc,
		).Scan(&workID)
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	// 3. Отримуємо або створюємо ВИДАННЯ (Edition)
	var editionID string
	var existingCover string
	err = tx.QueryRow(ctx, `SELECT id::text, COALESCE(cover_url,'') FROM editions WHERE work_id = $1::uuid LIMIT 1`, workID).Scan(&editionID, &existingCover)

	if errors.Is(err, pgx.ErrNoRows) {
		pageCount := bookData.PageCount
		if pageCount <= 0 {
			pageCount = 1
		}
		err = tx.QueryRow(ctx, `
			INSERT INTO editions (work_id, cover_url, page_count, is_primary)
			VALUES ($1::uuid, $2, $3, true) RETURNING id::text`,
			workID, bookData.CoverURL, pageCount,
		).Scan(&editionID)
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	} else {
		// Оновлюємо cover_url якщо новий є а старого нема
		if bookData.CoverURL != "" && existingCover == "" {
			_, _ = tx.Exec(ctx, `UPDATE editions SET cover_url = $1 WHERE id = $2::uuid`, bookData.CoverURL, editionID)
		}
	}

	// 4. Визначаємо total_pages для user_editions
	var totalPages int
	if bookData.PageCount > 0 {
		totalPages = bookData.PageCount
	} else {
		err = tx.QueryRow(ctx, `SELECT COALESCE(page_count, 1) FROM editions WHERE id = $1::uuid`, editionID).Scan(&totalPages)
		if err != nil || totalPages <= 0 {
			totalPages = 1
		}
	}

	// 5. Додаємо запис у ПОЛИЦЮ КОРИСТУВАЧА (user_editions)
	_, err = tx.Exec(ctx, `
		INSERT INTO user_editions (user_id, edition_id, status, total_pages)
		VALUES ($1::uuid, $2::uuid, $3::reading_status, $4)
		ON CONFLICT (user_id, edition_id)
		DO UPDATE SET status = EXCLUDED.status::reading_status, updated_at = CURRENT_TIMESTAMP`,
		userID, editionID, status, totalPages,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetUserBooks повертає всі книги користувача з полиці (НІКОЛИ не повертає null)
func (r *UserBookRepository) GetUserBooks(ctx context.Context, userID string) ([]models.Book, error) {
	query := `
		SELECT
			w.id::text,
			w.title,
			COALESCE(a.name, 'Невідомий автор') AS author,
			COALESCE(e.cover_url, '') AS cover_url,
			COALESCE(ue.status::text, 'planned') AS status,
			COALESCE(e.page_count, 0) AS page_count,
			COALESCE(ue.current_page, 0) AS current_page,
			COALESCE(ue.personal_rating::text, '') AS personal_rating,
			COALESCE(w.description, '') AS description
		FROM user_editions ue
		JOIN editions e ON ue.edition_id = e.id
		JOIN works w ON e.work_id = w.id
		LEFT JOIN authors a ON w.author_id = a.id
		WHERE ue.user_id = $1::uuid
		ORDER BY ue.updated_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return []models.Book{}, err
	}
	defer rows.Close()

	books := []models.Book{} // Ініціалізуємо як порожній slice, не nil
	for rows.Next() {
		var b models.Book
		var pageCount, currentPage int
		var personalRating string

		err := rows.Scan(
			&b.ID, &b.Title, &b.Author, &b.CoverURL,
			&b.Status, &pageCount, &currentPage, &personalRating, &b.Description,
		)
		if err != nil {
			continue
		}

		b.PageCount = pageCount
		b.CurrentPage = currentPage

		if b.Status == "" {
			b.Status = "planned"
		}

		if b.Author != "" && b.Author != "Невідомий автор" {
			b.Authors = []string{b.Author}
		} else {
			b.Authors = []string{}
		}

		b.Source = "local"
		books = append(books, b)
	}

	return books, nil
}

// AddWorkToShelf — швидке оновлення статусу існуючої книги з БД
func (r *UserBookRepository) AddWorkToShelf(ctx context.Context, userID, workID, status string) error {
	var editionID string
	var totalPages int

	err := r.db.QueryRow(ctx,
		`SELECT id::text, COALESCE(page_count, 1) FROM editions WHERE work_id = $1::uuid LIMIT 1`,
		workID,
	).Scan(&editionID, &totalPages)
	if err != nil {
		return errors.New("для цієї книги ще немає видання в базі")
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO user_editions (user_id, edition_id, status, total_pages)
		VALUES ($1::uuid, $2::uuid, $3::reading_status, $4)
		ON CONFLICT (user_id, edition_id)
		DO UPDATE SET status = EXCLUDED.status::reading_status, updated_at = CURRENT_TIMESTAMP`,
		userID, editionID, status, totalPages,
	)
	return err
}

// UpdateProgress — оновити поточну сторінку та статус
func (r *UserBookRepository) UpdateProgress(ctx context.Context, userID, workID string, currentPage int, status string) error {
	var editionID string
	err := r.db.QueryRow(ctx,
		`SELECT id::text FROM editions WHERE work_id = $1::uuid LIMIT 1`, workID,
	).Scan(&editionID)
	if err != nil {
		return errors.New("книгу не знайдено")
	}

	_, err = r.db.Exec(ctx, `
		UPDATE user_editions
		SET current_page = $1, status = $2::reading_status, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $3::uuid AND edition_id = $4::uuid`,
		currentPage, status, userID, editionID,
	)
	return err
}

// RemoveFromShelf — видалити книгу з полиці
func (r *UserBookRepository) RemoveFromShelf(ctx context.Context, userID, workID string) error {
	var editionID string
	err := r.db.QueryRow(ctx,
		`SELECT id::text FROM editions WHERE work_id = $1::uuid LIMIT 1`, workID,
	).Scan(&editionID)
	if err != nil {
		return nil // Якщо книги нема — OK
	}

	_, err = r.db.Exec(ctx,
		`DELETE FROM user_editions WHERE user_id = $1::uuid AND edition_id = $2::uuid`,
		userID, editionID,
	)
	return err
}
