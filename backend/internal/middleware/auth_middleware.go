package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func jwtSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		panic("JWT_SECRET is not set")
	}
	return []byte(s)
}

// Auth validates JWT from Authorization header or ?token= query param.
// Sets "user_id" (string) and "user_role" (string) in context.
func Auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenString := extractToken(r)
		if tokenString == "" {
			http.Error(w, "Missing token", http.StatusUnauthorized)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, http.ErrAbortHandler
			}
			return jwtSecret(), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}

		userIDStr, ok := claims["user_id"].(string)
		if !ok || userIDStr == "" {
			http.Error(w, "Invalid user_id in token", http.StatusUnauthorized)
			return
		}

		// Role stored in token for fast access; role changes take effect on next login.
		role, _ := claims["role"].(string)
		if role == "" {
			role = "user"
		}

		ctx := context.WithValue(r.Context(), contextKey("user_id"), userIDStr)
		ctx = context.WithValue(ctx, contextKey("user_role"), role)
		next(w, r.WithContext(ctx))
	}
}

// contextKey is a private type to avoid collisions with third-party context keys.
type contextKey string

func extractToken(r *http.Request) string {
	if h := r.Header.Get("Authorization"); h != "" {
		parts := strings.SplitN(h, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
	}
	return r.URL.Query().Get("token")
}
