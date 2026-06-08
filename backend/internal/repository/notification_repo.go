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
	// Оновлений SQL-запит із JOIN-ами для отримання назви книги та статусу інвайту
	rows, err := r.db.Query(ctx, `
        SELECT 
            n.id, 
            n.user_id, 
            n.type, 
            COALESCE(n.title,''), 
            CASE 
                WHEN n.type IN ('INVITE_CLUB', 'club_invite') AND w.title IS NOT NULL 
                THEN COALESCE(n.body,'') || ' (Книга: «' || w.title || '»)'
                ELSE COALESCE(n.body,'')
            END as body,
            n.entity_id, 
            COALESCE(n.entity_type,''), 
            n.is_read, 
            n.created_at,
            -- Повертаємо статус інвайту
            COALESCE(ci.status, '') as invite_status
        FROM notifications n
        -- ПОКРАЩЕНИЙ JOIN: шукаємо інвайт або за його власним ID, або за ID клубу + ID юзера
        LEFT JOIN club_invites ci ON 
            (n.entity_id = ci.id OR (ci.club_id = n.entity_id AND ci.invited_user_id = n.user_id))
            AND n.type IN ('INVITE_CLUB', 'club_invite')
        -- Клуб шукаємо або через знайдене запрошення, або напряму через entity_id сповіщення
        LEFT JOIN groups g ON g.id = COALESCE(ci.club_id, n.entity_id)
        LEFT JOIN works w ON g.work_id = w.id
        WHERE n.user_id = $1::uuid
        ORDER BY n.created_at DESC 
        LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []models.Notification
	for rows.Next() {
		var n models.Notification
		// Додано &n.Status в кінці для зчитування invite_status
		if err := rows.Scan(
			&n.ID, &n.UserID, &n.Type, &n.Title, &n.Body,
			&n.EntityID, &n.EntityType, &n.IsRead, &n.CreatedAt,
			&n.Status, // <--- ЗЧИТУЄМО СТАТУС СЮДИ
		); err != nil {
			continue
		}
		notifs = append(notifs, n)
	}
	if notifs == nil {
		notifs = []models.Notification{}
	}

	var unread int
	err = r.db.QueryRow(ctx, `
        SELECT COUNT(*) 
        FROM notifications 
        WHERE user_id = $1::uuid AND is_read = false`,
		userID,
	).Scan(&unread)

	if err != nil {
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
