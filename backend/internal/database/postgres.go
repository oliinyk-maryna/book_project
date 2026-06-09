package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"book_project/backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPostgres(cfg *config.Config) (*pgxpool.Pool, error) {
	// 1. Спочатку перевіряємо, чи є готова системна змінна DATABASE_URL (для Railway)
	dsn := os.Getenv("DATABASE_URL")

	// 2. Якщо її немає, зшиваємо по шматочках (для локального комп'ютера)
	if dsn == "" {
		dsn = fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s?sslmode=%s",
			cfg.DBUser,
			cfg.DBPassword,
			cfg.DBHost,
			cfg.DBPort,
			cfg.DBName,
			cfg.DBSSLMode,
		)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	dbpool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to create db pool: %w", err)
	}

	if err := dbpool.Ping(ctx); err != nil {
		dbpool.Close()
		return nil, fmt.Errorf("failed to ping db: %w", err)
	}

	return dbpool, nil
}
