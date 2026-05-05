package repository

import (
	"context"
	"errors"

	"book_project/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SocialRepository struct {
	db *pgxpool.Pool
}

func NewSocialRepository(db *pgxpool.Pool) *SocialRepository {
	return &SocialRepository{db: db}
}

// GetProfile — отримує профіль користувача зі статистикою
func (r *SocialRepository) GetProfile(ctx context.Context, targetID, viewerID string) (*models.UserProfile, error) {
	var p models.UserProfile
	var avatar, bio string

	err := r.db.QueryRow(ctx, `
		SELECT u.id, u.username, COALESCE(u.avatar_url::text, ''), COALESCE(u.bio, ''),
			(SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) AS followers,
			(SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) AS following,
			(SELECT COUNT(*) FROM user_friends WHERE user_id = u.id) AS friends,
			(SELECT COUNT(*) FROM user_editions ue WHERE ue.user_id = u.id AND ue.status = 'finished') AS books_read,
			EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $2::uuid AND following_id = u.id) AS is_following,
			EXISTS(SELECT 1 FROM user_friends WHERE user_id = $2::uuid AND friend_id = u.id) AS is_friend,
			COALESCE((SELECT status::text FROM friend_requests WHERE from_user_id = $2::uuid AND to_user_id = u.id LIMIT 1), '') AS friend_status
		FROM users u WHERE u.id = $1::uuid`,
		targetID, viewerID,
	).Scan(
		&p.ID, &p.Username, &avatar, &bio,
		&p.FollowersCount, &p.FollowingCount, &p.FriendsCount, &p.BooksRead,
		&p.IsFollowing, &p.IsFriend, &p.FriendStatus,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("користувача не знайдено")
		}
		return nil, err
	}

	if avatar != "" {
		p.AvatarURL = &avatar
	}
	if bio != "" {
		p.Bio = &bio
	}

	return &p, nil
}

func (r *SocialRepository) Follow(ctx context.Context, followerID, followingID string) error {
	if followerID == followingID {
		return errors.New("не можна підписатись на себе")
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_follows (follower_id, following_id)
		VALUES ($1::uuid, $2::uuid)
		ON CONFLICT DO NOTHING`,
		followerID, followingID,
	)
	return err
}

func (r *SocialRepository) Unfollow(ctx context.Context, followerID, followingID string) error {
	_, err := r.db.Exec(ctx, `
		DELETE FROM user_follows WHERE follower_id = $1::uuid AND following_id = $2::uuid`,
		followerID, followingID,
	)
	return err
}

func (r *SocialRepository) SendFriendRequest(ctx context.Context, fromID, toID string) error {
	if fromID == toID {
		return errors.New("не можна додати себе в друзі")
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO friend_requests (from_user_id, to_user_id, status)
		VALUES ($1::uuid, $2::uuid, 'pending')
		ON CONFLICT (from_user_id, to_user_id) DO NOTHING`,
		fromID, toID,
	)
	return err
}

func (r *SocialRepository) AcceptFriendRequest(ctx context.Context, requestID, userID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var fromID, toID string
	err = tx.QueryRow(ctx, `
		UPDATE friend_requests SET status = 'accepted', updated_at = NOW()
		WHERE id = $1::uuid AND to_user_id = $2::uuid AND status = 'pending'
		RETURNING from_user_id::text, to_user_id::text`,
		requestID, userID,
	).Scan(&fromID, &toID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("запит не знайдено або вже оброблено")
		}
		return err
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO user_friends (user_id, friend_id) VALUES ($1::uuid, $2::uuid), ($2::uuid, $1::uuid)
		ON CONFLICT DO NOTHING`,
		fromID, toID,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *SocialRepository) DeclineFriendRequest(ctx context.Context, requestID, userID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE friend_requests SET status = 'declined', updated_at = NOW()
		WHERE id = $1::uuid AND to_user_id = $2::uuid`,
		requestID, userID,
	)
	return err
}

