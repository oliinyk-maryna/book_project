package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"book_project/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BookRepository struct {
	db *pgxpool.Pool
}

func NewBookRepository(db *pgxpool.Pool) *BookRepository {
	return &BookRepository{db: db}
}

// GetAll — каталог з повними фільтрами
func (r *BookRepository) GetAll(ctx context.Context, f models.BookFilters) ([]models.Book, error) {
	query := `
		SELECT DISTINCT ON (w.id)
			w.id::text,
			w.title,
			COALESCE(a.name, 'Невідомий автор') AS author,
			COALESCE(g.name, 'Без категорії') AS category,
			COALESCE(e.cover_url, '') AS cover_url,
			COALESCE(e.page_count, 0),
			COALESCE(w.average_rating, 0)
		FROM works w
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON w.id = e.work_id
		LEFT JOIN work_genres wg ON w.id = wg.work_id
		LEFT JOIN genres g ON wg.genre_id = g.id
		LEFT JOIN languages l ON e.language_id = l.id
		WHERE 1=1`

	var args []any
	n := 1

	if f.Search != "" {
		query += ` AND (w.title ILIKE $` + strconv.Itoa(n) + ` OR a.name ILIKE $` + strconv.Itoa(n) + `)`
		args = append(args, "%"+f.Search+"%")
		n++
	}
	if len(f.Genres) > 0 {
		query += ` AND g.name = ANY($` + strconv.Itoa(n) + `)`
		args = append(args, f.Genres)
		n++
	}
	if len(f.Languages) > 0 {
		query += ` AND l.name = ANY($` + strconv.Itoa(n) + `)`
		args = append(args, f.Languages)
		n++
	}
	if len(f.Publishers) > 0 {
		query += ` AND e.publisher = ANY($` + strconv.Itoa(n) + `)`
		args = append(args, f.Publishers)
		n++
	}
	if f.YearFrom != "" {
		query += ` AND EXTRACT(YEAR FROM e.publication_date)::int >= $` + strconv.Itoa(n)
		args = append(args, f.YearFrom)
		n++
	}
	if f.YearTo != "" {
		query += ` AND EXTRACT(YEAR FROM e.publication_date)::int <= $` + strconv.Itoa(n)
		args = append(args, f.YearTo)
		n++
	}
	// Нові фільтри
	if f.PageCountMin > 0 {
		query += ` AND e.page_count >= $` + strconv.Itoa(n)
		args = append(args, f.PageCountMin)
		n++
	}
	if f.PageCountMax > 0 {
		query += ` AND e.page_count <= $` + strconv.Itoa(n)
		args = append(args, f.PageCountMax)
		n++
	}
	if f.RatingMin != "" {
		query += ` AND w.average_rating >= $` + strconv.Itoa(n)
		args = append(args, f.RatingMin)
		n++
	}
	if f.Author != "" {
		query += ` AND a.name ILIKE $` + strconv.Itoa(n)
		args = append(args, "%"+f.Author+"%")
		n++
	}
	// Сортування
	switch f.Sort {
	case "newest":
		query = strings.Replace(query, "DISTINCT ON (w.id)", "DISTINCT ON (w.created_at, w.id)", 1)
		query += ` ORDER BY w.created_at DESC, w.id`
	case "popular":
		// МАГІЯ ТУТ: Рахуємо кількість людей, які зараз читають цю книгу (статус 'reading')
		query = strings.Replace(query, "DISTINCT ON (w.id)", "DISTINCT ON ((SELECT COUNT(*) FROM user_editions WHERE work_id = w.id AND status = 'reading'), w.id)", 1)
		query += ` ORDER BY (SELECT COUNT(*) FROM user_editions WHERE work_id = w.id AND status = 'reading') DESC, w.id`
	case "rating":
		query = strings.Replace(query, "DISTINCT ON (w.id)", "DISTINCT ON (w.average_rating, w.id)", 1)
		query += ` ORDER BY w.average_rating DESC NULLS LAST, w.id`
	case "pages_asc":
		query = strings.Replace(query, "DISTINCT ON (w.id)", "DISTINCT ON (e.page_count, w.id)", 1)
		query += ` ORDER BY e.page_count ASC NULLS LAST, w.id`
	case "pages_desc":
		query = strings.Replace(query, "DISTINCT ON (w.id)", "DISTINCT ON (e.page_count, w.id)", 1)
		query += ` ORDER BY e.page_count DESC NULLS LAST, w.id`
	case "random":
		query += ` ORDER BY w.id, RANDOM()`
	default:
		query = strings.Replace(query, "DISTINCT ON (w.id)", "DISTINCT ON (w.created_at, w.id)", 1)
		query += ` ORDER BY w.created_at DESC, w.id`
	}

	limit := 60
	if f.Limit > 0 && f.Limit <= 200 {
		limit = f.Limit
	}
	query += ` LIMIT ` + strconv.Itoa(limit)

	if f.Offset > 0 {
		query += ` OFFSET ` + strconv.Itoa(f.Offset)
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var b models.Book
		var authorName, category string
		var pageCount int
		var avgRating float64
		if err := rows.Scan(&b.ID, &b.Title, &authorName, &category, &b.CoverURL, &pageCount, &avgRating); err != nil {
			return nil, err
		}
		b.Category = category
		b.PageCount = pageCount
		b.Source = "local"
		if authorName != "" && authorName != "Невідомий автор" {
			b.Authors = []string{authorName}
		} else {
			b.Authors = []string{}
		}
		books = append(books, b)
	}
	if books == nil {
		return []models.Book{}, nil
	}
	return books, nil
}

