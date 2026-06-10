package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	SenderID     uuid.UUID  `json:"sender_id"`     // Хто підписався
	SenderName   string     `json:"sender_name"`   // Ім'я того, хто підписався
	SenderAvatar string     `json:"sender_avatar"` // Аватар того, хто підписався
	Type         string     `json:"type"`          // "follow"
	Title        string     `json:"title"`
	Body         string     `json:"body"`
	EntityID     *uuid.UUID `json:"entity_id,omitempty"`
	EntityType   string     `json:"entity_type,omitempty"`
	IsRead       bool       `json:"is_read"`
	CreatedAt    time.Time  `json:"created_at"`
	Status       string     `json:"status"`

	// Додаткове поле для фронтенду
	IsFollowingBack bool `json:"is_following_back" gorm:"-"` // gorm:"-" означає, що в БД цього поля немає
}

type NotificationSummary struct {
	UnreadCount   int            `json:"unread_count"`
	Notifications []Notification `json:"notifications"`
}
