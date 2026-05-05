package middleware

import "net/http"

// AdminOnly checks that the user has role=admin.
// Must run AFTER middleware.Auth.
func AdminOnly(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(ContextUserRole).(string)
		if role != "admin" && role != "moderator" {
			http.Error(w, "Доступ заборонено", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}