func (r *BookRepository) GetByIDWithDetails(ctx context.Context, id string, userID string) (*models.BookDetails, error) {
	parsedID, err := uuid.Parse(id)
	if err != nil {
		return nil, errors.New("невірний формат UUID")
	}

	query := `
	SELECT 
		w.id::text, w.title,
		COALESCE(a.name, 'Невідомий автор'),
		COALESCE(e.cover_url, ''),
		-- ТУТ ФІКС ЖАНРІВ: збираємо всі через кому
		COALESCE((SELECT string_agg(g2.name, ', ') FROM work_genres wg2 JOIN genres g2 ON wg2.genre_id = g2.id WHERE wg2.work_id = w.id), 'Не вказано'),
		COALESCE(w.description, ''),
		COALESCE(e.page_count, 0),
		COALESCE(e.publisher, 'Не вказано'), -- ТУТ ФІКС ВИДАВНИЦТВА
		COALESCE(e.publication_date::text, 'Не вказано'),
		COALESCE(w.average_rating, 0),
		COALESCE(w.total_ratings, 0)
	FROM works w
	LEFT JOIN authors a ON w.author_id = a.id
	LEFT JOIN editions e ON w.id = e.work_id
	WHERE w.id = $1
	LIMIT 1`

	var b models.BookDetails
	var authorName, category string
	err = r.db.QueryRow(ctx, query, parsedID).Scan(
		&b.ID, &b.Title, &authorName, &b.CoverURL, &category,
		&b.Description, &b.PageCount, &b.Publisher, &b.PublicationDate,
		&b.AverageRating, &b.TotalRatings,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("книгу не знайдено")
		}
		return nil, err
	}
	b.Category = category
	b.Source = "local"
	if authorName != "" && authorName != "Невідомий автор" {
		b.Authors = []string{authorName}
	} else {
		b.Authors = []string{}
	}

	// Статус користувача — використовуємо work_id напряму (не через edition_id)
	// Статус користувача — використовуємо work_id напряму (не через edition_id)
	if userID != "" {
		var status string
		var currentPage, totalPages int
		var notes, startedAt, finishedAt string
		var personalRating int // <--- ЗМІНА 1: Змінна для зірочок

		err := r.db.QueryRow(ctx, `
			SELECT ue.status::text,
			       COALESCE(ue.current_page, 0),
			       COALESCE(ue.total_pages, 0),
			       COALESCE(ue.notes, ''),
			       COALESCE(ue.started_at::text, ''),
			       COALESCE(ue.finished_at::text, ''),
			       COALESCE(ue.personal_rating, 0) -- <--- ЗМІНА 2: Дістаємо оцінку з БД
			FROM user_editions ue
			WHERE ue.user_id = $1::uuid AND ue.work_id = $2::uuid
			LIMIT 1`, userID, parsedID,
		).Scan(&status, &currentPage, &totalPages, &notes, &startedAt, &finishedAt, &personalRating) // <--- ЗМІНА 3: Скануємо нове поле

		if err == nil {
			b.UserStatus = status
			b.CurrentPage = currentPage
			b.TotalPages = totalPages
			b.Notes = notes
			b.StartedAt = startedAt
			b.FinishedAt = finishedAt
			b.PersonalRating = personalRating // <--- ЗМІНА 4: Передаємо у модель
		}
	}

	// Клуби цієї книги
	clubs, _ := r.GetClubsByWorkID(ctx, id)
	if clubs == nil {
		clubs = []models.BookClub{}
	}
	b.Clubs = clubs

	return &b, nil
}

func (r *BookRepository) SearchInternal(ctx context.Context, query string) ([]models.Book, error) {
	return r.SearchLocal(ctx, query)
}

func (r *BookRepository) GetFilterOptions(ctx context.Context) (*models.FilterOptions, error) {
	opts := &models.FilterOptions{}

	// Категорії (жанри)
	rows, err := r.db.Query(ctx, `SELECT DISTINCT name FROM genres WHERE name != '' ORDER BY name LIMIT 100`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var s string
			if rows.Scan(&s) == nil && s != "" {
				opts.Categories = append(opts.Categories, s)
			}
		}
	}

	// Видавці
	rows2, err := r.db.Query(ctx, `SELECT DISTINCT publisher FROM editions WHERE publisher IS NOT NULL AND publisher != '' ORDER BY publisher LIMIT 100`)
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var s string
			if rows2.Scan(&s) == nil && s != "" {
				opts.Publishers = append(opts.Publishers, s)
			}
		}
	}

	// Мови
	rows3, err := r.db.Query(ctx, `SELECT DISTINCT l.name FROM languages l JOIN editions e ON e.language_id = l.id ORDER BY l.name LIMIT 50`)
	if err == nil {
		defer rows3.Close()
		for rows3.Next() {
			var s string
			if rows3.Scan(&s) == nil && s != "" {
				opts.Languages = append(opts.Languages, s)
			}
		}
	}

	return opts, nil
}

