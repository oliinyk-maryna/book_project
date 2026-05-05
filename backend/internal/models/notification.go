package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"user_id"`
	Type       string    `json:"type"`
	Title      string    `json:"title"`
	Body       string    `json:"body"`
	EntityID   *uuid.UUID `json:"entity_id,omitempty"`
	EntityType string    `json:"entity_type,omitempty"`
	IsRead     bool      `json:"is_read"`
	CreatedAt  time.Time `json:"created_at"`
}

type NotificationSummary struct {
	UnreadCount   int            `json:"unread_count"`
	Notifications []Notification `json:"notifications"`
}