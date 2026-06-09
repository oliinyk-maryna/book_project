package config

import (
	"errors"
	"net/url"
	"os"
	"strings"
)

type Config struct {
	AppPort    string
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DBDSN      string
	JWTSecret  string
}

func Load() (*Config, error) {
	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		return nil, errors.New("JWT_SECRET is not set — refusing to start without a secure secret")
	}

	cfg := &Config{
		AppPort:   getEnv("PORT", "8080"),
		JWTSecret: jwtSecret,
	}

	// Always read individual DB_* variables — Railway provides these reliably.
	// DATABASE_URL reference variable resolution can silently fail, so individual
	// vars are the primary connection method; DATABASE_URL is kept as a fallback.
	cfg.DBHost = getEnv("DB_HOST", "")
	cfg.DBPort = getEnv("DB_PORT", "5432")
	cfg.DBUser = getEnv("DB_USER", "postgres")
	cfg.DBPassword = getEnv("DB_PASSWORD", "")
	cfg.DBName = getEnv("DB_NAME", "book_project_db")
	cfg.DBSSLMode = getEnv("DB_SSLMODE", "disable")

	// Capture a pre-built DSN from DATABASE_URL / DB_DSN / POSTGRES_URL as a
	// fallback for environments that provide it (Supabase, Neon, etc.).
	dsn := firstNonEmpty(
		os.Getenv("DATABASE_URL"),
		os.Getenv("DB_DSN"),
		os.Getenv("POSTGRES_URL"),
	)
	if dsn != "" {
		cfg.DBDSN = ensureSSLParam(dsn)
	}

	return cfg, nil
}

func ensureSSLParam(rawDSN string) string {
	if strings.Contains(rawDSN, "sslmode=") {
		return rawDSN
	}
	u, err := url.Parse(rawDSN)
	if err != nil {
		return rawDSN
	}
	q := u.Query()
	q.Set("sslmode", "require")
	u.RawQuery = q.Encode()
	return u.String()
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