func (r *BookRepository) GetReviewsByWorkID(ctx context.Context, workID string) ([]models.WorkReview, error) {
	rows, err := r.db.Query(ctx, `
		SELECT br.id::text, br.user_id::text, 
			COALESCE(u.username, 'Читач'),
			COALESCE(u.avatar_url::text, ''),
			-- ТЯГНЕМО ОЦІНКУ З ПОЛИЦІ КОРИСТУВАЧА:
			COALESCE((SELECT personal_rating FROM user_editions ue WHERE ue.user_id = br.user_id AND ue.work_id = br.work_id LIMIT 1), 0)::int,
			COALESCE(br.review_text, ''),
			COALESCE(br.has_spoiler, false),
			0::int, -- Тимчасовий нуль для лайків
			br.created_at
		FROM work_reviews br
		JOIN users u ON br.user_id = u.id
		WHERE br.work_id = $1::uuid
		ORDER BY br.created_at DESC
		LIMIT 50`, workID)

	// Якщо UUID невалідний або впала база — повертаємо помилку!
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []models.WorkReview
	for rows.Next() {
		var rev models.WorkReview
		err := rows.Scan(
			&rev.ID, &rev.UserID, &rev.UserName, &rev.AvatarURL,
			&rev.Rating, &rev.ReviewText, &rev.HasSpoiler, &rev.LikesCount, &rev.CreatedAt,
		)

		if err == nil {
			reviews = append(reviews, rev)
		} else {
			// Тепер ви хоча б побачите у логах сервера, якщо щось зламається
			fmt.Printf("Помилка сканування відгуку: %v\n", err)
		}
	}
	if reviews == nil {
		return []models.WorkReview{}, nil
	}
	return reviews, nil
}

func (r *BookRepository) AddReview(ctx context.Context, workID, userID string, _ int, comment string, hasSpoiler bool) error {
	// 1. Просто додаємо текст відгуку. Рейтинг ігноруємо.
	_, err := r.db.Exec(ctx, `
		INSERT INTO work_reviews (work_id, user_id, review_text, has_spoiler)
		VALUES ($1::uuid, $2::uuid, $3, $4)`,
		workID, userID, comment, hasSpoiler)
	if err != nil {
		return err
	}

	// 2. Фіксуємо активність
	r.db.Exec(ctx, `INSERT INTO activity_feed(actor_id, type, work_id) VALUES($1::uuid, 'review', $2::uuid) ON CONFLICT DO NOTHING`, userID, workID)

	return nil
}
func (r *BookRepository) AdminDeleteReview(ctx context.Context, reviewID string) {
	r.db.Exec(ctx, `DELETE FROM work_reviews WHERE id=$1::uuid`, reviewID)
}

