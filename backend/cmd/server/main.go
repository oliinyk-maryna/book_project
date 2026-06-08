package main

import (
	"log"
	"net/http"
	"os"

	"book_project/backend/internal/config"
	"book_project/backend/internal/database"
	"book_project/backend/internal/router"
	"book_project/backend/internal/worker"
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

	// ЗАПУСК ФОНОВОГО ПРАЦІВНИКА СПОВІЩЕНЬ
	worker.StartDiscussionNotifier(db)

	// Хмара Railway сама дасть правильний порт через змінну "PORT"
	port := os.Getenv("PORT")
	if port == "" {
		port = cfg.AppPort // Якщо запускаємо локально на комп'ютері, візьмемо 8080
	}

	addr := ":" + port
	log.Printf("server is running on %s", addr)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
