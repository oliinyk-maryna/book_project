package models

import (
	"time"

	"github.com/google/uuid"
)

type FriendRequest struct {
	ID           uuid.UUID `json:"id"`
	FromUserID   uuid.UUID `json:"from_user_id"`
	FromUsername string    `json:"from_username,omitempty"`
	FromAvatar   string    `json:"from_avatar,omitempty"`
	ToUserID     uuid.UUID `json:"to_user_id"`
	Status       string    `json:"status"` // pending, accepted, declined
	CreatedAt    time.Time `json:"created_at"`
}

type UserProfile struct {
	ID             uuid.UUID `json:"id"`
	Username       string    `json:"username"`
	AvatarURL      *string   `json:"avatar_url"`
	Bio            *string   `json:"bio"`
	FollowersCount int       `json:"followers_count"`
	FollowingCount int       `json:"following_count"`
	FriendsCount   int       `json:"friends_count"`
	BooksRead      int       `json:"books_read"`
	IsFollowing    bool      `json:"is_following"`
	IsFriend       bool      `json:"is_friend"`
	FriendStatus   string    `json:"friend_status,omitempty"`
}

type ActivityEvent struct {
	ID          uuid.UUID  `json:"id"`
	ActorID     uuid.UUID  `json:"actor_id"`
	ActorName   string     `json:"actor_name"`
	ActorAvatar string     `json:"actor_avatar,omitempty"`
	Type        string     `json:"type"`
	WorkID      *uuid.UUID `json:"work_id,omitempty"`
	BookTitle   string     `json:"book_title,omitempty"`
	BookCover   string     `json:"book_cover,omitempty"`
	ClubID      *uuid.UUID `json:"club_id,omitempty"`
	ClubName    string     `json:"club_name,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}