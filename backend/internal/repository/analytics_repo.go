package repository

import (
	"context"
	"fmt"

	"book_project/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnalyticsRepository struct {
	db *pgxpool.Pool
}

func NewAnalyticsRepository(db *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// GetTrendingBooks — топ книг за тренд-балом за останній тиждень (оптимізовано через CTE)
func (r *AnalyticsRepository) GetTrendingBooks(ctx context.Context, days, limit int) ([]models.Book, error) {
	query := `
		WITH trending AS (
			SELECT work_id, SUM(score) as total_score
			FROM trending_events
			WHERE created_at > NOW() - ($1 || ' days')::interval
			GROUP BY work_id
			ORDER BY total_score DESC
			LIMIT $2
		)
		SELECT DISTINCT ON (t.total_score, w.id)
			w.id::text, w.title,
			COALESCE(a.name, 'Невідомий автор'),
			COALESCE(e.cover_url, ''),
			COALESCE(g.name, ''),
			t.total_score
		FROM trending t
		JOIN works w ON t.work_id = w.id
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON e.work_id = w.id
		LEFT JOIN work_genres wg ON wg.work_id = w.id
		LEFT JOIN genres g ON wg.genre_id = g.id
		ORDER BY t.total_score DESC, w.id`

	rows, err := r.db.Query(ctx, query, days, limit)
	if err != nil {
		// Fallback
		return r.GetNewest(ctx, limit)
	}
	defer rows.Close()

	books, err := r.scanBooks(rows, true)
	if err != nil || len(books) == 0 {
		return r.GetNewest(ctx, limit)
	}
	return books, nil
}

// GetNewest — найновіші книги за датою публікації
func (r *AnalyticsRepository) GetNewest(ctx context.Context, limit int) ([]models.Book, error) {
	query := `
		SELECT DISTINCT ON (w.created_at, w.id)
			w.id::text, w.title,
			COALESCE(a.name, 'Невідомий автор'),
			COALESCE(e.cover_url, ''),
			COALESCE(g.name, '')
		FROM works w
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON e.work_id = w.id
		LEFT JOIN work_genres wg ON wg.work_id = w.id
		LEFT JOIN genres g ON wg.genre_id = g.id
		ORDER BY w.created_at DESC, w.id
		LIMIT $1`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return r.scanBooks(rows, false)
}

// scanBooks — допоміжний метод для зменшення дублювання коду
func (r *AnalyticsRepository) scanBooks(rows pgx.Rows, withScore bool) ([]models.Book, error) {
	var books []models.Book
	for rows.Next() {
		var b models.Book
		var author string
		var score float64

		var err error
		if withScore {
			err = rows.Scan(&b.ID, &b.Title, &author, &b.CoverURL, &b.Category, &score)
		} else {
			err = rows.Scan(&b.ID, &b.Title, &author, &b.CoverURL, &b.Category)
		}

		if err != nil {
			continue
		}

		if author != "" && author != "Невідомий автор" {
			b.Authors = []string{author}
			b.Author = author
		} else {
			b.Authors = []string{}
		}
		b.Source = "local"
		books = append(books, b)
	}

	if books == nil {
		books = []models.Book{}
	}
	return books, nil
}

// GetAwards — нагороди з кешу
func (r *AnalyticsRepository) GetAwards(ctx context.Context) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
		SELECT ac.award_type, w.id::text, w.title,
			COALESCE(a.name,'') AS author,
			COALESCE(e.cover_url,'') AS cover,
			ac.score
		FROM awards_cache ac
		JOIN works w ON ac.work_id = w.id
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON e.work_id = w.id
		WHERE ac.period_start = (SELECT MAX(period_start) FROM awards_cache)
		ORDER BY ac.award_type`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var awards []map[string]interface{}
	for rows.Next() {
		var atype, wid, title, author, cover string
		var score float64
		if err := rows.Scan(&atype, &wid, &title, &author, &cover, &score); err != nil {
			continue
		}
		awards = append(awards, map[string]interface{}{
			"award_type": atype,
			"work_id":    wid,
			"title":      title,
			"author":     author,
			"cover_url":  cover,
			"score":      score,
		})
	}
	if awards == nil {
		awards = []map[string]interface{}{}
	}
	return awards, nil
}

// RecalcAwards — перераховує нагороди (викликати раз на добу)
func (r *AnalyticsRepository) RecalcAwards(ctx context.Context) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Книга місяця
	_, err = tx.Exec(ctx, `
		INSERT INTO awards_cache (award_type, work_id, period_start, score)
		SELECT 'book_of_month', work_id, CURRENT_DATE, SUM(score)
		FROM trending_events
		WHERE created_at > NOW() - INTERVAL '30 days'
		GROUP BY work_id ORDER BY SUM(score) DESC LIMIT 1
		ON CONFLICT (award_type, period_start) DO UPDATE SET score = EXCLUDED.score, work_id = EXCLUDED.work_id, calculated_at = NOW()`)
	if err != nil {
		return fmt.Errorf("recalc book_of_month: %w", err)
	}

	// Вибір критиків
	_, err = tx.Exec(ctx, `
		INSERT INTO awards_cache (award_type, work_id, period_start, score)
		SELECT 'critics_choice', id, CURRENT_DATE, average_rating
		FROM works WHERE total_ratings >= 10 AND average_rating >= 4.5
		ORDER BY average_rating DESC LIMIT 1
		ON CONFLICT (award_type, period_start) DO UPDATE SET score = EXCLUDED.score, work_id = EXCLUDED.work_id, calculated_at = NOW()`)
	if err != nil {
		return fmt.Errorf("recalc critics_choice: %w", err)
	}

	// Гарячі обговорення
	_, err = tx.Exec(ctx, `
		INSERT INTO awards_cache (award_type, work_id, period_start, score)
		SELECT 'hot_discussion', g.work_id, CURRENT_DATE, COUNT(cm.id)
		FROM chat_messages cm
		JOIN groups g ON cm.club_id = g.id
		WHERE cm.created_at > NOW() - INTERVAL '7 days' AND g.work_id IS NOT NULL
		GROUP BY g.work_id ORDER BY COUNT(cm.id) DESC LIMIT 1
		ON CONFLICT (award_type, period_start) DO UPDATE SET score = EXCLUDED.score, work_id = EXCLUDED.work_id, calculated_at = NOW()`)
	if err != nil {
		return fmt.Errorf("recalc hot_discussion: %w", err)
	}

	return tx.Commit(ctx)
}

// TrackEvent — записує подію в trending_events
func (r *AnalyticsRepository) TrackEvent(ctx context.Context, workID, eventType string, score int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO trending_events (work_id, event_type, score)
		VALUES ($1::uuid, $2, $3)`,
		workID, eventType, score,
	)
	return err
}

