package handler

import (
	"book_project/backend/internal/middleware"
	"book_project/backend/internal/service"
	"encoding/json"
	"log"
	"net/http"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "Усі поля обов'язкові", http.StatusBadRequest)
		return
	}
	if len(req.Password) < 8 {
		http.Error(w, "Пароль має бути мінімум 8 символів", http.StatusBadRequest)
		return
	}

	user, err := h.authService.RegisterUser(r.Context(), req.Username, req.Email, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	token, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.authService.GetUserByID(r.Context(), userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// PUT /api/profile/update
func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.ContextUserID).(string)
	if !ok || userID == "" {
		http.Error(w, "Неавторизований", http.StatusUnauthorized)
		return
	}

	var req struct {
		Bio       string `json:"bio"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний JSON", http.StatusBadRequest)
		return
	}

	// Виклик методу репозиторію напряму (або через authService, якщо ви додасте метод туди)
	err := h.authService.UpdateProfile(r.Context(), userID, req.Bio, req.AvatarURL)
	if err != nil {
		http.Error(w, "Помилка оновлення профілю", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Профіль оновлено"})
}

func (h *AuthHandler) VerifyResetCode(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Code == "" {
		http.Error(w, "Невірний формат", http.StatusBadRequest)
		return
	}

	if err := h.authService.VerifyResetCode(r.Context(), req.Code); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Код підтверджено"})
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірний формат", http.StatusBadRequest)
		return
	}

	err := h.authService.ForgotPassword(r.Context(), req.Email)
	if err != nil {
		// КРИТИЧНО ДЛЯ ДІАГНОСТИКИ: Виводимо реальну помилку в консоль вашого Go-сервера!
		log.Printf("[ERROR] ForgotPassword failed for email %s: %v", req.Email, err)

		// Для фронтенду і користувача залишаємо 200 OK (з міркувань безпеки)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"message": "Якщо email існує, ми надіслали лист"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Якщо email існує, ми надіслали лист"})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Невірні дані", http.StatusBadRequest)
		return
	}

	err := h.authService.ResetPassword(r.Context(), req.Token, req.Password)
	if err != nil {
		http.Error(w, "Токен недійсний або прострочений", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Пароль успішно змінено"})
}
