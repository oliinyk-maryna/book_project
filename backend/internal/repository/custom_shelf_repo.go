package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type CustomShelfRepository struct {
	db *pgxpool.Pool
}

func NewCustomShelfRepository(db *pgxpool.Pool) *CustomShelfRepository {
	return &CustomShelfRepository{db: db}
}

type CustomShelf struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	IsPublic    bool      `json:"is_public"`
	BooksCount  int       `json:"books_count"`
	CreatedAt   time.Time `json:"created_at"`
}

func (r *CustomShelfRepository) GetByUser(ctx context.Context, userID string) ([]CustomShelf, error) {
	rows, err := r.db.Query(ctx, `
		SELECT s.id::text, s.user_id::text, s.name,
			COALESCE(s.description,''), s.is_public,
			(SELECT COUNT(*) FROM custom_shelf_books WHERE shelf_id=s.id) AS books_count,
			s.created_at
		FROM custom_shelves s
		WHERE s.user_id=$1::uuid
		ORDER BY s.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shelves []CustomShelf
	for rows.Next() {
		var s CustomShelf
		if err := rows.Scan(&s.ID, &s.UserID, &s.Name, &s.Description, &s.IsPublic, &s.BooksCount, &s.CreatedAt); err == nil {
			shelves = append(shelves, s)
		}
	}
	if shelves == nil {
		shelves = []CustomShelf{}
	}
	return shelves, nil
}

func (r *CustomShelfRepository) Create(ctx context.Context, userID, name, description string, isPublic bool) (*CustomShelf, error) {
	var s CustomShelf
	err := r.db.QueryRow(ctx, `
		INSERT INTO custom_shelves(user_id, name, description, is_public)
		VALUES($1::uuid, $2, $3, $4)
		RETURNING id::text, user_id::text, name, COALESCE(description,''), is_public, created_at`,
		userID, name, description, isPublic,
	).Scan(&s.ID, &s.UserID, &s.Name, &s.Description, &s.IsPublic, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	s.BooksCount = 0
	return &s, nil
}

func (r *CustomShelfRepository) Delete(ctx context.Context, shelfID, userID string) {
	r.db.Exec(ctx, `DELETE FROM custom_shelves WHERE id=$1::uuid AND user_id=$2::uuid`, shelfID, userID)
}

// AddBook — додає книгу (work) через пошук edition
func (r *CustomShelfRepository) AddBook(ctx context.Context, shelfID, userID, workID string) error {
	// Перевіряємо що полиця належить юзеру
	var ownerID string
	if err := r.db.QueryRow(ctx, `SELECT user_id::text FROM custom_shelves WHERE id=$1::uuid`, shelfID).Scan(&ownerID); err != nil || ownerID != userID {
		return nil
	}

	var editionID string
	if err := r.db.QueryRow(ctx, `SELECT id::text FROM editions WHERE work_id=$1::uuid LIMIT 1`, workID).Scan(&editionID); err != nil {
		return err
	}

	_, err := r.db.Exec(ctx,
		`INSERT INTO custom_shelf_books(shelf_id, edition_id) VALUES($1::uuid,$2::uuid) ON CONFLICT DO NOTHING`,
		shelfID, editionID)
	return err
}

func (r *CustomShelfRepository) RemoveBook(ctx context.Context, shelfID, userID, workID string) {
	var editionID string
	if err := r.db.QueryRow(ctx, `SELECT id::text FROM editions WHERE work_id=$1::uuid LIMIT 1`, workID).Scan(&editionID); err != nil {
		return
	}
	r.db.Exec(ctx, `
		DELETE FROM custom_shelf_books csb
		USING custom_shelves cs
		WHERE csb.shelf_id=cs.id AND cs.user_id=$1::uuid AND csb.shelf_id=$2::uuid AND csb.edition_id=$3::uuid`,
		userID, shelfID, editionID)
}
