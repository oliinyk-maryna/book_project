package models

import (
	"time"

	"github.com/google/uuid"
)

// Thread — гілка обговорення під книгою
type Thread struct {
	ID            uuid.UUID      `json:"id"`
	WorkID        uuid.UUID      `json:"work_id"`
	AuthorID      uuid.UUID      `json:"author_id"`
	AuthorName    string         `json:"author_name"`
	AuthorAvatar  string         `json:"author_avatar,omitempty"`
	Title         string         `json:"title"`
	Body          string         `json:"body"`
	IsSpoiler     bool           `json:"is_spoiler"`
	Reactions     map[string]int `json:"reactions"`
	CommentsCount int            `json:"comments_count"`
	CreatedAt     time.Time      `json:"created_at"`
}

// ThreadComment — коментар у гілці
type ThreadComment struct {
	ID           uuid.UUID      `json:"id"`
	ThreadID     uuid.UUID      `json:"thread_id"`
	AuthorID     uuid.UUID      `json:"author_id"`
	AuthorName   string         `json:"author_name"`
	AuthorAvatar string         `json:"author_avatar,omitempty"`
	Body         string         `json:"body"`
	Reactions    map[string]int `json:"reactions"`
	CreatedAt    time.Time      `json:"created_at"`
}

// Quote — цитата з книги
type Quote struct {
	ID        uuid.UUID `json:"id"`
	WorkID    uuid.UUID `json:"work_id"`
	BookTitle string    `json:"book_title,omitempty"`
	UserID    uuid.UUID `json:"user_id"`
	UserName  string    `json:"user_name"`
	Text      string    `json:"text"`
	Page      *int      `json:"page,omitempty"`
	Likes     int       `json:"likes"`
	IsLiked   bool      `json:"is_liked"`
	CreatedAt time.Time `json:"created_at"`
}

// Conversation (DM)
type Conversation struct {
	ID          uuid.UUID    `json:"id"`
	OtherUser   *UserProfile `json:"other_user,omitempty"`
	LastMessage string       `json:"last_message,omitempty"`
	UnreadCount int          `json:"unread_count"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// ReadingChallenge
type ReadingChallenge struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Year        int       `json:"year"`
	TargetBooks int       `json:"target_books"`
	DoneBooks   int       `json:"done_books"`
	Percent     int       `json:"percent"`
}

// Файл: internal/models/discussion.go

// DirectMessage
type DirectMessage struct {
	ID             uuid.UUID `json: "id"`
	ConversationID uuid.UUID `json: "conversation_id"`
	SenderID       uuid.UUID `json: "sender_id"`
	SenderName     string    `json: "sender_name"`             // Додайте це поле
	SenderAvatar   string    `json: "sender_avatar,omitempty"` // Опціонально
	Content        string    `json: "content"`
	IsRead         bool      `json: "is_read"`
	CreatedAt      time.Time `json: "created_at"`
}
