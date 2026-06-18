package repository

import (
	"context"
	"errors"
	"time"

	"book_project/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO users (username, email, password_hash)
		 VALUES ($1, $2, $3)
		 RETURNING id, created_at, updated_at`,
		user.Username, user.Email, user.PasswordHash,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx,
		`SELECT id, username, email, password_hash,
		        COALESCE(role, 'user'), COALESCE(avatar_url::text, ''), COALESCE(bio, ''),
		        created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.Role, &user.AvatarURL, &user.Bio,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}
func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET username=$1, bio=$2, avatar_url=$3, updated_at=NOW() WHERE id=$4`,
		user.Username, user.Bio, user.AvatarURL, user.ID,
	)
	return err
}

func (r *UserRepository) UpdateProfile(ctx context.Context, userID string, bio, avatarURL string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users 
		SET bio = $1, avatar_url = NULLIF($2, ''), updated_at = NOW() 
		WHERE id = $3::uuid`,
		bio, avatarURL, userID,
	)
	return err
}

// AdminGetUsers returns users with optional search filter. Fixed arg order bug.
func (r *UserRepository) AdminGetUsers(ctx context.Context, query string, limit int) ([]map[string]interface{}, error) {
	var sql string
	var args []interface{}

	if query != "" {
		sql = `SELECT id::text, username, email, COALESCE(role,'user'), created_at
		       FROM users WHERE username ILIKE $1 OR email ILIKE $1
		       ORDER BY created_at DESC LIMIT $2`
		args = []interface{}{"%" + query + "%", limit}
	} else {
		sql = `SELECT id::text, username, email, COALESCE(role,'user'), created_at
		       FROM users ORDER BY created_at DESC LIMIT $1`
		args = []interface{}{limit}
	}

	rows, err := r.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id, username, email, role string
		var createdAt interface{}
		if err := rows.Scan(&id, &username, &email, &role, &createdAt); err != nil {
			continue
		}
		users = append(users, map[string]interface{}{
			"id": id, "username": username, "email": email,
			"role": role, "created_at": createdAt,
		})
	}
	if users == nil {
		users = []map[string]interface{}{}
	}
	return users, nil
}

func (r *UserRepository) AdminSetRole(ctx context.Context, userID, role string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET role=$1 WHERE id=$2::uuid`, role, userID)
	return err
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User

	// Оновлений запит: використовуємо правильну таблицю user_follows
	query := `
		SELECT 
			id, username, email, COALESCE(role,'user'), avatar_url, bio, created_at, updated_at,
			(SELECT COUNT(*)::int FROM user_follows WHERE following_id = users.id) AS followers_count,
			(SELECT COUNT(*)::int FROM user_follows WHERE follower_id = users.id) AS following_count
		FROM users 
		WHERE id = $1::uuid
	`

	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.Role,
		&user.AvatarURL, &user.Bio, &user.CreatedAt, &user.UpdatedAt,
		&user.FollowersCount, &user.FollowingCount,
	)

	return &user, err
}

// AdminDeleteUser — видаляє користувача (каскадне видалення через FK)
func (r *UserRepository) AdminDeleteUser(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM users WHERE id = $1::uuid`, userID)
	return err
}

// Отримання користувача за email
func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	query := `SELECT id, username, email, password_hash, role FROM users WHERE email = $1`
	err := r.db.QueryRow(ctx, query, email).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Role)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Збереження токену для скидання пароля
func (r *UserRepository) SavePasswordResetToken(ctx context.Context, userID string, token string, expiresAt time.Time) error {
	query := `INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)`
	_, err := r.db.Exec(ctx, query, userID, token, expiresAt)
	return err
}

// Отримання токену з бази
func (r *UserRepository) GetPasswordResetToken(ctx context.Context, token string) (string, time.Time, error) {
	var userID string
	var expiresAt time.Time
	query := `SELECT user_id, expires_at FROM password_resets WHERE token = $1`
	err := r.db.QueryRow(ctx, query, token).Scan(&userID, &expiresAt)
	return userID, expiresAt, err
}

// Оновлення пароля та видалення токену (Транзакція)
func (r *UserRepository) UpdatePasswordAndClearToken(ctx context.Context, userID string, hashedPassword string, token string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE id = $2`, hashedPassword, userID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `DELETE FROM password_resets WHERE token = $1`, token)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// UpdateAvatar оновлює URL картинки профілю користувача
func (r *UserRepository) UpdateAvatar(ctx context.Context, userID string, avatarURL string) error {
	query := `
		UPDATE users 
		SET avatar_url = $1, updated_at = NOW() 
		WHERE id = $2::uuid`

	_, err := r.db.Exec(ctx, query, avatarURL, userID)
	return err
}
