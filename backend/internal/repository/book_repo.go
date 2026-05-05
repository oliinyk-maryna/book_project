package repository

import (
	"context"
	"errors"
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
		query += ` ORDER BY w.id, e.publication_date DESC NULLS LAST`
	case "popular":
		query += ` ORDER BY w.id, w.total_ratings DESC, w.average_rating DESC`
	case "rating":
		query += ` ORDER BY w.id, w.average_rating DESC NULLS LAST`
	case "random":
		query += ` ORDER BY w.id, RANDOM()`
	case "pages_asc":
		query += ` ORDER BY w.id, e.page_count ASC NULLS LAST`
	case "pages_desc":
		query += ` ORDER BY w.id, e.page_count DESC NULLS LAST`
	default:
		query += ` ORDER BY w.id, w.created_at DESC`
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
		SELECT DISTINCT ON (w.id)
			w.id::text, w.title,
			COALESCE(a.name, 'Невідомий автор'),
			COALESCE(e.cover_url, ''),
			COALESCE(g.name, ''),
			COALESCE(w.description, ''),
			COALESCE(e.page_count, 0),
			COALESCE(e.publisher, ''),
			COALESCE(e.publication_date::text, ''),
			COALESCE(w.average_rating, 0),
			COALESCE(w.total_ratings, 0)
		FROM works w
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON w.id = e.work_id
		LEFT JOIN work_genres wg ON w.id = wg.work_id
		LEFT JOIN genres g ON wg.genre_id = g.id
		WHERE w.id = $1`

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

	// Статус користувача
	if userID != "" {
		var status string
		var currentPage, totalPages int
		err := r.db.QueryRow(ctx, `
			SELECT ue.status::text, ue.current_page, ue.total_pages
			FROM user_editions ue
			JOIN editions e ON ue.edition_id = e.id
			WHERE ue.user_id = $1::uuid AND e.work_id = $2
			LIMIT 1`, userID, parsedID,
		).Scan(&status, &currentPage, &totalPages)
		if err == nil {
			b.UserStatus = status
			b.CurrentPage = currentPage
			b.TotalPages = totalPages
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
		SELECT br.id::text, br.user_id::text, u.username,
			COALESCE(u.avatar_url::text, ''),
			br.rating,
			COALESCE(br.review_text, ''),
			COALESCE(br.has_spoiler, false),
			COALESCE((SELECT COUNT(*) FROM review_likes WHERE review_id=br.id), 0),
			br.created_at
		FROM book_reviews br
		JOIN users u ON br.user_id = u.id
		WHERE br.work_id = $1::uuid
		ORDER BY br.created_at DESC
		LIMIT 50`, workID)
	if err != nil {
		return []models.WorkReview{}, nil
	}
	defer rows.Close()

	var reviews []models.WorkReview
	for rows.Next() {
		var rev models.WorkReview
		if err := rows.Scan(
			&rev.ID, &rev.UserID, &rev.UserName, &rev.AvatarURL,
			&rev.Rating, &rev.ReviewText, &rev.HasSpoiler, &rev.LikesCount, &rev.CreatedAt,
		); err == nil {
			reviews = append(reviews, rev)
		}
	}
	if reviews == nil {
		return []models.WorkReview{}, nil
	}
	return reviews, nil
}