func (r *BookRepository) LikeReview(ctx context.Context, reviewID, userID, emoji string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO review_likes(user_id, review_id, emoji)
		VALUES($1::uuid, $2::uuid, $3)
		ON CONFLICT(user_id, review_id) DO UPDATE SET emoji=$3`,
		userID, reviewID, emoji)
	return err
}

func (r *BookRepository) GetClubsByWorkID(ctx context.Context, workID string) ([]models.BookClub, error) {
	rows, err := r.db.Query(ctx, `
		SELECT g.id::text, g.name, g.description,
			COALESCE(g.status,'recruiting'),
			(SELECT COUNT(*) FROM group_members WHERE group_id=g.id) AS mc
		FROM groups g
		WHERE g.work_id = $1::uuid
		  AND COALESCE(g.status,'recruiting') NOT IN ('closed')
		ORDER BY mc DESC
		LIMIT 20`, workID)
	if err != nil {
		return []models.BookClub{}, nil
	}
	defer rows.Close()

	var clubs []models.BookClub
	for rows.Next() {
		var c models.BookClub
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.Status, &c.MembersCount); err == nil {
			clubs = append(clubs, c)
		}
	}
	if clubs == nil {
		return []models.BookClub{}, nil
	}
	return clubs, nil
}

// SaveReadingSession — зберігає сесію читання з початковою і кінцевою сторінкою
func (r *BookRepository) SaveReadingSession(ctx context.Context, userID, workID string, duration, pagesRead int, notes string) error {
	// Передаємо notes замість "" в кінці
	return r.SaveReadingSessionFull(ctx, userID, workID, duration, pagesRead, 0, 0, notes)
}
func (r *BookRepository) SaveReadingSessionFull(ctx context.Context, userID, workID string, duration, pagesRead, startPage, endPage int, notes string) error {
	// 1. Обов'язково знаходимо ID видання
	var editionID string
	err := r.db.QueryRow(ctx, `SELECT id FROM editions WHERE work_id = $1::uuid LIMIT 1`, workID).Scan(&editionID)
	if err != nil {
		return fmt.Errorf("не знайдено видання для роботи %s: %w", workID, err)
	}

	// 2. Зберігаємо сесію з повною датою
	_, err = r.db.Exec(ctx, `
		INSERT INTO reading_sessions(user_id, work_id, edition_id, duration_seconds, pages_read, start_page, end_page, session_date)
		VALUES($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, CURRENT_DATE)`,
		userID, workID, editionID, duration, pagesRead, startPage, endPage)

	if err != nil {
		return fmt.Errorf("помилка INSERT в reading_sessions: %w", err)
	}

	// 3. Оновлюємо поточну сторінку ТА нотатки в user_editions
	// Зауваження: Ми прибираємо умову (if endPage > 0), щоб нотатки зберігалися,
	// навіть якщо користувач просто написав текст, але не перегортав сторінку.
	_, err = r.db.Exec(ctx, `
		UPDATE user_editions 
		SET current_page = CASE WHEN $1 > 0 THEN $1 ELSE current_page END,
		    notes = $2, 
		    status = 'reading'::reading_status, 
		    updated_at = NOW()
		WHERE user_id = $3::uuid AND edition_id = $4::uuid`,
		endPage, notes, userID, editionID)

	return err
}

func (r *BookRepository) GetUserBookStatus(ctx context.Context, userID, workID string) (string, error) {
	var status string
	err := r.db.QueryRow(ctx, `
		SELECT ue.status::text
		FROM user_editions ue JOIN editions e ON ue.edition_id=e.id
		WHERE ue.user_id=$1::uuid AND e.work_id=$2::uuid LIMIT 1`,
		userID, workID).Scan(&status)
	return status, err
}

func (r *BookRepository) SearchLocal(ctx context.Context, query string) ([]models.Book, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT ON (w.id)
			w.id::text, w.title,
			COALESCE(a.name,'Невідомий автор'),
			COALESCE(e.cover_url,''),
			COALESCE(g.name,'')
		FROM works w
		LEFT JOIN authors a ON w.author_id=a.id
		LEFT JOIN editions e ON w.id=e.work_id
		LEFT JOIN work_genres wg ON w.id=wg.work_id
		LEFT JOIN genres g ON wg.genre_id=g.id
		WHERE w.title ILIKE $1 OR a.name ILIKE $1
		ORDER BY w.id LIMIT 20`,
		"%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var b models.Book
		var category string
		if err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.CoverURL, &category); err != nil {
			continue
		}
		if b.Author != "" && b.Author != "Невідомий автор" {
			b.Authors = []string{b.Author}
		} else {
			b.Authors = []string{}
		}
		b.Source = "local"
		b.Category = category
		books = append(books, b)
	}
	return books, nil
}

func (r *BookRepository) GetOrCreateByGoogleID(ctx context.Context, book *models.Book) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	authorName := "Невідомий автор"
	if len(book.Authors) > 0 {
		authorName = book.Authors[0]
	} else if book.Author != "" {
		authorName = book.Author
	}

	var authorID string
	if err := tx.QueryRow(ctx, `SELECT id::text FROM authors WHERE name=$1 LIMIT 1`, authorName).Scan(&authorID); err != nil {
		if err := tx.QueryRow(ctx, `INSERT INTO authors(name) VALUES($1) RETURNING id::text`, authorName).Scan(&authorID); err != nil {
			return err
		}
	}

	var workID string
	if err := tx.QueryRow(ctx, `SELECT id::text FROM works WHERE title=$1 AND author_id=$2::uuid LIMIT 1`, book.Title, authorID).Scan(&workID); err != nil {
		if err := tx.QueryRow(ctx, `INSERT INTO works(title,author_id,description) VALUES($1,$2::uuid,$3) RETURNING id::text`,
			book.Title, authorID, book.Description).Scan(&workID); err != nil {
			return err
		}
	}

	var editionID string
	if err := tx.QueryRow(ctx, `SELECT id::text FROM editions WHERE work_id=$1::uuid LIMIT 1`, workID).Scan(&editionID); err != nil {
		pageCount := book.PageCount
		if pageCount <= 0 {
			pageCount = 1
		}
		if err := tx.QueryRow(ctx, `INSERT INTO editions(work_id,cover_url,page_count,is_primary) VALUES($1::uuid,$2,$3,true) RETURNING id::text`,
			workID, book.CoverURL, pageCount).Scan(&editionID); err != nil {
			return err
		}
	}

	book.ID = workID
	return tx.Commit(ctx)
}

func (r *BookRepository) UpsertFromGoogle(ctx context.Context, book models.Book) error {
	return r.GetOrCreateByGoogleID(ctx, &book)
}

func (r *BookRepository) GetTrending(ctx context.Context, limit int) ([]models.Book, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT ON (w.id)
			w.id::text, w.title,
			COALESCE(a.name,'Невідомий автор'),
			COALESCE(e.cover_url,''),
			COALESCE(g.name,'')
		FROM works w
		LEFT JOIN authors a ON w.author_id=a.id
		LEFT JOIN editions e ON w.id=e.work_id AND e.is_primary=true
		LEFT JOIN work_genres wg ON w.id=wg.work_id
		LEFT JOIN genres g ON wg.genre_id=g.id
		WHERE w.total_ratings>0
		ORDER BY w.id, w.average_rating DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanSimpleBooks(rows)
}

