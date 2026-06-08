package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role,omitempty"`
	AvatarURL    *string   `json:"avatar_url,omitempty"`
	Bio          *string   `json:"bio,omitempty"`

	// ДОДАНІ ПОЛЯ:
	FollowersCount int `json:"followers_count"`
	FollowingCount int `json:"following_count"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