// GetUserStats — особиста аналітика (оптимізовано через підзапити для уникнення дублювання результатів)
func (r *AnalyticsRepository) GetUserStats(ctx context.Context, userID string) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// 1. Загальна статистика
	var booksRead, totalSessions int
	var pagesRead int64
	var totalMinutes float64
	err := r.db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM user_editions WHERE user_id = $1::uuid AND status = 'finished') AS books_read,
			(SELECT COALESCE(SUM(pages_read), 0) FROM reading_sessions WHERE user_id = $1::uuid) AS pages_read,
			(SELECT COUNT(*) FROM reading_sessions WHERE user_id = $1::uuid) AS total_sessions,
			(SELECT COALESCE(SUM(duration_seconds) / 60.0, 0) FROM reading_sessions WHERE user_id = $1::uuid) AS total_minutes
	`, userID).Scan(&booksRead, &pagesRead, &totalSessions, &totalMinutes)

	if err != nil {
		return nil, err
	}

	stats["books_read"] = booksRead
	stats["pages_read"] = pagesRead
	stats["total_sessions"] = totalSessions
	stats["total_minutes"] = totalMinutes

	// 2. Середня швидкість
	if totalMinutes > 0 {
		stats["avg_pages_per_hour"] = float64(pagesRead) / (totalMinutes / 60.0)
	} else {
		stats["avg_pages_per_hour"] = 0.0
	}

	// 3. Цього року
	var booksThisYear int
	var pagesThisYear int64
	r.db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM user_editions WHERE user_id = $1::uuid AND status = 'finished' AND EXTRACT(YEAR FROM finished_at) = EXTRACT(YEAR FROM NOW())),
			(SELECT COALESCE(SUM(pages_read), 0) FROM reading_sessions WHERE user_id = $1::uuid AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()))
	`, userID).Scan(&booksThisYear, &pagesThisYear)

	stats["books_this_year"] = booksThisYear
	stats["pages_this_year"] = pagesThisYear

	// 4. Ціль на рік
	var targetBooks, targetPages int
	r.db.QueryRow(ctx, `
		SELECT COALESCE(target_books,0), COALESCE(target_pages,0) 
		FROM reading_goals
		WHERE user_id = $1::uuid AND goal_year = EXTRACT(YEAR FROM NOW())::int
	`, userID).Scan(&targetBooks, &targetPages)

	stats["goal_books"] = targetBooks
	stats["goal_pages"] = targetPages

	// 5. Улюблений жанр
	var favGenre string
	err = r.db.QueryRow(ctx, `
		SELECT g.name FROM work_genres wg
		JOIN genres g ON wg.genre_id = g.id
		JOIN editions e ON e.work_id = wg.work_id
		JOIN user_editions ue ON ue.edition_id = e.id
		WHERE ue.user_id = $1::uuid AND ue.status = 'finished'
		GROUP BY g.name ORDER BY COUNT(*) DESC LIMIT 1
	`, userID).Scan(&favGenre)

	if err == nil {
		stats["favorite_genre"] = favGenre
	} else {
		stats["favorite_genre"] = ""
	}

	// 6. Сесії по днях (heatmap)
	rows, err := r.db.Query(ctx, `
		SELECT session_date::text, SUM(pages_read), SUM(duration_seconds)/60
		FROM reading_sessions
		WHERE user_id = $1::uuid AND session_date >= CURRENT_DATE - INTERVAL '30 days'
		GROUP BY session_date ORDER BY session_date
	`, userID)

	type DayStat struct {
		Date    string `json:"date"`
		Pages   int    `json:"pages"`
		Minutes int    `json:"minutes"`
	}
	var daily []DayStat

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var d DayStat
			rows.Scan(&d.Date, &d.Pages, &d.Minutes)
			daily = append(daily, d)
		}
	}
	if daily == nil {
		daily = []DayStat{}
	}
	stats["daily_stats"] = daily

	return stats, nil
}