func (r *BookRepository) GetNewest(ctx context.Context, limit int) ([]models.Book, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT ON (w.id)
			w.id::text, w.title,
			COALESCE(a.name,'Невідомий автор'),
			COALESCE(e.cover_url,''),
			COALESCE(g.name,'')
		FROM works w
		LEFT JOIN authors a ON w.author_id=a.id
		LEFT JOIN editions e ON w.id=e.work_id
		LEFT JOIN work_genres wg ON w.id=wg.work_id
		LEFT JOIN genres g ON wg.genre_id=g.id
		ORDER BY w.id, w.created_at DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanSimpleBooks(rows)
}

// GetTopRated — топ книг за середнім рейтингом (для блоку "Топ рік")
func (r *BookRepository) GetTopRated(ctx context.Context, limit int, minRatings int) ([]models.Book, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT ON (w.id)
			w.id::text, w.title,
			COALESCE(a.name,'Невідомий автор'),
			COALESCE(e.cover_url,''),
			COALESCE(g.name,''),
			COALESCE(w.average_rating, 0),
			COALESCE(w.total_ratings, 0)
		FROM works w
		LEFT JOIN authors a ON w.author_id=a.id
		LEFT JOIN editions e ON w.id=e.work_id
		LEFT JOIN work_genres wg ON w.id=wg.work_id
		LEFT JOIN genres g ON wg.genre_id=g.id
		WHERE w.total_ratings >= $2
		ORDER BY w.id, w.average_rating DESC NULLS LAST, w.total_ratings DESC
		LIMIT $1`, limit, minRatings)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var b models.Book
		var category string
		var avgRating float64
		var totalRatings int
		var author string
		if err := rows.Scan(&b.ID, &b.Title, &author, &b.CoverURL, &category, &avgRating, &totalRatings); err == nil {
			b.Category = category
			b.Source = "local"
			if author != "" && author != "Невідомий автор" {
				b.Authors = []string{author}
			} else {
				b.Authors = []string{}
			}
			books = append(books, b)
		}
	}
	if books == nil {
		return []models.Book{}, nil
	}
	return books, nil
}

func (r *BookRepository) scanSimpleBooks(rows pgx.Rows) ([]models.Book, error) {
	var books []models.Book
	for rows.Next() {
		var b models.Book
		var author, category string
		if err := rows.Scan(&b.ID, &b.Title, &author, &b.CoverURL, &category); err != nil {
			continue
		}
		b.Category = category
		b.Source = "local"
		if author != "" && author != "Невідомий автор" {
			b.Authors = []string{author}
		} else {
			b.Authors = []string{}
		}
		books = append(books, b)
	}
	if books == nil {
		return []models.Book{}, nil
	}
	return books, nil
}

// ─── АДМІН ────────────────────────────────────────────────────────────────────

type AdminCreateBookParams struct {
	Title       string
	Authors     []string
	Description string
	CoverURL    string
	PageCount   int
	Publisher   string
	PubDate     string
	ISBN        string
	Genres      []string
	Language    string
}

func (r *BookRepository) AdminDeleteWork(ctx context.Context, workID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM works WHERE id=$1::uuid`, workID)
	return err
}

func (r *BookRepository) AdminDeleteBook(ctx context.Context, workID string) error {
	return r.AdminDeleteWork(ctx, workID)
}

func (r *BookRepository) AdminDeleteThread(ctx context.Context, threadID string) {
	r.db.Exec(ctx, `DELETE FROM book_discussions WHERE id=$1::uuid`, threadID)
}

