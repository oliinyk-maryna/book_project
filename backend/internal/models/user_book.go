package models

import (
	"time"

	"github.com/google/uuid"
)

type UserBook struct {
	ID             uuid.UUID `json:"id" db:"id"`
	UserID         uuid.UUID `json:"user_id" db:"user_id"`
	BookID         uuid.UUID `json:"book_id" db:"book_id"`
	Status         string    `json:"status" db:"status"` // 'planned', 'reading', 'read'
	CurrentPage    int       `json:"current_page" db:"current_page"`
	TotalPages     int       `json:"total_pages" db:"total_pages"`
	PersonalRating *float64  `json:"personal_rating,omitempty" db:"personal_rating"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}
