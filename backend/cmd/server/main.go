package main

import (
	"log"
	"net/http"
	"os"

	"book_project/backend/internal/config"
	"book_project/backend/internal/database"
	"book_project/backend/internal/router"
	//"book_project/backend/internal/worker"

	"github.com/rs/cors" // Додали пакет для обробки CORS запитів
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.NewPostgres(cfg)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	r := router.NewRouter(db)

	// НАЛАШТУВАННЯ CORS
	// Тут ми дозволяємо вашому фронтенду на Netlify (і локальним хостам для розробки) звертатися до API
	c := cors.New(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:3000",          // Для локальної розробки (React за замовчуванням)
			"http://localhost:5173",          // Для локальної розробки (Vite за замовчуванням)
			"https://readlongue.netlify.app", // Ваш деплой на Netlify
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,  // Дозволяє передавати куки та заголовок Authorization (Bearer token)
		Debug:            false, // Можна змінити на true, якщо знадобиться детальний лог CORS у консолі Railway
	})

	// Обгортаємо наш оригінальний роутер у CORS-handler
	handler := c.Handler(r)

	// ЗАПУСК ФОНОВОГО ПРАЦІВНИКА СПОВІЩЕНЬ
	//worker.StartDiscussionNotifier(db)

	// Хмара Railway сама дасть правильний порт через змінну "PORT"
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Дефолтний порт для локальної розробки
	}
	addr := ":" + port
	log.Printf("server is running on %s", addr)

	// Важливо: переконайтеся, що ви запускаєте сервер саме на цьому адресі
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
