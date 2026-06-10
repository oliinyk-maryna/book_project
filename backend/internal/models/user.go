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

// BookSummary для виводу обкладинок та назв у профілі
type BookSummary struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	CoverURL string `json:"cover_url"`
}

// Повна структура профілю
type UserProfile struct {
	ID             string        `json:"id"`
	Username       string        `json:"username"`
	Bio            *string       `json:"bio,omitempty"`
	AvatarURL      *string       `json:"avatar_url,omitempty"`
	FollowersCount int           `json:"followers_count"`
	FollowingCount int           `json:"following_count"`
	FriendsCount   int           `json:"friends_count"` // Додано
	BooksRead      int           `json:"books_read"`
	IsFollowing    bool          `json:"is_following"`
	IsFriend       bool          `json:"is_friend"`     // Додано
	FriendStatus   string        `json:"friend_status"` // Додано
	RecentBooks    []BookSummary `json:"recent_books"`  // Додано
}