func (r *BookRepository) AdminGetPlatformStats(ctx context.Context) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	var count int

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM works`).Scan(&count)
	stats["total_books"] = count

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&count)
	stats["total_users"] = count

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM work_reviews`).Scan(&count)
	stats["total_reviews"] = count

	// groups — реальна назва таблиці (clubs — аліас у фронті)
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM groups`).Scan(&count)
	stats["total_clubs"] = count

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM user_editions`).Scan(&count)
	stats["total_shelf_items"] = count

	// Нові реєстрації за останні 30 днів
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days'`).Scan(&count)
	stats["new_users_30d"] = count

	// Активні читачі (оновлювали прогрес за тиждень)
	_ = r.db.QueryRow(ctx, `SELECT COUNT(DISTINCT user_id) FROM user_editions WHERE updated_at > NOW() - INTERVAL '7 days'`).Scan(&count)
	stats["active_readers_7d"] = count

	// Відгуки за останній місяць
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM work_reviews WHERE created_at > NOW() - INTERVAL '30 days'`).Scan(&count)
	stats["new_reviews_30d"] = count

	return stats, nil
}

// GetTopByYear — топ книг за поточний рік на основі оцінок
func (r *BookRepository) GetTopByYear(ctx context.Context, year int, limit int) ([]models.Book, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT ON (w.id)
			w.id::text, w.title,
			COALESCE(a.name,'Невідомий автор'),
			COALESCE(e.cover_url,''),
			COALESCE(g.name,''),
			COALESCE(w.average_rating, 0),
			COALESCE(w.total_ratings, 0)
		FROM works w
		LEFT JOIN authors a ON w.author_id=a.id
		LEFT JOIN editions e ON w.id=e.work_id
		LEFT JOIN work_genres wg ON w.id=wg.work_id
		LEFT JOIN genres g ON wg.genre_id=g.id
		WHERE w.total_ratings > 0
		  AND EXTRACT(YEAR FROM w.created_at) = $1
		ORDER BY w.id, w.average_rating DESC NULLS LAST, w.total_ratings DESC
		LIMIT $2`, year, limit)
	if err != nil {
		// Fallback: всі топові якщо немає за рік
		return r.GetTopRated(ctx, limit, 1)
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var b models.Book
		var author, category string
		var avgRating float64
		var totalRatings int
		if err := rows.Scan(&b.ID, &b.Title, &author, &b.CoverURL, &category, &avgRating, &totalRatings); err == nil {
			b.Category = category
			b.Source = "local"
			if author != "" && author != "Невідомий автор" {
				b.Authors = []string{author}
			} else {
				b.Authors = []string{}
			}
			books = append(books, b)
		}
	}
	if books == nil {
		return r.GetTopRated(ctx, limit, 1)
	}
	return books, nil
}

