package repository

import (
	"context"
	"strings"
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
	var totalPages int
	err := r.db.QueryRow(ctx, `SELECT COALESCE(page_count, 1) FROM editions WHERE work_id = $1::uuid LIMIT 1`, workID).Scan(&totalPages)
	if err != nil {
		totalPages = 1
	}

	// ON CONFLICT — оновлюємо тільки статус, НЕ чіпаємо дати та прогрес
	_, err = r.db.Exec(ctx, `
		INSERT INTO user_editions (user_id, work_id, status, total_pages)
		VALUES ($1::uuid, $2::uuid, $3::reading_status, $4)
		ON CONFLICT (user_id, work_id)
		DO UPDATE SET
			status = EXCLUDED.status::reading_status,
			updated_at = CURRENT_TIMESTAMP`,
		userID, workID, status, totalPages,
	)

	if err == nil {
		r.db.Exec(ctx, `INSERT INTO activity_feed(actor_id, type, work_id) VALUES($1::uuid, 'add_book', $2::uuid) ON CONFLICT DO NOTHING`, userID, workID)
	}

	return err
}

func (r *UserBookRepository) UpdateProgress(ctx context.Context, userID, workID uuid.UUID, status string, currentPage int, notes string, startDate, endDate *time.Time) error {
	// 1. Отримуємо дані з БД (ДОДАЛИ status::text, щоб знати попередній стан)
	var totalPages int
	var dbStartedAt, dbFinishedAt *time.Time
	var dbStatus string // Знаємо, яким статус був ДО зміни

	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(total_pages, 0), started_at, finished_at, COALESCE(status::text, 'planned')
		FROM user_editions
		WHERE user_id = $1 AND work_id = $2`,
		userID, workID,
	).Scan(&totalPages, &dbStartedAt, &dbFinishedAt, &dbStatus)

	if err != nil {
		// Якщо книги ще немає на полиці, дістаємо кількість сторінок з editions
		r.db.QueryRow(ctx, `SELECT COALESCE(page_count, 1) FROM editions WHERE work_id = $1::uuid LIMIT 1`, workID).Scan(&totalPages)
		if totalPages == 0 {
			totalPages = 1
		}
		dbStatus = "planned"
	}

	// Запам'ятовуємо, чи користувач прямо зараз у календарику вибрав дату
	frontendSentEndDate := endDate != nil

	// Відновлюємо дати з бази, якщо фронт їх не передав
	if startDate == nil {
		startDate = dbStartedAt
	}
	if endDate == nil {
		endDate = dbFinishedAt
	}

	// ====================================================================
	// 2. РОЗУМНА ЛОГІКА СТАТУСІВ ТА СТОРІНОК
	// ====================================================================

	// ПРАВИЛО 1: Якщо користувач вручну вибрав дату завершення -> Прочитано
	if frontendSentEndDate && status != "read" {
		status = "read"
	}

	// ПРАВИЛО 2: Якщо користувач сам докрутив повзунок до кінця -> Прочитано
	if status != "read" && dbStatus != "read" && totalPages > 0 && currentPage >= totalPages {
		status = "read"
	}

	// ПРАВИЛО 3: ВИХІД ІЗ ПАСТКИ! (Зміна З "Прочитано" НА "Читаю")
	if status != "read" && dbStatus == "read" {
		endDate = nil // Знімаємо дату завершення
		// Відкидаємо 1 сторінку назад (було 336/336 -> стає 335/336),
		// щоб бекенд більше не вважав книгу автоматично прочитаною.
		if totalPages > 0 && currentPage >= totalPages {
			currentPage = totalPages - 1
		}
	}

	// ПРАВИЛО 4: Фінальна нормалізація для "Прочитано"
	if status == "read" {
		if totalPages > 0 {
			currentPage = totalPages
		}
		if endDate == nil {
			now := time.Now()
			endDate = &now
		}
	}

	// ПРАВИЛО 5: Нормалізація для "В планах"
	if status == "planned" {
		currentPage = 0
		startDate = nil
		endDate = nil
	}

	// ====================================================================
	// 3. Збереження у базу даних
	// ====================================================================
	_, err = r.db.Exec(ctx, `
		INSERT INTO user_editions (user_id, work_id, status, current_page, notes, started_at, finished_at, total_pages, updated_at)
		VALUES ($6, $7, $1::reading_status, $2, $3, $4, $5, $8, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, work_id) DO UPDATE SET
			status       = EXCLUDED.status::reading_status,
			current_page = EXCLUDED.current_page,
			notes        = EXCLUDED.notes,
			started_at   = EXCLUDED.started_at,
			finished_at  = EXCLUDED.finished_at,
			updated_at   = CURRENT_TIMESTAMP`,
		status, currentPage, notes, startDate, endDate, userID, workID, totalPages,
	)
	return err
}

// RemoveFromShelf — видалити книгу з полиці
func (r *UserBookRepository) RemoveFromShelf(ctx context.Context, userID, workID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM user_editions WHERE user_id = $1::uuid AND work_id = $2::uuid`, userID, workID)
	return err
}

