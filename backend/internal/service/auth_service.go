package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"book_project/backend/internal/models"
	"book_project/backend/internal/repository"

	"book_project/backend/internal/utils"
	"crypto/rand"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func jwtSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		panic("JWT_SECRET is not set")
	}
	return []byte(s)
}

type AuthService struct {
	repo *repository.UserRepository
}

func NewAuthService(repo *repository.UserRepository) *AuthService {
	return &AuthService{repo: repo}
}

func (s *AuthService) RegisterUser(ctx context.Context, username, email, password string) (*models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (string, error) {
	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		log.Printf("Login error: user with email %s not found: %v", email, err) // ДОДАТИ ЦЕ
		return "", errors.New("invalid email or password")
	}

	if err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		log.Printf("Login error: password mismatch for %s", email) // ДОДАТИ ЦЕ
		return "", errors.New("invalid email or password")
	}

	role := "user"
	if user.Role != "" {
		role = user.Role
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    role,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	})

	return token.SignedString(jwtSecret())
}

func (s *AuthService) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *AuthService) UpdateUser(ctx context.Context, user *models.User) error {
	return s.repo.Update(ctx, user)
}

func (s *AuthService) UpdateProfile(ctx context.Context, userID, bio, avatarURL string) error {
	// Делегуємо виклик у репозиторій користувачів
	return s.repo.UpdateProfile(ctx, userID, bio, avatarURL)
}
func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return err
	}

	// Генеруємо 6-значний цифровий код
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return err
	}
	code := fmt.Sprintf("%06d", n.Int64())
	expiresAt := time.Now().UTC().Add(15 * time.Minute)

	err = s.repo.SavePasswordResetToken(ctx, user.ID.String(), code, expiresAt)
	if err != nil {
		return err
	}

	return utils.SendResetEmail(user.Email, code)
}

func (s *AuthService) VerifyResetCode(ctx context.Context, code string) error {
	_, expiresAt, err := s.repo.GetPasswordResetToken(ctx, code)
	if err != nil {
		return errors.New("невірний код")
	}
	if time.Now().UTC().After(expiresAt.UTC()) {
		return errors.New("код прострочений")
	}
	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	// 1. Отримуємо токен з БД
	userID, expiresAt, err := s.repo.GetPasswordResetToken(ctx, token)
	if err != nil || time.Now().UTC().After(expiresAt.UTC()) {
		return err // Токен недійсний або прострочений
	}

	// 2. Хешуємо новий пароль
	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.repo.UpdatePasswordAndClearToken(ctx, userID, string(hashedPwd), token)
}

var jwtKey = []byte("my_secret_key") // В ідеалі бери це з config.go

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// 1. Метод для парсингу токена
func (s *AuthService) ParseToken(tokenString string) (string, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !token.Valid {
		return "", errors.New("недійсний токен")
	}

	return claims.UserID, nil
}

// 2. Метод для генерації токена
func (s *AuthService) GenerateAccessToken(userID string) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // Час життя токена

	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}
func (s *AuthService) RefreshToken(ctx context.Context, authHeader string) (string, error) {
	if authHeader == "" {
		return "", errors.New("відсутній заголовок Authorization")
	}

	tokenString := authHeader[7:]

	userID, err := s.ParseToken(tokenString)
	if err != nil {
		return "", err
	}

	return s.GenerateAccessToken(userID)
}

func (s *AuthService) UpdateAvatar(ctx context.Context, userID string, avatarURL string) error {
	return s.repo.UpdateAvatar(ctx, userID, avatarURL)
}