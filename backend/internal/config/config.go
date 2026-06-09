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

	// Railway / Supabase / Neon — надають DATABASE_URL
	dsn := firstNonEmpty(
		os.Getenv("DATABASE_URL"),
		os.Getenv("DB_DSN"),
		os.Getenv("POSTGRES_URL"),
	)

	if dsn != "" {
		cfg.DBDSN = ensureSSLParam(dsn)
	} else {
		// Fallback для локальної розробки (без хардкоду 127.0.0.1 на випадок помилок)
		cfg.DBHost = getEnv("DB_HOST", "")
		cfg.DBPort = getEnv("DB_PORT", "5432")
		cfg.DBUser = getEnv("DB_USER", "postgres")
		cfg.DBPassword = getEnv("DB_PASSWORD", "")
		cfg.DBName = getEnv("DB_NAME", "book_project_db")
		cfg.DBSSLMode = getEnv("DB_SSLMODE", "disable")
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
