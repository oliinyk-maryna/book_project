package repository

import (
	"context"
	"errors"

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

func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx,
		`SELECT id, username, email, COALESCE(role,'user'), avatar_url, bio, created_at, updated_at
		 FROM users WHERE id = $1::uuid`, id,
	).Scan(
		&user.ID, &user.Username, &user.Email, &user.Role,
		&user.AvatarURL, &user.Bio, &user.CreatedAt, &user.UpdatedAt,
	)
	return &user, err
}

func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET username=$1, bio=$2, avatar_url=$3, updated_at=NOW() WHERE id=$4`,
		user.Username, user.Bio, user.AvatarURL, user.ID,
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