// GetOrCreateGoal — отримує або створює ціль читання
func (r *AnalyticsRepository) GetOrCreateGoal(ctx context.Context, userID string, year int) (map[string]interface{}, error) {
	var targetBooks, targetPages int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(target_books,0), COALESCE(target_pages,0)
		FROM reading_goals WHERE user_id = $1::uuid AND goal_year = $2`,
		userID, year,
	).Scan(&targetBooks, &targetPages)

	// Якщо запису ще немає, створюємо з нулями
	if err == pgx.ErrNoRows || err != nil {
		r.db.Exec(ctx, `
			INSERT INTO reading_goals (user_id, goal_year, target_books, target_pages)
			VALUES ($1::uuid, $2, 0, 0)
			ON CONFLICT DO NOTHING`,
			userID, year,
		)
		targetBooks, targetPages = 0, 0
	}

	return map[string]interface{}{
		"year":         year,
		"target_books": targetBooks,
		"target_pages": targetPages,
	}, nil
}

// SetGoal — оновлює ціль читання
func (r *AnalyticsRepository) SetGoal(ctx context.Context, userID string, year, targetBooks, targetPages int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO reading_goals (user_id, goal_year, target_books, target_pages)
		VALUES ($1::uuid, $2, $3, $4)
		ON CONFLICT (user_id, goal_year) DO UPDATE SET target_books = EXCLUDED.target_books, target_pages = EXCLUDED.target_pages, updated_at = NOW()`,
		userID, year, targetBooks, targetPages,
	)
	return err
}

func (r *AnalyticsRepository) GetCalendarData(ctx context.Context, userID string, year int) ([]map[string]interface{}, error) {
	rows, err := r.db.Query(ctx, `
		SELECT session_date::text, COALESCE(SUM(pages_read),0)::int, COALESCE(SUM(duration_seconds)/60,0)::int
		FROM reading_sessions
		WHERE user_id = $1::uuid AND EXTRACT(YEAR FROM session_date) = $2
		GROUP BY session_date ORDER BY session_date ASC`,
		userID, year,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var date string
		var pages, minutes int
		if err := rows.Scan(&date, &pages, &minutes); err != nil {
			continue
		}
		result = append(result, map[string]interface{}{
			"date":       date,
			"pages_read": pages,
			"minutes":    minutes,
		})
	}
	if result == nil {
		result = []map[string]interface{}{}
	}
	return result, nil
}

// GetHighRatedBooks — книги що отримали оцінку 4+ від користувача
func (r *AnalyticsRepository) GetHighRatedBooks(ctx context.Context, userID string, limit int) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT w.title
		FROM work_reviews wr
		JOIN works w ON wr.work_id = w.id
		WHERE wr.user_id = $1::uuid AND wr.rating >= 4
		ORDER BY wr.created_at DESC
		LIMIT $2`, userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var titles []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			continue
		}
		titles = append(titles, t)
	}
	return titles, nil
}

// internal/repository/analytics_repository.go
// GetGoal повертає ціль читання користувача на конкретний рік
func (r *AnalyticsRepository) GetGoal(ctx context.Context, userID string, year int) (map[string]interface{}, error) {
	var targetBooks, targetPages int

	// Використовуємо QueryRow (без Context у назві)
	// Також виправляємо назву колонки year -> goal_year, як у ваших попередніх методах
	err := r.db.QueryRow(ctx,
		"SELECT target_books, target_pages FROM reading_goals WHERE user_id = $1::uuid AND goal_year = $2",
		userID, year,
	).Scan(&targetBooks, &targetPages)

	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"year":         year,
		"target_books": targetBooks,
		"target_pages": targetPages,
	}, nil
}

// GetUserStreak розраховує поточну серію днів читання (streak)
func (r *AnalyticsRepository) GetUserStreak(ctx context.Context, userID string) (int, error) {
	var streak int

	// Використовуємо синтаксис PostgreSQL ($1) замість (?)
	// Також замінюємо QueryRowContext на QueryRow
	query := `
		WITH RECURSIVE dates AS (
			SELECT MAX(session_date) as last_date
			FROM reading_sessions
			WHERE user_id = $1::uuid AND session_date >= CURRENT_DATE - INTERVAL '1 day'
			UNION ALL
			SELECT (last_date - INTERVAL '1 day')::date
			FROM dates
			WHERE EXISTS (
				SELECT 1 FROM reading_sessions 
				WHERE user_id = $1::uuid AND session_date = (last_date - INTERVAL '1 day')::date
			)
		)
		SELECT COUNT(*) FROM dates;`

	err := r.db.QueryRow(ctx, query, userID).Scan(&streak)
	if err != nil {
		return 0, nil
	}

	return streak, nil
}