// SearchAuthors — пошук авторів для автокомпліту
func (r *BookRepository) SearchAuthors(ctx context.Context, query string) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT name FROM authors
		WHERE name ILIKE $1
		ORDER BY name LIMIT 20`, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var authors []string
	for rows.Next() {
		var s string
		if rows.Scan(&s) == nil {
			authors = append(authors, s)
		}
	}
	if authors == nil {
		return []string{}, nil
	}
	return authors, nil
}

// Для сумісності зі старим кодом
func (r *BookRepository) AddReviewOld(ctx context.Context, workID, userID string, rating int, comment string) error {
	return r.AddReview(ctx, workID, userID, rating, comment, false)
}

// Зберігає стрічку активності при оновленні полиці
func (r *BookRepository) TrackActivity(ctx context.Context, userID, workID, actType string) {
	r.db.Exec(ctx, `
		INSERT INTO activity_feed(actor_id, type, work_id)
		VALUES($1::uuid, $2, $3::uuid)
		ON CONFLICT DO NOTHING`, userID, actType, workID)
}

// Використовується у strings
var _ = strings.ToLower

func (r *BookRepository) UpdatePersonalRating(ctx context.Context, userID, workID string, rating int) error {
	// 1. Спочатку пробуємо ОНОВИТИ оцінку, якщо книга вже є на полиці
	res, err := r.db.Exec(ctx, `
		UPDATE user_editions 
		SET personal_rating = $1, 
		    updated_at = NOW() 
		WHERE user_id = $2::uuid AND work_id = $3::uuid`,
		rating, userID, workID)

	if err != nil {
		return fmt.Errorf("помилка UPDATE оцінки: %w", err)
	}

	// 2. Якщо rowsAffected == 0, значить запису в таблиці ще немає.
	// Тоді просто створюємо його зі статусом 'planned' (в планах)
	if res.RowsAffected() == 0 {
		_, err = r.db.Exec(ctx, `
			INSERT INTO user_editions (user_id, work_id, personal_rating, status, updated_at)
			VALUES ($1::uuid, $2::uuid, $3, 'planned', NOW())`,
			userID, workID, rating)

		if err != nil {
			return fmt.Errorf("помилка INSERT оцінки: %w", err)
		}
	}

	// 3. ПЕРЕРАХОВУЄМО СЕРЕДНІЙ РЕЙТИНГ КНИГИ (залишається без змін)
	_, err = r.db.Exec(ctx, `
		UPDATE works SET
			average_rating = COALESCE((SELECT AVG(personal_rating) FROM user_editions WHERE work_id=$1::uuid AND personal_rating > 0), 0),
			total_ratings  = COALESCE((SELECT COUNT(personal_rating) FROM user_editions WHERE work_id=$1::uuid AND personal_rating > 0), 0)
		WHERE id=$1::uuid`, workID)

	return err
}
func (r *BookRepository) DeleteReview(ctx context.Context, reviewID, userID string) error {
	// Видаляємо відгук, тільки якщо він належить цьому користувачу
	res, err := r.db.Exec(ctx, `DELETE FROM work_reviews WHERE id=$1::uuid AND user_id=$2::uuid`, reviewID, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return errors.New("відгук не знайдено, або у вас немає прав на його видалення")
	}
	return nil
}

func (r *BookRepository) UpdateReview(ctx context.Context, reviewID, userID, text string, hasSpoiler bool) error {
	res, err := r.db.Exec(ctx, `
		UPDATE work_reviews 
		SET review_text=$1, has_spoiler=$2, updated_at=NOW() 
		WHERE id=$3::uuid AND user_id=$4::uuid`,
		text, hasSpoiler, reviewID, userID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return errors.New("відгук не знайдено, або у вас немає прав на його редагування")
	}
	return nil
}

func (r *BookRepository) AdminCreateBook(ctx context.Context, p AdminCreateBookParams) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	authorName := "Невідомий автор"
	if len(p.Authors) > 0 && p.Authors[0] != "" {
		authorName = p.Authors[0]
	}

	var authorID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM authors WHERE name=$1 LIMIT 1`, authorName).Scan(&authorID)
	if err != nil {
		err = tx.QueryRow(ctx, `INSERT INTO authors(name) VALUES($1) RETURNING id::text`, authorName).Scan(&authorID)
		if err != nil {
			return "", fmt.Errorf("помилка автора: %v", err)
		}
	}

	var workID string
	err = tx.QueryRow(ctx, `
		INSERT INTO works(title, author_id, description)
		VALUES($1, $2::uuid, $3) RETURNING id::text`,
		p.Title, authorID, p.Description).Scan(&workID)
	if err != nil {
		return "", fmt.Errorf("помилка works: %v", err)
	}

	// Жанри
	for _, genre := range p.Genres {
		var genreID int
		err = tx.QueryRow(ctx, `SELECT id FROM genres WHERE name=$1 LIMIT 1`, genre).Scan(&genreID)
		if err != nil {
			err = tx.QueryRow(ctx, `INSERT INTO genres(name) VALUES($1) RETURNING id`, genre).Scan(&genreID)
			if err != nil {
				continue
			}
		}
		_, err = tx.Exec(ctx, `INSERT INTO work_genres(work_id,genre_id) VALUES($1::uuid,$2) ON CONFLICT DO NOTHING`, workID, genreID)
		if err != nil {
			return "", fmt.Errorf("помилка work_genres: %v", err)
		}
	}

	var langID *int
	if p.Language != "" {
		var id int
		if err := tx.QueryRow(ctx, `SELECT id FROM languages WHERE name=$1 OR code=$1 LIMIT 1`, p.Language).Scan(&id); err == nil {
			langID = &id
		}
	}

	pageCount := p.PageCount
	if pageCount <= 0 {
		pageCount = 1
	}

	var pubDate *string
	if p.PubDate != "" {
		pubDate = &p.PubDate
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO editions(work_id, cover_url, page_count, publisher, publication_date, language_id, is_primary)
		VALUES($1::uuid, $2, $3, $4, $5::date, $6, true)`,
		workID, p.CoverURL, pageCount, p.Publisher, pubDate, langID)
	if err != nil {
		return "", fmt.Errorf("помилка editions: %v", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("помилка транзакції: %v", err)
	}

	return workID, nil
}

func (r *BookRepository) AdminUpdateBook(ctx context.Context, workID string, p AdminCreateBookParams) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Оновлення основної таблиці works
	if p.Title != "" {
		_, err = tx.Exec(ctx, `UPDATE works SET title=$1, description=$2 WHERE id=$3::uuid`,
			p.Title, p.Description, workID)
		if err != nil {
			return fmt.Errorf("помилка оновлення works: %v", err)
		}
	}

	// 2. Оновлення/створення видання (UPSERT — якщо edition відсутнє, створюємо)
	var pubDate *string
	if p.PubDate != "" {
		pubDate = &p.PubDate
	}
	pageCount := p.PageCount
	if pageCount <= 0 {
		pageCount = 0 // null/unknown
	}

	res, err := tx.Exec(ctx, `
		UPDATE editions
		SET cover_url=$1, page_count=NULLIF($2,0), publisher=$3, publication_date=$4::date
		WHERE work_id=$5::uuid`,
		p.CoverURL, pageCount, p.Publisher, pubDate, workID)
	if err != nil {
		return fmt.Errorf("помилка оновлення editions: %v", err)
	}

	// Якщо edition не існує — створюємо
	if res.RowsAffected() == 0 {
		_, err = tx.Exec(ctx, `
			INSERT INTO editions(work_id, cover_url, page_count, publisher, publication_date, is_primary)
			VALUES($1::uuid, $2, NULLIF($3,0), $4, $5::date, true)`,
			workID, p.CoverURL, pageCount, p.Publisher, pubDate)
		if err != nil {
			return fmt.Errorf("помилка створення editions: %v", err)
		}
	}

	// 3. Оновлення автора
	if len(p.Authors) > 0 && p.Authors[0] != "" {
		authorName := p.Authors[0]
		var authorID string
		err = tx.QueryRow(ctx, `SELECT id::text FROM authors WHERE name=$1 LIMIT 1`, authorName).Scan(&authorID)
		if err != nil {
			err = tx.QueryRow(ctx, `INSERT INTO authors(name) VALUES($1) RETURNING id::text`, authorName).Scan(&authorID)
		}
		if err == nil {
			tx.Exec(ctx, `UPDATE works SET author_id=$1::uuid WHERE id=$2::uuid`, authorID, workID)
		}
	}

	// 4. Оновлення жанрів
	if len(p.Genres) > 0 {
		tx.Exec(ctx, `DELETE FROM work_genres WHERE work_id=$1::uuid`, workID)
		for _, genre := range p.Genres {
			if genre == "" {
				continue
			}
			var genreID int
			err = tx.QueryRow(ctx, `SELECT id FROM genres WHERE name=$1 LIMIT 1`, genre).Scan(&genreID)
			if err != nil {
				err = tx.QueryRow(ctx, `INSERT INTO genres(name) VALUES($1) RETURNING id`, genre).Scan(&genreID)
			}
			if err == nil {
				tx.Exec(ctx, `INSERT INTO work_genres(work_id,genre_id) VALUES($1::uuid,$2) ON CONFLICT DO NOTHING`, workID, genreID)
			}
		}
	}

	return tx.Commit(ctx)
}

// AdminListBooks — оптимізований запит для адмінки з пагінацією та сортуванням
func (r *BookRepository) AdminListBooks(ctx context.Context, page, limit int, sortField, sortOrder, search string) ([]models.Book, int, error) {
	offset := (page - 1) * limit

	// Захист від SQL-ін'єкцій (валідація полів)
	dbSortField := "w.created_at"
	switch sortField {
	case "title":
		dbSortField = "w.title"
	case "author":
		dbSortField = "a.name"
	}

	if sortOrder != "ASC" && sortOrder != "DESC" {
		sortOrder = "DESC"
	}

	// 1. Рахуємо загальну кількість (для пагінації)
	var totalCount int
	countQuery := "SELECT COUNT(DISTINCT w.id) FROM works w LEFT JOIN authors a ON w.author_id = a.id"
	var args []interface{}

	if search != "" {
		countQuery += " WHERE w.title ILIKE $1 OR a.name ILIKE $1"
		args = append(args, "%"+search+"%")
	}

	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&totalCount)
	if err != nil {
		return nil, 0, err
	}

	// 2. Отримуємо дані для конкретної сторінки
	query := fmt.Sprintf(`
		SELECT DISTINCT ON (%s, w.id)
			w.id::text, w.title,
			COALESCE(a.name, 'Невідомий автор'),
			COALESCE(e.cover_url, ''),
			COALESCE(g.name, '')
		FROM works w
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON w.id = e.work_id
		LEFT JOIN work_genres wg ON w.id = wg.work_id
		LEFT JOIN genres g ON wg.genre_id = g.id
	`, dbSortField)

	if search != "" {
		query += ` WHERE (w.title ILIKE $1 OR a.name ILIKE $1)`
	}

	query += fmt.Sprintf(` ORDER BY %s %s, w.id ASC LIMIT $%d OFFSET $%d`, dbSortField, sortOrder, len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var b models.Book
		var author, category string
		if err := rows.Scan(&b.ID, &b.Title, &author, &b.CoverURL, &category); err != nil {
			continue
		}
		b.Category = category
		b.Authors = []string{author}
		books = append(books, b)
	}
	if books == nil {
		books = []models.Book{}
	}
	return books, totalCount, nil
}

// AdminListReviews — дістає всі відгуки для адмінки
func (r *BookRepository) AdminListReviews(ctx context.Context, limit int) ([]models.Review, error) {
	query := `
		SELECT 
			r.id, 
			r.user_id, 
			COALESCE(u.username, 'Unknown') as username,
			COALESCE(r.rating, 0) as rating, 
			COALESCE(r.review_text, '') as review_text,
			r.created_at
		FROM work_reviews r
		LEFT JOIN users u ON r.user_id = u.id
		ORDER BY r.created_at DESC
		LIMIT $1`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []models.Review
	for rows.Next() {
		var rev models.Review
		var rating int
		err := rows.Scan(
			&rev.ID,
			&rev.UserID,
			&rev.Username,
			&rating,
			&rev.ReviewText,
			&rev.CreatedAt,
		)

		if err == nil {
			rev.Rating = &rating
			reviews = append(reviews, rev)
		}
	}

	if reviews == nil {
		reviews = []models.Review{}
	}

	return reviews, nil
}

// AdminListClubs — дістає всі клуби для адмінки
func (r *BookRepository) AdminListClubs(ctx context.Context, limit int) ([]map[string]interface{}, error) {
	query := `
		SELECT g.id, g.name, g.status, COALESCE(u.username, 'Unknown'), COUNT(gm.user_id)
		FROM groups g
		LEFT JOIN users u ON g.creator_id = u.id
		LEFT JOIN group_members gm ON g.id = gm.group_id
		GROUP BY g.id, u.username
		ORDER BY g.created_at DESC
		LIMIT $1`
	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clubs []map[string]interface{}
	for rows.Next() {
		var id, name, status, creator string
		var count int
		if err := rows.Scan(&id, &name, &status, &creator, &count); err == nil {
			clubs = append(clubs, map[string]interface{}{
				"id": id, "name": name, "status": status, "creator": creator, "members_count": count,
			})
		}
	}
	return clubs, nil
}

// AdminForceDeleteClub — видалення клубу адміністратором
func (r *BookRepository) AdminForceDeleteClub(ctx context.Context, clubID string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM groups WHERE id = $1::uuid", clubID)
	return err
}
