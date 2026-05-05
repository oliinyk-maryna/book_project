package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DiscussionRepository struct {
	db *pgxpool.Pool
}

func NewDiscussionRepository(db *pgxpool.Pool) *DiscussionRepository {
	return &DiscussionRepository{db: db}
}

type Discussion struct {
	ID           string    `json:"id"`
	WorkID       string    `json:"work_id"`
	UserID       string    `json:"user_id"`
	Username     string    `json:"username"`
	AvatarURL    string    `json:"avatar_url,omitempty"`
	Title        string    `json:"title"`
	Body         string    `json:"body"`
	HasSpoiler   bool      `json:"has_spoiler"`
	ViewsCount   int       `json:"views_count"`
	RepliesCount int       `json:"replies_count"`
	Replies      []Reply   `json:"replies,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

type Reply struct {
	ID           string    `json:"id"`
	DiscussionID string    `json:"discussion_id"`
	UserID       string    `json:"user_id"`
	Username     string    `json:"username"`
	AvatarURL    string    `json:"avatar_url,omitempty"`
	Body         string    `json:"body"`
	HasSpoiler   bool      `json:"has_spoiler"`
	ReplyToID    *string   `json:"reply_to_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

func (r *DiscussionRepository) GetByWorkID(ctx context.Context, workID string) ([]Discussion, error) {
	rows, err := r.db.Query(ctx, `
		SELECT d.id::text, d.work_id::text, d.user_id::text,
			u.username, COALESCE(u.avatar_url::text,''),
			d.title, d.body, d.has_spoiler, d.views_count, d.replies_count, d.created_at
		FROM book_discussions d
		JOIN users u ON d.user_id = u.id
		WHERE d.work_id = $1::uuid
		ORDER BY d.created_at DESC`, workID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Discussion
	for rows.Next() {
		var d Discussion
		if err := rows.Scan(
			&d.ID, &d.WorkID, &d.UserID, &d.Username, &d.AvatarURL,
			&d.Title, &d.Body, &d.HasSpoiler, &d.ViewsCount, &d.RepliesCount, &d.CreatedAt,
		); err != nil {
			continue
		}
		items = append(items, d)
	}
	if items == nil {
		items = []Discussion{}
	}
	return items, nil
}

func (r *DiscussionRepository) Create(ctx context.Context, workID, userID, title, body string, hasSpoiler bool) (*Discussion, error) {
	var d Discussion
	err := r.db.QueryRow(ctx, `
		INSERT INTO book_discussions(work_id, user_id, title, body, has_spoiler)
		VALUES($1::uuid, $2::uuid, $3, $4, $5)
		RETURNING id::text, work_id::text, user_id::text, title, body, has_spoiler, views_count, replies_count, created_at`,
		workID, userID, title, body, hasSpoiler,
	).Scan(&d.ID, &d.WorkID, &d.UserID, &d.Title, &d.Body, &d.HasSpoiler, &d.ViewsCount, &d.RepliesCount, &d.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Підтягуємо username
	r.db.QueryRow(ctx, `SELECT username FROM users WHERE id = $1::uuid`, userID).Scan(&d.Username)
	return &d, nil
}

func (r *DiscussionRepository) GetByID(ctx context.Context, id string) (*Discussion, error) {
	var d Discussion
	err := r.db.QueryRow(ctx, `
		SELECT d.id::text, d.work_id::text, d.user_id::text,
			u.username, COALESCE(u.avatar_url::text,''),
			d.title, d.body, d.has_spoiler, d.views_count, d.replies_count, d.created_at
		FROM book_discussions d
		JOIN users u ON d.user_id = u.id
		WHERE d.id = $1::uuid`, id,
	).Scan(&d.ID, &d.WorkID, &d.UserID, &d.Username, &d.AvatarURL,
		&d.Title, &d.Body, &d.HasSpoiler, &d.ViewsCount, &d.RepliesCount, &d.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("не знайдено")
		}
		return nil, err
	}
	return &d, nil
}

func (r *DiscussionRepository) GetWithReplies(ctx context.Context, id string) (*Discussion, error) {
	d, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(ctx, `
		SELECT rp.id::text, rp.discussion_id::text, rp.user_id::text,
			u.username, COALESCE(u.avatar_url::text,''),
			rp.body, rp.has_spoiler,
			rp.reply_to_id::text,
			rp.created_at
		FROM discussion_replies rp
		JOIN users u ON rp.user_id = u.id
		WHERE rp.discussion_id = $1::uuid
		ORDER BY rp.created_at ASC`, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var rp Reply
			var replyToID *string
			if err := rows.Scan(
				&rp.ID, &rp.DiscussionID, &rp.UserID, &rp.Username, &rp.AvatarURL,
				&rp.Body, &rp.HasSpoiler, &replyToID, &rp.CreatedAt,
			); err == nil {
				rp.ReplyToID = replyToID
				d.Replies = append(d.Replies, rp)
			}
		}
	}
	if d.Replies == nil {
		d.Replies = []Reply{}
	}
	return d, nil
}

func (r *DiscussionRepository) AddReply(ctx context.Context, discID, userID, body string, hasSpoiler bool, replyToID string) (*Reply, error) {
	var rp Reply
	var replyUUID *uuid.UUID
	if replyToID != "" {
		id, err := uuid.Parse(replyToID)
		if err == nil {
			replyUUID = &id
		}
	}

	err := r.db.QueryRow(ctx, `
		INSERT INTO discussion_replies(discussion_id, user_id, body, has_spoiler, reply_to_id)
		VALUES($1::uuid, $2::uuid, $3, $4, $5)
		RETURNING id::text, discussion_id::text, user_id::text, body, has_spoiler, created_at`,
		discID, userID, body, hasSpoiler, replyUUID,
	).Scan(&rp.ID, &rp.DiscussionID, &rp.UserID, &rp.Body, &rp.HasSpoiler, &rp.CreatedAt)
	if err != nil {
		return nil, err
	}

	r.db.QueryRow(ctx, `SELECT username, COALESCE(avatar_url::text,'') FROM users WHERE id=$1::uuid`, userID).
		Scan(&rp.Username, &rp.AvatarURL)

	return &rp, nil
}

func (r *DiscussionRepository) IncrementViews(ctx context.Context, id string) {
	r.db.Exec(ctx, `UPDATE book_discussions SET views_count = views_count+1 WHERE id=$1::uuid`, id)
}