func (r *BookRepository) AddReview(ctx context.Context, workID, userID string, rating int, comment string, hasSpoiler bool) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO book_reviews (work_id, user_id, rating, review_text, has_spoiler)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5)
		ON CONFLICT (work_id, user_id) DO UPDATE
		SET rating=$3, review_text=$4, has_spoiler=$5, updated_at=NOW()`,
		workID, userID, rating, comment, hasSpoiler)
	if err != nil {
		return err
	}
	// Перераховуємо середній рейтинг
	r.db.Exec(ctx, `
		UPDATE works SET
			average_rating = (SELECT AVG(rating) FROM book_reviews WHERE work_id=$1::uuid),
			total_ratings  = (SELECT COUNT(*) FROM book_reviews WHERE work_id=$1::uuid)
		WHERE id=$1::uuid`, workID)
	return nil
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
func (r *BookRepository) SaveReadingSession(ctx context.Context, userID, workID string, duration, pagesRead int) error {
	return r.SaveReadingSessionFull(ctx, userID, workID, duration, pagesRead, 0, 0)
}

func (r *BookRepository) SaveReadingSessionFull(ctx context.Context, userID, workID string, duration, pagesRead, startPage, endPage int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO reading_sessions(user_id, work_id, duration_seconds, pages_read, start_page, end_page)
		VALUES($1::uuid, $2::uuid, $3, $4, $5, $6)`,
		userID, workID, duration, pagesRead, startPage, endPage)
	if err != nil {
		return err
	}

	// Оновлюємо current_page якщо endPage > 0
	if endPage > 0 {
		r.db.Exec(ctx, `
			UPDATE user_editions SET current_page=$1, updated_at=NOW()
			WHERE user_id=$2::uuid AND edition_id=(
				SELECT id FROM editions WHERE work_id=$3::uuid LIMIT 1
			) AND current_page < $1`, endPage, userID, workID)
	} else if pagesRead > 0 {
		r.db.Exec(ctx, `
			UPDATE user_editions
			SET current_page = LEAST(total_pages, COALESCE(current_page,0) + $1), updated_at=NOW()
			WHERE user_id=$2::uuid AND edition_id=(
				SELECT id FROM editions WHERE work_id=$3::uuid LIMIT 1
			)`, pagesRead, userID, workID)
	}
	return nil
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
	if err := tx.QueryRow(ctx, `SELECT id::text FROM authors WHERE name=$1 LIMIT 1`, authorName).Scan(&authorID); err != nil {
		if err := tx.QueryRow(ctx, `INSERT INTO authors(name) VALUES($1) RETURNING id::text`, authorName).Scan(&authorID); err != nil {
			return "", err
		}
	}

	var workID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO works(title, author_id, description)
		VALUES($1, $2::uuid, $3) RETURNING id::text`,
		p.Title, authorID, p.Description).Scan(&workID); err != nil {
		return "", err
	}

	// Жанри
	for _, genre := range p.Genres {
		var genreID int
		if err := tx.QueryRow(ctx, `SELECT id FROM genres WHERE name=$1 LIMIT 1`, genre).Scan(&genreID); err != nil {
			if err := tx.QueryRow(ctx, `INSERT INTO genres(name) VALUES($1) RETURNING id`, genre).Scan(&genreID); err != nil {
				continue
			}
		}
		tx.Exec(ctx, `INSERT INTO work_genres(work_id,genre_id) VALUES($1::uuid,$2) ON CONFLICT DO NOTHING`, workID, genreID)
	}

	// Мова
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

	tx.Exec(ctx, `
		INSERT INTO editions(work_id, cover_url, page_count, publisher, publication_date, language_id, is_primary)
		VALUES($1::uuid, $2, $3, $4, $5::date, $6, true)`,
		workID, p.CoverURL, pageCount, p.Publisher, pubDate, langID)

	return workID, tx.Commit(ctx)
}

func (r *BookRepository) AdminUpdateBook(ctx context.Context, workID string, title, description, coverURL *string, pageCount *int, publisher *string) error {
	if title != nil {
		r.db.Exec(ctx, `UPDATE works SET title=$1 WHERE id=$2::uuid`, *title, workID)
	}
	if description != nil {
		r.db.Exec(ctx, `UPDATE works SET description=$1 WHERE id=$2::uuid`, *description, workID)
	}
	if coverURL != nil {
		r.db.Exec(ctx, `UPDATE editions SET cover_url=$1 WHERE work_id=$2::uuid`, *coverURL, workID)
	}
	if pageCount != nil {
		r.db.Exec(ctx, `UPDATE editions SET page_count=$1 WHERE work_id=$2::uuid`, *pageCount, workID)
	}
	if publisher != nil {
		r.db.Exec(ctx, `UPDATE editions SET publisher=$1 WHERE work_id=$2::uuid`, *publisher, workID)
	}
	return nil
}

func (r *BookRepository) AdminDeleteWork(ctx context.Context, workID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM works WHERE id=$1::uuid`, workID)
	return err
}

func (r *BookRepository) AdminDeleteBook(ctx context.Context, workID string) error {
	return r.AdminDeleteWork(ctx, workID)
}

func (r *BookRepository) AdminDeleteReview(ctx context.Context, reviewID string) {
	r.db.Exec(ctx, `DELETE FROM book_reviews WHERE id=$1::uuid`, reviewID)
}

func (r *BookRepository) AdminDeleteThread(ctx context.Context, threadID string) {
	r.db.Exec(ctx, `DELETE FROM book_discussions WHERE id=$1::uuid`, threadID)
}

func (r *BookRepository) AdminGetPlatformStats(ctx context.Context) (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	var count int // Тимчасова змінна

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM works`).Scan(&count)
	stats["total_books"] = count

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&count)
	stats["total_users"] = count

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM work_reviews`).Scan(&count)
	stats["total_reviews"] = count

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM clubs`).Scan(&count)
	stats["total_clubs"] = count

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM user_books`).Scan(&count)
	stats["total_shelf_items"] = count

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
