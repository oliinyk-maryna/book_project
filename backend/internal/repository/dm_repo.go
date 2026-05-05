package repository

import (
	"context"
	"errors"

	"book_project/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DMRepository struct {
	db *pgxpool.Pool
}

func NewDMRepository(db *pgxpool.Pool) *DMRepository {
	return &DMRepository{db: db}
}

// StartOrGetConversation returns existing or creates new 1-on-1 conversation.
func (r *DMRepository) StartOrGetConversation(ctx context.Context, userA, userB string) (string, error) {
	var convID string
	err := r.db.QueryRow(ctx, `
		SELECT id::text FROM conversations
		WHERE (user1_id = $1::uuid AND user2_id = $2::uuid)
		   OR (user1_id = $2::uuid AND user2_id = $1::uuid)
		LIMIT 1`, userA, userB,
	).Scan(&convID)

	if errors.Is(err, pgx.ErrNoRows) {
		if err := r.db.QueryRow(ctx, `
			INSERT INTO conversations (user1_id, user2_id)
			VALUES ($1::uuid, $2::uuid) RETURNING id::text`, userA, userB,
		).Scan(&convID); err != nil {
			return "", err
		}
		// Add both participants
		r.db.Exec(ctx, `
			INSERT INTO conversation_participants VALUES ($1::uuid, $2::uuid), ($1::uuid, $3::uuid)
			ON CONFLICT DO NOTHING`, convID, userA, userB)
	} else if err != nil {
		return "", err
	}

	return convID, nil
}

func (r *DMRepository) GetConversations(ctx context.Context, userID string) ([]models.Conversation, error) {
	rows, err := r.db.Query(ctx, `
		SELECT c.id,
			CASE WHEN c.user1_id = $1::uuid THEN c.user2_id ELSE c.user1_id END AS other_id,
			CASE WHEN c.user1_id = $1::uuid
				THEN (SELECT username FROM users WHERE id = c.user2_id)
				ELSE (SELECT username FROM users WHERE id = c.user1_id) END AS other_name,
			CASE WHEN c.user1_id = $1::uuid
				THEN COALESCE((SELECT avatar_url::text FROM users WHERE id = c.user2_id),'')
				ELSE COALESCE((SELECT avatar_url::text FROM users WHERE id = c.user1_id),'') END AS other_avatar,
			(SELECT content FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) AS last_msg,
			(SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation_id = c.id AND cm.user_id != $1::uuid AND cm.is_deleted = false) AS unread,
			c.updated_at
		FROM conversations c
		WHERE c.user1_id = $1::uuid OR c.user2_id = $1::uuid
		ORDER BY c.updated_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var convs []models.Conversation
	for rows.Next() {
		var c models.Conversation
		var otherID uuid.UUID
		var otherName, otherAvatar string
		var lastMsg *string
		if err := rows.Scan(&c.ID, &otherID, &otherName, &otherAvatar, &lastMsg, &c.UnreadCount, &c.UpdatedAt); err != nil {
			continue
		}
		c.OtherUser = &models.UserProfile{ID: otherID, Username: otherName, AvatarURL: &otherAvatar}
		if lastMsg != nil {
			c.LastMessage = *lastMsg
		}
		convs = append(convs, c)
	}
	if convs == nil {
		convs = []models.Conversation{}
	}
	return convs, nil
}

func (r *DMRepository) GetMessages(ctx context.Context, convID, userID string, limit int) ([]models.DirectMessage, error) {
	// Verify user is a participant
	var exists bool
	r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM conversations WHERE id=$1::uuid AND (user1_id=$2::uuid OR user2_id=$2::uuid))`,
		convID, userID,
	).Scan(&exists)
	if !exists {
		return nil, errors.New("доступ заборонено")
	}

	rows, err := r.db.Query(ctx, `
		SELECT cm.id, cm.conversation_id, cm.user_id,
			COALESCE(u.username,'') AS sender_name,
			cm.content, false AS is_read, cm.created_at
		FROM chat_messages cm
		JOIN users u ON cm.user_id = u.id
		WHERE cm.conversation_id = $1::uuid AND cm.is_deleted = false
		ORDER BY cm.created_at DESC
		LIMIT $2`, convID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.DirectMessage
	for rows.Next() {
		var m models.DirectMessage
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.SenderName, &m.Content, &m.IsRead, &m.CreatedAt); err != nil {
			continue
		}
		msgs = append(msgs, m)
	}
	if msgs == nil {
		msgs = []models.DirectMessage{}
	}
	return msgs, nil
}

func (r *DMRepository) SendMessage(ctx context.Context, convID, senderID, content string) (*models.DirectMessage, error) {
	var exists bool
	r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM conversations WHERE id=$1::uuid AND (user1_id=$2::uuid OR user2_id=$2::uuid))`,
		convID, senderID,
	).Scan(&exists)
	if !exists {
		return nil, errors.New("доступ заборонено")
	}

	var m models.DirectMessage
	err := r.db.QueryRow(ctx, `
		INSERT INTO chat_messages (conversation_id, user_id, content, type)
		VALUES ($1::uuid, $2::uuid, $3, 'text')
		RETURNING id, conversation_id, user_id, content, false, created_at`,
		convID, senderID, content,
	).Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.IsRead, &m.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Update conversation timestamp
	r.db.Exec(ctx, `UPDATE conversations SET updated_at=NOW() WHERE id=$1::uuid`, convID)

	return &m, nil
}
