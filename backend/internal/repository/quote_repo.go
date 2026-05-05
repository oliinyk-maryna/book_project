package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type QuoteRepository struct {
	db *pgxpool.Pool
}

func NewQuoteRepository(db *pgxpool.Pool) *QuoteRepository {
	return &QuoteRepository{db: db}
}

type Quote struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username,omitempty"`
	WorkID    string    `json:"work_id,omitempty"`
	BookTitle string    `json:"book_title,omitempty"`
	Text      string    `json:"text"`
	PageRef   *int      `json:"page_ref,omitempty"`
	IsPublic  bool      `json:"is_public"`
	CreatedAt time.Time `json:"created_at"`
}

func (r *QuoteRepository) GetByUser(ctx context.Context, userID string) ([]Quote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT q.id::text, q.user_id::text, u.username,
			q.work_id::text, COALESCE(w.title,''),
			q.text, q.page_ref, q.is_public, q.created_at
		FROM book_quotes q
		JOIN users u ON q.user_id = u.id
		LEFT JOIN works w ON q.work_id = w.id
		WHERE q.user_id = $1::uuid
		ORDER BY q.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quotes []Quote
	for rows.Next() {
		var q Quote
		if err := rows.Scan(
			&q.ID, &q.UserID, &q.Username,
			&q.WorkID, &q.BookTitle,
			&q.Text, &q.PageRef, &q.IsPublic, &q.CreatedAt,
		); err == nil {
			quotes = append(quotes, q)
		}
	}
	if quotes == nil {
		quotes = []Quote{}
	}
	return quotes, nil
}

func (r *QuoteRepository) GetByWork(ctx context.Context, workID string) ([]Quote, error) {
	rows, err := r.db.Query(ctx, `
		SELECT q.id::text, q.user_id::text, u.username,
			q.work_id::text, COALESCE(w.title,''),
			q.text, q.page_ref, q.is_public, q.created_at
		FROM book_quotes q
		JOIN users u ON q.user_id = u.id
		LEFT JOIN works w ON q.work_id = w.id
		WHERE q.work_id = $1::uuid AND q.is_public = true
		ORDER BY q.created_at DESC
		LIMIT 50`, workID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var quotes []Quote
	for rows.Next() {
		var q Quote
		if err := rows.Scan(
			&q.ID, &q.UserID, &q.Username,
			&q.WorkID, &q.BookTitle,
			&q.Text, &q.PageRef, &q.IsPublic, &q.CreatedAt,
		); err == nil {
			quotes = append(quotes, q)
		}
	}
	if quotes == nil {
		quotes = []Quote{}
	}
	return quotes, nil
}

func (r *QuoteRepository) Create(ctx context.Context, userID, workID, text string, pageRef *int, isPublic bool) (*Quote, error) {
	var q Quote
	var workUUID *string
	if workID != "" {
		workUUID = &workID
	}

	err := r.db.QueryRow(ctx, `
		INSERT INTO book_quotes(user_id, work_id, text, page_ref, is_public)
		VALUES($1::uuid, $2::uuid, $3, $4, $5)
		RETURNING id::text, user_id::text, work_id::text, text, page_ref, is_public, created_at`,
		userID, workUUID, text, pageRef, isPublic,
	).Scan(&q.ID, &q.UserID, &q.WorkID, &q.Text, &q.PageRef, &q.IsPublic, &q.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &q, nil
}

func (r *QuoteRepository) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM book_quotes WHERE id=$1::uuid AND user_id=$2::uuid`,
		id, userID)
	return err
}
