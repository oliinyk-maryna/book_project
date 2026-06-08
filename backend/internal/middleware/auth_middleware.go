package middleware

import (
	"context"
	"errors"
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

// Допоміжна функція для перевірки токена (щоб не дублювати код)
func parseAndValidateToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret(), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims format")
	}

	return claims, nil
}

// Auth - Жорстка авторизація (викидає 401, якщо немає токена)
func Auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenString := extractToken(r)
		if tokenString == "" {
			http.Error(w, "Missing token", http.StatusUnauthorized)
			return
		}

		claims, err := parseAndValidateToken(tokenString)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		// Дістаємо user_id безпечно
		userID, ok := claims["user_id"].(string)
		if !ok || userID == "" {
			http.Error(w, "Invalid user_id in token", http.StatusUnauthorized)
			return
		}

		// Дістаємо role безпечно
		role, _ := claims["role"].(string)
		if role == "" {
			role = "user"
		}

		// Записуємо у контекст використовуючи константи з context_keys.go
		ctx := context.WithValue(r.Context(), ContextUserID, userID)
		ctx = context.WithValue(ctx, ContextUserRole, role)

		next(w, r.WithContext(ctx))
	}
}

// OptionalAuth - Опціональна авторизація (пропускає далі як гостя, якщо немає токена)
func OptionalAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenString := extractToken(r)
		if tokenString == "" {
			next(w, r) // Пропускаємо як гостя
			return
		}

		claims, err := parseAndValidateToken(tokenString)
		if err == nil {
			userID, ok := claims["user_id"].(string)
			if ok && userID != "" {
				role, _ := claims["role"].(string)
				if role == "" {
					role = "user"
				}

				// Якщо токен валідний - записуємо дані користувача в контекст
				ctx := context.WithValue(r.Context(), ContextUserID, userID)
				ctx = context.WithValue(ctx, ContextUserRole, role)
				next(w, r.WithContext(ctx))
				return
			}
		}

		// Якщо токен був, але він невалідний/прострочений — все одно пропускаємо як гостя
		next(w, r)
	}
}

func extractToken(r *http.Request) string {
	if h := r.Header.Get("Authorization"); h != "" {
		parts := strings.SplitN(h, " ", 2)
		// Зробили перевірку "Bearer" нечутливою до регістру
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			return parts[1]
		}
	}
	return r.URL.Query().Get("token")
}
