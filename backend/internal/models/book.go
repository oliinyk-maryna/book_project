package models

import (
	"time"
)

type Book struct {
	ID          string   `json:"id"`
	GoogleID    string   `json:"google_id,omitempty"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Author      string   `json:"-"`
	Authors     []string `json:"authors"`
	CoverURL    string   `json:"cover_url"`
	Source      string   `json:"source,omitempty"`
	Category    string   `json:"category,omitempty"`
	Status      string   `json:"status,omitempty"`
	PageCount   int      `json:"page_count,omitempty"`
	CurrentPage int      `json:"current_page,omitempty"`
}

type UnifiedSearchResult struct {
	ID          uint     `json:"id,omitempty"`
	GoogleID    string   `json:"google_id"`
	Title       string   `json:"title"`
	Authors     []string `json:"authors"`
	Description string   `json:"description"`
	CoverURL    string   `json:"cover_url"`
	IsLocal     bool     `json:"is_local"`
}

type Work struct {
	ID                      string     `json:"id"`
	Title                   string     `json:"title"`
	AuthorID                *string    `json:"author_id"`
	Description             *string    `json:"description"`
	OriginalPublicationDate *time.Time `json:"original_publication_date"`
	AverageRating           float64    `json:"average_rating"`
	TotalRatings            int        `json:"total_ratings"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
}

type Edition struct {
	ID              string  `json:"id"`
	WorkID          string  `json:"work_id"`
	ISBN            string  `json:"isbn"`
	CoverURL        string  `json:"cover_url"`
	PageCount       int     `json:"page_count"`
	Publisher       string  `json:"publisher"`
	PublicationDate *string `json:"publication_date"`
	LanguageID      *int    `json:"language_id"`
	IsPrimary       bool    `json:"is_primary"`
}

type FilterOptions struct {
	Categories []string `json:"categories"`
	Publishers []string `json:"publishers"`
	Languages  []string `json:"languages"`
}

type GoogleBookDetails struct {
	GoogleID        string     `json:"google_id"`
	Title           string     `json:"title"`
	Authors         []string   `json:"authors"`
	Author          string     `json:"author"`
	Description     string     `json:"description"`
	CoverURL        string     `json:"cover_url"`
	Category        string     `json:"category"`
	PageCount       int        `json:"page_count"`
	Publisher       string     `json:"publisher"`
	PublicationDate string     `json:"publication_date"`
	AverageRating   float64    `json:"average_rating"`
	TotalRatings    int        `json:"total_ratings"`
	Source          string     `json:"source"`
	Clubs           []BookClub `json:"clubs"`
	UserBook        *UserBook  `json:"user_book,omitempty"`
	Reviews         []Review   `json:"reviews,omitempty"`
}

type BookClub struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	MembersCount int    `json:"members_count"`
	Status       string `json:"status"`
	Description  string `json:"description,omitempty"`
	IsMember     bool   `json:"is_member"`
}

type Review struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Username   string    `json:"username"`
	AvatarURL  string    `json:"avatar_url,omitempty"`
	Rating     int       `json:"rating"`
	ReviewText string    `json:"review_text,omitempty"`
	HasSpoiler bool      `json:"has_spoiler"`
	CreatedAt  time.Time `json:"created_at"`
}

// BookFilters — розширені фільтри для каталогу
type BookFilters struct {
	Search     string
	Genres     []string
	Languages  []string
	Publishers []string
	YearFrom   string
	YearTo     string
	Sort       string // newest | popular | rating | random
	Query      string
	Genre      string
	Author     string
	Limit      int
	Offset     int
	// Нові фільтри
	PageCountMin int    // мінімум сторінок
	PageCountMax int    // максимум сторінок
	RatingMin    string // мінімальний середній рейтинг (напр "4")
	Series       string // назва серії
}

// BookDetails — деталі книги для BookPage
type BookDetails struct {
	Book
	Publisher       string     `json:"publisher,omitempty"`
	PublicationDate string     `json:"publication_date,omitempty"`
	AverageRating   float64    `json:"average_rating,omitempty"`
	TotalRatings    int        `json:"total_ratings,omitempty"`
	UserStatus      string     `json:"user_status,omitempty"`
	CurrentPage     int        `json:"current_page,omitempty"`
	TotalPages      int        `json:"total_pages,omitempty"`
	Clubs           []BookClub `json:"clubs,omitempty"`
	IsMember        bool       `json:"is_member,omitempty"`
}

type WorkReview struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	UserName   string    `json:"user_name"`
	AvatarURL  string    `json:"avatar_url,omitempty"`
	Rating     int       `json:"rating"`
	ReviewText string    `json:"review_text,omitempty"`
	HasSpoiler bool      `json:"has_spoiler"`
	LikesCount int       `json:"likes_count"`
	CreatedAt  time.Time `json:"created_at"`
}

type ReadingSessionRequest struct {
	DurationSeconds int `json:"duration_seconds"`
	PagesRead       int `json:"pages_read"`
	StartPage       int `json:"start_page"`
	EndPage         int `json:"end_page"`
}

type CustomShelf struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	IsPublic    bool      `json:"is_public"`
	BooksCount  int       `json:"books_count"`
	CreatedAt   time.Time `json:"created_at"`
}

type ReadingSession struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	WorkID          string    `json:"work_id"`
	BookTitle       string    `json:"book_title,omitempty"`
	SessionDate     string    `json:"session_date"`
	StartPage       int       `json:"start_page"`
	EndPage         int       `json:"end_page"`
	PagesRead       int       `json:"pages_read"`
	DurationSeconds int       `json:"duration_seconds"`
	CreatedAt       time.Time `json:"created_at"`
}
