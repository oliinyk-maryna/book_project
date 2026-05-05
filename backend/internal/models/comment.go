package models

import (
	"time"

	"github.com/google/uuid"
)

type GroupComment struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	GroupID    uuid.UUID  `json:"group_id" db:"group_id"`
	UserID     uuid.UUID  `json:"user_id" db:"user_id"`
	Username   string     `json:"username,omitempty" db:"-"` // <-- ДОДАЙ ЦЕЙ РЯДОК
	BookID     *uuid.UUID `json:"book_id,omitempty" db:"book_id"`
	Content    string     `json:"content" db:"content"`
	PageNumber *int       `json:"page_number,omitempty" db:"page_number"`
	IsSpoiler  bool       `json:"is_spoiler" db:"is_spoiler"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
}
