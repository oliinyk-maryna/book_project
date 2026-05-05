package main

import (
	"log"
	"net/http"

	"book_project/backend/internal/config"
	"book_project/backend/internal/database"
	"book_project/backend/internal/router"
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

	addr := ":" + cfg.AppPort
	log.Printf("server is running on %s", addr)

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
