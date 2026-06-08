package middleware

import (
	"net/http"
	"os"
	"strings"
)

// CORS додає заголовки, необхідні для роботи з React-фронтендом.
// Дозволені origins читаються з ALLOWED_ORIGINS (через кому) або ALLOWED_ORIGIN.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := allowedOrigins()

		if isAllowed(origin, allowed) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else if len(allowed) > 0 {
			w.Header().Set("Access-Control-Allow-Origin", allowed[0])
		} else {
			// Fallback для dev-середовища
			w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func allowedOrigins() []string {
	if v := os.Getenv("ALLOWED_ORIGINS"); v != "" {
		return strings.Split(v, ",")
	}
	if v := os.Getenv("ALLOWED_ORIGIN"); v != "" {
		return []string{v}
	}
	return nil
}

func isAllowed(origin string, allowed []string) bool {
	for _, a := range allowed {
		if strings.TrimSpace(a) == origin {
			return true
		}
	}
	return false
}
