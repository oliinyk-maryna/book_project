package main

import (
	"log"
	"net/http"
	"os"

	"book_project/backend/internal/config"
	"book_project/backend/internal/database"
	"book_project/backend/internal/router"
)

func main() {
	// 1. Завантажуємо конфігурацію (ТІЛЬКИ з системних змінних)
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 2. Підключаємо базу даних
	dbPool, err := database.NewPostgres(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbPool.Close()

	// 3. Ініціалізуємо роутер
	r := router.NewRouter(dbPool)

	// 4. НАЛАШТУВАННЯ ПОРТУ ДЛЯ RAILWAY В DOCKER
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	// ДОДАЄМО 0.0.0.0, щоб Docker пропускав зовнішній трафік!
	addr := "0.0.0.0:" + port

	log.Printf("Server is running on %s", addr)

	// 5. Запуск сервера
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server crashed: %v", err)
	}
}
