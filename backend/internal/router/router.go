package router

import (
	"net/http"

	"book_project/backend/internal/handler"
	"book_project/backend/internal/middleware"
	"book_project/backend/internal/repository"
	"book_project/backend/internal/service"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(db *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()

	// ── Репозиторії ───────────────────────────────────────────────────────────
	userRepo := repository.NewUserRepository(db)
	bookRepo := repository.NewBookRepository(db)
	userBookRepo := repository.NewUserBookRepository(db)
	groupRepo := repository.NewGroupRepository(db)
	notifRepo := repository.NewNotificationRepository(db)
	socialRepo := repository.NewSocialRepository(db)
	analyticsRepo := repository.NewAnalyticsRepository(db)
	discussionRepo := repository.NewDiscussionRepository(db)
	quoteRepo := repository.NewQuoteRepository(db)
	shelfRepo := repository.NewCustomShelfRepository(db)
	dmRepo := repository.NewDMRepository(db)

	// ── Сервіси ───────────────────────────────────────────────────────────────
	authService := service.NewAuthService(userRepo)
	bookService := service.NewBookService(bookRepo)
	userBookService := service.NewUserBookService(userBookRepo)
	groupService := service.NewGroupService(groupRepo)
	recommendSvc := service.NewRecommendationService(bookRepo, analyticsRepo)

	// ── WebSocket хаб ─────────────────────────────────────────────────────────
	wsHub := handler.NewWSHub()
	go wsHub.Run()

	// ── Хендлери ─────────────────────────────────────────────────────────────
	authHandler := handler.NewAuthHandler(authService)
	bookHandler := handler.NewBookHandler(bookService)
	userBookHandler := handler.NewUserBookHandler(userBookService)
	groupHandler := handler.NewGroupHandler(groupService, wsHub)
	wsHandler := handler.NewWSHandler(wsHub, groupRepo)
	notifHandler := handler.NewNotificationHandler(notifRepo)
	socialHandler := handler.NewSocialHandler(socialRepo)
	analyticsHandler := handler.NewAnalyticsHandler(analyticsRepo)
	discussionHandler := handler.NewDiscussionHandler(discussionRepo, notifRepo)
	quoteHandler := handler.NewQuoteHandler(quoteRepo)
	shelfHandler := handler.NewCustomShelfHandler(shelfRepo)
	dmHandler := handler.NewDMHandler(dmRepo, wsHub)
	adminHandler := handler.NewAdminHandler(bookRepo, userRepo, analyticsRepo)
	recommendHandler := handler.NewRecommendationHandler(recommendSvc)

	// ════════════════════════════════════════════════════════════════════════
	// АВТОРИЗАЦІЯ
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("POST /api/register", authHandler.Register)
	mux.HandleFunc("POST /api/login", authHandler.Login)
	mux.HandleFunc("GET /api/profile", middleware.Auth(authHandler.GetProfile))
	mux.HandleFunc("PUT /api/profile/update", middleware.Auth(authHandler.UpdateProfile))

	// ════════════════════════════════════════════════════════════════════════
	// КНИГИ
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/books", bookHandler.GetAllBooks)
	mux.HandleFunc("GET /api/books/search", bookHandler.SearchBooks)
	mux.HandleFunc("GET /api/books/{id}", bookHandler.GetBookByID)
	mux.HandleFunc("GET /api/filters", bookHandler.GetFilters)
	mux.HandleFunc("GET /api/authors/search", bookHandler.SearchAuthors)

	// Відгуки
	mux.HandleFunc("GET /api/books/{id}/reviews", bookHandler.GetReviews)
	mux.HandleFunc("POST /api/books/{id}/reviews", middleware.Auth(bookHandler.CreateReview))
	mux.HandleFunc("POST /api/reviews/{id}/like", middleware.Auth(bookHandler.LikeReview))

	// Клуби книги
	mux.HandleFunc("GET /api/books/{id}/clubs", bookHandler.GetBookClubs)

	// Обговорення книги
	mux.HandleFunc("GET /api/books/{id}/discussions", discussionHandler.GetDiscussions)
	mux.HandleFunc("POST /api/books/{id}/discussions", middleware.Auth(discussionHandler.CreateDiscussion))
	mux.HandleFunc("GET /api/discussions/{id}", discussionHandler.GetDiscussion)
	mux.HandleFunc("POST /api/discussions/{id}/replies", middleware.Auth(discussionHandler.AddReply))

	// Цитати до книги
	mux.HandleFunc("GET /api/books/{id}/quotes", quoteHandler.GetBookQuotes)

	// ════════════════════════════════════════════════════════════════════════
	// АНАЛІТИКА / КАТАЛОГ
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/trending", analyticsHandler.GetTrending)
	mux.HandleFunc("GET /api/newest", analyticsHandler.GetNewest)
	mux.HandleFunc("GET /api/top-year", bookHandler.GetTopByYear) // топ поточного року
	mux.HandleFunc("GET /api/awards", analyticsHandler.GetAwards)

	// ════════════════════════════════════════════════════════════════════════
	// БІБЛІОТЕКА КОРИСТУВАЧА
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/me/books", middleware.Auth(userBookHandler.GetUserBooks))
	mux.HandleFunc("POST /api/me/books", middleware.Auth(userBookHandler.AddToShelf))
	mux.HandleFunc("POST /api/me/books/{id}", middleware.Auth(userBookHandler.AddWorkToShelf))
	mux.HandleFunc("PATCH /api/me/books/{id}/progress", middleware.Auth(userBookHandler.UpdateProgress))
	mux.HandleFunc("DELETE /api/me/books/{id}", middleware.Auth(userBookHandler.RemoveFromShelf))
	mux.HandleFunc("POST /api/me/books/{id}/sessions", middleware.Auth(bookHandler.AddReadingSession))

	// ════════════════════════════════════════════════════════════════════════
	// РЕКОМЕНДАЦІЇ (OpenAI)
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("POST /api/me/recommendations", middleware.Auth(recommendHandler.GetRecommendations))
	mux.HandleFunc("GET /api/me/recommendations/personalized", middleware.Auth(recommendHandler.GetPersonalized))

	// ════════════════════════════════════════════════════════════════════════
	// КНИЖКОВІ КЛУБИ
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/clubs", groupHandler.GetClubs)
	mux.HandleFunc("POST /api/clubs", middleware.Auth(groupHandler.CreateClub))
	mux.HandleFunc("GET /api/clubs/{id}", groupHandler.GetClub)
	mux.HandleFunc("POST /api/clubs/{id}/join", middleware.Auth(groupHandler.JoinClub))
	mux.HandleFunc("DELETE /api/clubs/{id}/leave", middleware.Auth(groupHandler.LeaveClub))
	mux.HandleFunc("POST /api/clubs/{id}/close-recruiting", middleware.Auth(groupHandler.CloseRecruiting))
	mux.HandleFunc("POST /api/clubs/{id}/discussion-date", middleware.Auth(groupHandler.SetDiscussionDate))
	mux.HandleFunc("GET /api/clubs/{id}/members", groupHandler.GetMembers)
	mux.HandleFunc("DELETE /api/clubs/{id}/members/{uid}", middleware.Auth(groupHandler.KickMember))
	mux.HandleFunc("POST /api/clubs/{id}/milestones", middleware.Auth(groupHandler.AddMilestone))
	mux.HandleFunc("GET /api/clubs/{id}/milestones", groupHandler.GetMilestones)
	mux.HandleFunc("GET /api/clubs/{id}/messages", middleware.Auth(groupHandler.GetMessages))
	mux.HandleFunc("DELETE /api/clubs/{id}/messages/{msgid}", middleware.Auth(groupHandler.DeleteMessage))
	mux.HandleFunc("POST /api/clubs/{id}/invite", middleware.Auth(groupHandler.InviteUser))
	mux.HandleFunc("POST /api/join/{code}", middleware.Auth(groupHandler.JoinByCode))
	mux.HandleFunc("GET /api/clubs/{id}/ws", middleware.Auth(wsHandler.ServeClubWS))

	// ════════════════════════════════════════════════════════════════════════
	// СПОВІЩЕННЯ
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/me/notifications", middleware.Auth(notifHandler.GetNotifications))
	mux.HandleFunc("POST /api/me/notifications/read-all", middleware.Auth(notifHandler.MarkAllRead))
	mux.HandleFunc("PATCH /api/me/notifications/{id}/read", middleware.Auth(notifHandler.MarkRead))

	// ════════════════════════════════════════════════════════════════════════
	// СОЦІАЛЬНЕ
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/users/search", socialHandler.SearchUsers)
	mux.HandleFunc("GET /api/users/{id}/profile", socialHandler.GetProfile)
	mux.HandleFunc("POST /api/users/{id}/follow", middleware.Auth(socialHandler.Follow))
	mux.HandleFunc("DELETE /api/users/{id}/follow", middleware.Auth(socialHandler.Unfollow))
	mux.HandleFunc("POST /api/users/{id}/friend-request", middleware.Auth(socialHandler.SendFriendRequest))
	mux.HandleFunc("GET /api/me/friend-requests", middleware.Auth(socialHandler.GetFriendRequests))
	mux.HandleFunc("POST /api/me/friend-requests/{id}/accept", middleware.Auth(socialHandler.AcceptFriendRequest))
	mux.HandleFunc("POST /api/me/friend-requests/{id}/decline", middleware.Auth(socialHandler.DeclineFriendRequest))
	mux.HandleFunc("GET /api/me/feed", middleware.Auth(socialHandler.GetFeed))

	// ════════════════════════════════════════════════════════════════════════
	// ОСОБИСТА АНАЛІТИКА
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/me/stats", middleware.Auth(analyticsHandler.GetMyStats))
	mux.HandleFunc("GET /api/me/calendar", middleware.Auth(analyticsHandler.GetCalendar))
	mux.HandleFunc("POST /api/me/goals", middleware.Auth(analyticsHandler.SetGoal))
	mux.HandleFunc("GET /api/me/goals", middleware.Auth(analyticsHandler.GetGoal))
	mux.HandleFunc("GET /api/me/streak", middleware.Auth(analyticsHandler.GetStreak))

	// ════════════════════════════════════════════════════════════════════════
	// ЦИТАТИ
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/me/quotes", middleware.Auth(quoteHandler.GetMyQuotes))
	mux.HandleFunc("POST /api/me/quotes", middleware.Auth(quoteHandler.CreateQuote))
	mux.HandleFunc("DELETE /api/me/quotes/{id}", middleware.Auth(quoteHandler.DeleteQuote))

	// ════════════════════════════════════════════════════════════════════════
	// КАСТОМНІ ПОЛИЦІ
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/me/shelves", middleware.Auth(shelfHandler.GetShelves))
	mux.HandleFunc("POST /api/me/shelves", middleware.Auth(shelfHandler.CreateShelf))
	mux.HandleFunc("DELETE /api/me/shelves/{id}", middleware.Auth(shelfHandler.DeleteShelf))
	mux.HandleFunc("POST /api/me/shelves/{id}/books", middleware.Auth(shelfHandler.AddBookToShelf))
	mux.HandleFunc("DELETE /api/me/shelves/{id}/books/{bookId}", middleware.Auth(shelfHandler.RemoveBookFromShelf))

	// ════════════════════════════════════════════════════════════════════════
	// ОСОБИСТІ ПОВІДОМЛЕННЯ (DM)
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/me/conversations", middleware.Auth(dmHandler.GetConversations))
	mux.HandleFunc("GET /api/me/conversations/{id}", middleware.Auth(dmHandler.GetMessages))
	mux.HandleFunc("POST /api/me/conversations/{id}", middleware.Auth(dmHandler.SendMessage))
	mux.HandleFunc("POST /api/me/conversations/start/{uid}", middleware.Auth(dmHandler.StartConversation))

	// ════════════════════════════════════════════════════════════════════════
	// АДМІНКА
	// ════════════════════════════════════════════════════════════════════════
	mux.HandleFunc("GET /api/admin/books", middleware.Auth(middleware.AdminOnly(adminHandler.ListBooks)))
	mux.HandleFunc("POST /api/admin/books", middleware.Auth(middleware.AdminOnly(adminHandler.CreateBook)))
	mux.HandleFunc("PUT /api/admin/books/{id}", middleware.Auth(middleware.AdminOnly(adminHandler.UpdateBook)))
	mux.HandleFunc("DELETE /api/admin/books/{id}", middleware.Auth(middleware.AdminOnly(adminHandler.DeleteBook)))
	mux.HandleFunc("GET /api/admin/users", middleware.Auth(middleware.AdminOnly(adminHandler.ListUsers)))
	mux.HandleFunc("PUT /api/admin/users/{id}/role", middleware.Auth(middleware.AdminOnly(adminHandler.SetUserRole)))
	mux.HandleFunc("GET /api/admin/stats", middleware.Auth(middleware.AdminOnly(adminHandler.GetSiteStats)))
	mux.HandleFunc("DELETE /api/admin/reviews/{id}", middleware.Auth(middleware.AdminOnly(adminHandler.DeleteReview)))

	return middleware.CORS(mux)
}