func (r *SocialRepository) GetFriendRequests(ctx context.Context, userID string) ([]models.FriendRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT fr.id, fr.from_user_id, u.username, COALESCE(u.avatar_url::text,''), fr.to_user_id, fr.status::text, fr.created_at
		FROM friend_requests fr
		JOIN users u ON fr.from_user_id = u.id
		WHERE fr.to_user_id = $1::uuid AND fr.status = 'pending'
		ORDER BY fr.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.FriendRequest
	for rows.Next() {
		var req models.FriendRequest
		if err := rows.Scan(&req.ID, &req.FromUserID, &req.FromUsername, &req.FromAvatar, &req.ToUserID, &req.Status, &req.CreatedAt); err != nil {
			continue
		}
		requests = append(requests, req)
	}
	if requests == nil {
		requests = []models.FriendRequest{}
	}
	return requests, nil
}

func (r *SocialRepository) GetActivityFeed(ctx context.Context, userID string, limit int) ([]models.ActivityEvent, error) {
	rows, err := r.db.Query(ctx, `
		SELECT af.id, af.actor_id, u.username, COALESCE(u.avatar_url::text,''),
			af.type, af.work_id, COALESCE(w.title,''), COALESCE(e.cover_url,''),
			af.club_id, COALESCE(g.name,''),
			af.created_at
		FROM activity_feed af
		JOIN users u ON af.actor_id = u.id
		LEFT JOIN works w ON af.work_id = w.id
		LEFT JOIN editions e ON e.work_id = w.id AND e.is_primary = true
		LEFT JOIN groups g ON af.club_id = g.id
		WHERE af.actor_id IN (
			SELECT following_id FROM user_follows WHERE follower_id = $1::uuid
			UNION ALL 
			SELECT friend_id FROM user_friends WHERE user_id = $1::uuid
		)
		ORDER BY af.created_at DESC LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.ActivityEvent
	for rows.Next() {
		var e models.ActivityEvent
		if err := rows.Scan(
			&e.ID, &e.ActorID, &e.ActorName, &e.ActorAvatar,
			&e.Type, &e.WorkID, &e.BookTitle, &e.BookCover,
			&e.ClubID, &e.ClubName, &e.CreatedAt,
		); err != nil {
			continue
		}
		events = append(events, e)
	}
	if events == nil {
		events = []models.ActivityEvent{}
	}
	return events, nil
}

func (r *SocialRepository) AddActivity(ctx context.Context, actorID, actType string, workID, clubID *uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO activity_feed (actor_id, type, work_id, club_id)
		VALUES ($1::uuid, $2, $3, $4)`,
		actorID, actType, workID, clubID,
	)
	return err
}

// ОНОВЛЕНО: Тепер приймає viewerID і повертає зв'язки (is_following, is_friend, friend_status)
func (r *SocialRepository) SearchUsers(ctx context.Context, query, viewerID string) ([]models.UserProfile, error) {
	rows, err := r.db.Query(ctx, `
		SELECT u.id, u.username, COALESCE(u.avatar_url::text,''), COALESCE(u.bio,''),
			EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $2::uuid AND following_id = u.id) AS is_following,
			EXISTS(SELECT 1 FROM user_friends WHERE user_id = $2::uuid AND friend_id = u.id) AS is_friend,
			COALESCE((SELECT status::text FROM friend_requests WHERE from_user_id = $2::uuid AND to_user_id = u.id LIMIT 1), '') AS friend_status
		FROM users u
		WHERE u.username ILIKE $1
		LIMIT 10`,
		"%"+query+"%", viewerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.UserProfile
	for rows.Next() {
		var u models.UserProfile
		var avatar, bio string
		if err := rows.Scan(&u.ID, &u.Username, &avatar, &bio, &u.IsFollowing, &u.IsFriend, &u.FriendStatus); err != nil {
			continue
		}
		if avatar != "" {
			u.AvatarURL = &avatar
		}
		if bio != "" {
			u.Bio = &bio
		}
		users = append(users, u)
	}
	if users == nil {
		users = []models.UserProfile{}
	}
	return users, nil
}
