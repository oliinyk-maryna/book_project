package repository

import (
	"context"

	"book_project/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationRepository struct {
	db *pgxpool.Pool
}

func NewNotificationRepository(db *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(ctx context.Context, userID, notifType, title, body string, entityID *uuid.UUID, entityType string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO notifications (user_id, type, title, body, entity_id, entity_type)
		VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
		userID, notifType, title, body, entityID, entityType,
	)
	return err
}

func (r *NotificationRepository) GetByUser(ctx context.Context, userID string, limit int) (*models.NotificationSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, type, COALESCE(title,''), COALESCE(body,''),
			entity_id, COALESCE(entity_type,''), is_read, created_at
		FROM notifications
		WHERE user_id = $1::uuid
		ORDER BY created_at DESC LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []models.Notification
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(
			&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body,
			&n.EntityID, &n.EntityType, &n.IsRead, &n.CreatedAt,
		); err != nil {
			continue
		}
		notifs = append(notifs, n)
	}
	if notifs == nil {
		notifs = []models.Notification{}
	}

	var unread int
	// Додано обробку помилки під час отримання кількості непрочитаних
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM notifications 
		WHERE user_id = $1::uuid AND is_read = false`,
		userID,
	).Scan(&unread)

	if err != nil {
		// Якщо не вдалося отримати count, логуємо помилку або просто повертаємо 0 (залишаємо default value)
		unread = 0
	}

	return &models.NotificationSummary{
		UnreadCount:   unread,
		Notifications: notifs,
	}, nil
}

func (r *NotificationRepository) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE notifications 
		SET is_read = true 
		WHERE user_id = $1::uuid AND is_read = false`,
		userID,
	)
	return err
}

func (r *NotificationRepository) MarkRead(ctx context.Context, notifID, userID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE notifications 
		SET is_read = true 
		WHERE id = $1::uuid AND user_id = $2::uuid`,
		notifID, userID,
	)
	return err
}
