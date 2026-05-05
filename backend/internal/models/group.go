package models

import (
	"time"

	"github.com/google/uuid"
)

// Club — повноцінна модель книжкового клубу
type Club struct {
	ID             uuid.UUID   `json:"id"`
	Name           string      `json:"name"`
	Description    string      `json:"description"`
	CreatorID      uuid.UUID   `json:"creator_id"`
	CreatorName    string      `json:"creator_name,omitempty"`
	EditionID      *uuid.UUID  `json:"edition_id,omitempty"`
	WorkID         *uuid.UUID  `json:"work_id,omitempty"`
	BookTitle      string      `json:"book_title,omitempty"`
	BookAuthor     string      `json:"book_author,omitempty"`
	BookCover      string      `json:"book_cover,omitempty"`
	TotalPages     int         `json:"total_pages,omitempty"`
	InviteCode     string      `json:"invite_code,omitempty"`
	Status         string      `json:"status"` // recruiting, active, discussing, closed, private
	MinMembers     int         `json:"min_members"`
	MaxMembers     int         `json:"max_members"`
	IsPrivate      bool        `json:"is_private"`
	MembersCount   int         `json:"members_count"`
	DiscussionDate *time.Time  `json:"discussion_date,omitempty"`
	CurrentPage    int         `json:"current_page_limit"`
	Milestones     []Milestone `json:"milestones,omitempty"`
	UserRole       string      `json:"user_role,omitempty"` // admin, member, "" (не учасник)
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type Milestone struct {
	ID             uuid.UUID  `json:"id"`
	ClubID         uuid.UUID  `json:"club_id"`
	Title          string     `json:"title"`
	PageLimit      int        `json:"page_limit"`
	DeadlineDate   string     `json:"deadline_date"`
	DiscussionDate *time.Time `json:"discussion_date,omitempty"`
	IsActive       bool       `json:"is_active"`
	CreatedAt      time.Time  `json:"created_at"`
}

type ChatMessage struct {
	ID             uuid.UUID    `json:"id"`
	ClubID         *uuid.UUID   `json:"club_id,omitempty"`
	ConversationID *uuid.UUID   `json:"conversation_id,omitempty"`
	UserID         uuid.UUID    `json:"user_id"`
	Username       string       `json:"username"`
	AvatarURL      string       `json:"avatar_url,omitempty"`
	Content        string       `json:"content"`
	Type           string       `json:"type"` // text, spoiler, system, quote
	PageRef        *int         `json:"page_ref,omitempty"`
	ReplyToID      *uuid.UUID   `json:"reply_to_id,omitempty"`
	ReplyTo        *ChatMessage `json:"reply_to,omitempty"`
	IsDeleted      bool         `json:"is_deleted"`
	CreatedAt      time.Time    `json:"created_at"`
}

type GroupMember struct {
	GroupID  uuid.UUID `json:"group_id"`
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username,omitempty"`
	Avatar   string    `json:"avatar_url,omitempty"`
	Role     string    `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
}

// Запит на створення клубу
type CreateClubRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	WorkID      string `json:"work_id"`
	EditionID   string `json:"edition_id,omitempty"`
	MinMembers  int    `json:"min_members"`
	MaxMembers  int    `json:"max_members"`
	IsPrivate   bool   `json:"is_private"`
}

// Запит на додавання milestone
type CreateMilestoneRequest struct {
	Title          string  `json:"title"`
	PageLimit      int     `json:"page_limit"`
	DeadlineDate   string  `json:"deadline_date"`
	DiscussionDate *string `json:"discussion_date,omitempty"`
}

// ClubInvite — запрошення до закритого клубу
type ClubInvite struct {
	ID            uuid.UUID  `json:"id"`
	ClubID        uuid.UUID  `json:"club_id"`
	ClubName      string     `json:"club_name,omitempty"`
	InvitedUserID *uuid.UUID `json:"invited_user_id,omitempty"`
	InvitedByID   uuid.UUID  `json:"invited_by_id"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
}