func (r *UserBookRepository) GetUserBooks(ctx context.Context, userID string) ([]models.Book, error) {
	query := `
        SELECT
            w.id::text, w.title, COALESCE(a.name, 'Невідомий автор'),
            COALESCE((SELECT cover_url FROM editions WHERE work_id = w.id AND cover_url IS NOT NULL LIMIT 1), ''),
            COALESCE(ue.status::text, 'planned'),
            COALESCE(ue.total_pages, (SELECT page_count FROM editions WHERE work_id = w.id LIMIT 1), 0),
            COALESCE(ue.current_page, 0),
            COALESCE(ue.personal_rating::text, '0'),
            COALESCE((
                SELECT string_agg(g.name, ', ') 
                FROM work_genres wg 
                JOIN genres g ON wg.genre_id = g.id 
                WHERE wg.work_id = w.id
            ), 'Інше'),
            COALESCE(w.description, ''),
            ue.started_at, ue.finished_at
        FROM user_editions ue
        JOIN works w ON ue.work_id = w.id
        LEFT JOIN authors a ON w.author_id = a.id
        WHERE ue.user_id = $1::uuid
        ORDER BY ue.updated_at DESC
    `

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	books := []models.Book{}
	for rows.Next() {
		var b models.Book
		var pRating, genresStr string
		var startedAt, finishedAt *time.Time

		err := rows.Scan(
			&b.ID, &b.Title, &b.Author, &b.CoverURL,
			&b.Status, &b.PageCount, &b.CurrentPage,
			&pRating, &genresStr, &b.Description,
			&startedAt, &finishedAt,
		)
		if err != nil {
			continue
		}

		// Автори
		if b.Author != "" && b.Author != "Невідомий автор" {
			b.Authors = []string{b.Author}
		}

		// Жанри: заповнюємо всі поля для сумісності та аналітики
		if genresStr != "" && genresStr != "Інше" {
			parts := strings.Split(genresStr, ",")
			for i := range parts {
				parts[i] = strings.TrimSpace(parts[i])
			}
			b.Category = parts[0] // Старий код працює
			b.Categories = parts  // Аналітика працює
			b.Genres = parts      // Ваша нова структура працює
		} else {
			b.Category = "Інше"
			b.Categories = []string{"Інше"}
			b.Genres = []string{"Інше"}
		}

		b.StartedAt = startedAt
		b.FinishedAt = finishedAt
		books = append(books, b)
	}

	return books, nil
}

// Метод для старого парсера, який додавав книгу цілком
func (r *UserBookRepository) AddBookToShelf(ctx context.Context, userID uuid.UUID, bookData models.Book, status string) error {
	// Спрощений виклик для сумісності
	return r.AddWorkToShelf(ctx, userID.String(), bookData.ID, status)
}
