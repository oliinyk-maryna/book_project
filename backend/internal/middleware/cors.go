package middleware

import "net/http"

// CORS додає заголовки, необхідні для роботи з React-фронтендом
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Дозволяємо запити з порту Vite (зміни, якщо в тебе інший)
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Обробка попереднього запиту від браузера (Preflight)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Передаємо управління далі
		next.ServeHTTP(w, r)
	})
}
