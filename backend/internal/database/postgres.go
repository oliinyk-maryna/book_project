package database

import (
	"context"
	"fmt"
	"time"

	"book_project/backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPostgres(cfg *config.Config) (*pgxpool.Pool, error) {
	// Prefer building the DSN from individual DB_* variables — Railway provides
	// these reliably even when DATABASE_URL reference variable resolution fails.
	// Fall back to a pre-built DSN (DATABASE_URL / DB_DSN / POSTGRES_URL) only
	// when the individual host variable is absent.
	var dsn string
	if cfg.DBHost != "" {
		dsn = fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s?sslmode=%s",
			cfg.DBUser,
			cfg.DBPassword,
			cfg.DBHost,
			cfg.DBPort,
			cfg.DBName,
			cfg.DBSSLMode,
		)
	} else if cfg.DBDSN != "" {
		dsn = cfg.DBDSN
	} else {
		return nil, fmt.Errorf("no database connection info: set DB_HOST (and DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSLMODE) or DATABASE_URL")
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
