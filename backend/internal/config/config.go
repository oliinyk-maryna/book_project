package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

type Config struct {
	AppPort    string
	DBURL      string // Додаємо поле для прямого посилання на базу
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	JWTSecret  string
}

func Load() (*Config, error) {
	dir, err := os.Getwd()
	if err == nil {
		envPath := filepath.Join(dir, ".env")
		if _, err := os.Stat(envPath); os.IsNotExist(err) {
			envPath = filepath.Join(dir, "..", ".env")
		}
		if err = godotenv.Load(envPath); err != nil {
			log.Printf("Warning: .env file not found at %s. Falling back to system env.", envPath)
		} else {
			log.Printf("Loaded .env from %s", envPath)
		}
	}

	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		// Тимчасовий фолбек для девелопменту, щоб додаток не падав, якщо забули додати в панелі
		jwtSecret = "fallback_secret_key_for_local_and_railway"
	}

	cfg := &Config{
		// Railway дає змінну PORT. Якщо її немає, шукаємо APP_PORT, якщо і її немає — 8080
		AppPort:    getEnv("PORT", getEnv("APP_PORT", "8080")),
		DBURL:      getEnv("DATABASE_URL", ""),
		DBHost:     getEnv("DB_HOST", getEnv("POSTGRES_HOST", "127.0.0.1")),
		DBPort:     getEnv("DB_PORT", getEnv("POSTGRES_PORT", "5432")),
		DBUser:     getEnv("DB_USER", getEnv("POSTGRES_USER", "postgres")),
		DBPassword: getEnv("DB_PASSWORD", getEnv("POSTGRES_PASSWORD", "")),
		DBName:     getEnv("DB_NAME", getEnv("POSTGRES_DB", "book_project_db")),
		DBSSLMode:  getEnv("DB_SSLMODE", getEnv("POSTGRES_SSLMODE", "disable")),
		JWTSecret:  jwtSecret,
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
