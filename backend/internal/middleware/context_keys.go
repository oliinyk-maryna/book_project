package middleware

type ContextKey string

const (
	ContextUserID   ContextKey = "user_id"
	ContextUserRole ContextKey = "user_role"
)
