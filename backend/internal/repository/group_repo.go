package repository

import (
	"context"
	"errors"
	"fmt"
	"math/rand"

	"book_project/backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GroupRepository struct {
	db *pgxpool.Pool
}

func NewGroupRepository(db *pgxpool.Pool) *GroupRepository {
	return &GroupRepository{db: db}
}

// ---- КЛУБИ ----

func (r *GroupRepository) CreateClub(ctx context.Context, req models.CreateClubRequest, creatorID string) (*models.Club, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	inviteCode := generateInviteCode()
	maxM := req.MaxMembers
	if maxM <= 0 {
		maxM = 20
	}
	minM := req.MinMembers
	if minM <= 0 {
		minM = 2
	}

	var club models.Club
	status := "recruiting"
	if req.IsPrivate {
		status = "private"
	}

	var workUUID *uuid.UUID
	if req.WorkID != "" {
		id, err := uuid.Parse(req.WorkID)
		if err == nil {
			workUUID = &id
		}
	}
	var editionUUID *uuid.UUID
	if req.EditionID != "" {
		id, err := uuid.Parse(req.EditionID)
		if err == nil {
			editionUUID = &id
		}
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO groups (name, description, creator_id, work_id, edition_id, invite_code,
			status, min_members, max_members, is_private, is_temporary)
		VALUES ($1, $2, $3::uuid, $4, $5, $6, $7::club_status, $8, $9, $10, false)
		RETURNING id, name, description, creator_id, COALESCE(invite_code,''), status::text,
			min_members, max_members, is_private, created_at, updated_at`,
		req.Name, req.Description, creatorID, workUUID, editionUUID, inviteCode,
		status, minM, maxM, req.IsPrivate,
	).Scan(
		&club.ID, &club.Name, &club.Description, &club.CreatorID, &club.InviteCode, &club.Status,
		&club.MinMembers, &club.MaxMembers, &club.IsPrivate, &club.CreatedAt, &club.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	club.WorkID = workUUID
	club.EditionID = editionUUID

	// Додаємо засновника як адміна
	_, err = tx.Exec(ctx, `
		INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
		club.ID, creatorID,
	)
	if err != nil {
		return nil, err
	}

	// Підтягуємо інфо книги якщо є work_id
	if workUUID != nil {
		tx.QueryRow(ctx, `
			SELECT w.title, COALESCE(a.name,''), COALESCE(e.cover_url,''), COALESCE(e.page_count,0)
			FROM works w
			LEFT JOIN authors a ON w.author_id = a.id
			LEFT JOIN editions e ON e.work_id = w.id
			WHERE w.id = $1 LIMIT 1`, workUUID,
		).Scan(&club.BookTitle, &club.BookAuthor, &club.BookCover, &club.TotalPages)
	}

	club.MembersCount = 1
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &club, nil
}

func (r *GroupRepository) GetClubs(ctx context.Context, workID string, userID string) ([]models.Club, error) {
	args := []any{}
	query := `
		SELECT g.id, g.name, COALESCE(g.description,''), g.creator_id,
			COALESCE(u.username,'') as creator_name,
			COALESCE(g.invite_code,''),
			g.status::text, g.min_members, g.max_members, g.is_private,
			COUNT(gm.user_id) as members_count,
			COALESCE(w.title,'') as book_title,
			COALESCE(a.name,'') as book_author,
			COALESCE(e.cover_url,'') as book_cover,
			COALESCE(g.current_page_limit,0),
			g.created_at, g.updated_at,
			COALESCE((SELECT role::text FROM group_members WHERE group_id = g.id AND user_id = $1::uuid LIMIT 1), '') as user_role
		FROM groups g
		LEFT JOIN users u ON g.creator_id = u.id
		LEFT JOIN group_members gm ON g.id = gm.group_id
		LEFT JOIN works w ON g.work_id = w.id
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON e.work_id = w.id
		WHERE g.is_private = false AND g.status IN ('recruiting','active','discussing')`

	argIdx := 2
	args = append(args, userID) // $1 = userID for user_role subquery

	if workID != "" {
		query += fmt.Sprintf(` AND g.work_id = $%d::uuid`, argIdx)
		args = append(args, workID)
		argIdx++
	}

	query += ` GROUP BY g.id, u.username, w.title, a.name, e.cover_url ORDER BY g.created_at DESC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clubs []models.Club
	for rows.Next() {
		var c models.Club
		err := rows.Scan(
			&c.ID, &c.Name, &c.Description, &c.CreatorID, &c.CreatorName,
			&c.InviteCode, &c.Status, &c.MinMembers, &c.MaxMembers, &c.IsPrivate,
			&c.MembersCount, &c.BookTitle, &c.BookAuthor, &c.BookCover,
			&c.CurrentPage, &c.CreatedAt, &c.UpdatedAt, &c.UserRole,
		)
		if err != nil {
			continue
		}
		clubs = append(clubs, c)
	}
	if clubs == nil {
		clubs = []models.Club{}
	}
	return clubs, nil
}

func (r *GroupRepository) GetClubByID(ctx context.Context, clubID, userID string) (*models.Club, error) {
	var c models.Club
	err := r.db.QueryRow(ctx, `
		SELECT g.id, g.name, COALESCE(g.description,''), g.creator_id,
			COALESCE(u.username,'') as creator_name,
			COALESCE(g.invite_code,''), g.status::text,
			g.min_members, g.max_members, g.is_private,
			COUNT(gm.user_id) as members_count,
			COALESCE(w.title,'') as book_title,
			COALESCE(a.name,'') as book_author,
			COALESCE(e.cover_url,'') as book_cover,
			COALESCE(e.page_count,0), COALESCE(g.current_page_limit,0),
			g.created_at, g.updated_at,
			COALESCE((SELECT role::text FROM group_members gm2 WHERE gm2.group_id = g.id AND gm2.user_id = $2::uuid LIMIT 1), '') as user_role
		FROM groups g
		LEFT JOIN users u ON g.creator_id = u.id
		LEFT JOIN group_members gm ON g.id = gm.group_id
		LEFT JOIN works w ON g.work_id = w.id
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON e.work_id = w.id
		WHERE g.id = $1::uuid
		GROUP BY g.id, u.username, w.title, a.name, e.cover_url`,
		clubID, userID,
	).Scan(
		&c.ID, &c.Name, &c.Description, &c.CreatorID, &c.CreatorName,
		&c.InviteCode, &c.Status, &c.MinMembers, &c.MaxMembers, &c.IsPrivate,
		&c.MembersCount, &c.BookTitle, &c.BookAuthor, &c.BookCover,
		&c.TotalPages, &c.CurrentPage, &c.CreatedAt, &c.UpdatedAt, &c.UserRole,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("клуб не знайдено")
		}
		return nil, err
	}

	// Підтягуємо milestones
	milestones, _ := r.GetMilestones(ctx, clubID)
	c.Milestones = milestones

	return &c, nil
}

func (r *GroupRepository) GetClubByInviteCode(ctx context.Context, code string) (*models.Club, error) {
	var id string
	err := r.db.QueryRow(ctx, `SELECT id::text FROM groups WHERE invite_code = $1`, code).Scan(&id)
	if err != nil {
		return nil, errors.New("запрошення не знайдено")
	}
	return r.GetClubByID(ctx, id, "")
}

func (r *GroupRepository) JoinClub(ctx context.Context, clubID, userID string) error {
	var status string
	var maxM, currentCount int
	err := r.db.QueryRow(ctx, `
		SELECT status::text, max_members,
			(SELECT COUNT(*) FROM group_members WHERE group_id = $1::uuid)
		FROM groups WHERE id = $1::uuid`, clubID,
	).Scan(&status, &maxM, &currentCount)
	if err != nil {
		return errors.New("клуб не знайдено")
	}

	if status == "closed" || status == "discussing" {
		return errors.New("набір у цей клуб завершено")
	}
	if currentCount >= maxM {
		return errors.New("клуб вже заповнений")
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO group_members (group_id, user_id, role)
		VALUES ($1::uuid, $2::uuid, 'member')
		ON CONFLICT DO NOTHING`,
		clubID, userID,
	)
	return err
}

func (r *GroupRepository) LeaveClub(ctx context.Context, clubID, userID string) error {
	_, err := r.db.Exec(ctx, `
		DELETE FROM group_members WHERE group_id = $1::uuid AND user_id = $2::uuid`,
		clubID, userID,
	)
	return err
}

func (r *GroupRepository) UpdateClubStatus(ctx context.Context, clubID, userID, status string) error {
	// Перевіряємо права (тільки admin)
	var role string
	err := r.db.QueryRow(ctx, `
		SELECT role::text FROM group_members WHERE group_id = $1::uuid AND user_id = $2::uuid`,
		clubID, userID,
	).Scan(&role)
	if err != nil || role != "admin" {
		return errors.New("недостатньо прав")
	}

	_, err = r.db.Exec(ctx, `UPDATE groups SET status = $1::club_status WHERE id = $2::uuid`, status, clubID)
	return err
}

func (r *GroupRepository) SetDiscussionDate(ctx context.Context, clubID, userID, date string) error {
	var role string
	err := r.db.QueryRow(ctx, `
		SELECT role::text FROM group_members WHERE group_id = $1::uuid AND user_id = $2::uuid`,
		clubID, userID,
	).Scan(&role)
	if err != nil || role != "admin" {
		return errors.New("недостатньо прав")
	}

	_, err = r.db.Exec(ctx, `UPDATE groups SET discussion_date = $1 WHERE id = $2::uuid`, date, clubID)
	return err
}

func (r *GroupRepository) IsMember(ctx context.Context, clubID, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = $1::uuid AND user_id = $2::uuid)`,
		clubID, userID,
	).Scan(&exists)
	return exists, err
}

func (r *GroupRepository) GetUserInfo(ctx context.Context, userID string) (string, string) {
	var username, avatar string
	r.db.QueryRow(ctx, `SELECT username, COALESCE(avatar_url,'') FROM users WHERE id = $1::uuid`, userID).
		Scan(&username, &avatar)
	return username, avatar
}

func (r *GroupRepository) GetMembers(ctx context.Context, clubID string) ([]models.GroupMember, error) {
	rows, err := r.db.Query(ctx, `
		SELECT gm.group_id, gm.user_id, COALESCE(u.username,''), COALESCE(u.avatar_url,''),
			gm.role::text, gm.joined_at
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = $1::uuid
		ORDER BY gm.joined_at ASC`, clubID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.GroupMember
	for rows.Next() {
		var m models.GroupMember
		if err := rows.Scan(&m.GroupID, &m.UserID, &m.Username, &m.Avatar, &m.Role, &m.JoinedAt); err != nil {
			continue
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *GroupRepository) KickMember(ctx context.Context, clubID, adminID, targetUserID string) error {
	var role string
	r.db.QueryRow(ctx, `SELECT role::text FROM group_members WHERE group_id = $1::uuid AND user_id = $2::uuid`, clubID, adminID).Scan(&role)
	if role != "admin" && role != "moderator" {
		return errors.New("недостатньо прав")
	}
	_, err := r.db.Exec(ctx, `DELETE FROM group_members WHERE group_id = $1::uuid AND user_id = $2::uuid`, clubID, targetUserID)
	return err
}

// ---- MILESTONES ----

func (r *GroupRepository) AddMilestone(ctx context.Context, clubID, adminID string, req models.CreateMilestoneRequest) (*models.Milestone, error) {
	var role string
	r.db.QueryRow(ctx, `SELECT role::text FROM group_members WHERE group_id = $1::uuid AND user_id = $2::uuid`, clubID, adminID).Scan(&role)
	if role != "admin" {
		return nil, errors.New("тільки засновник може додавати контрольні точки")
	}

	var m models.Milestone
	err := r.db.QueryRow(ctx, `
		INSERT INTO club_milestones (club_id, title, page_limit, deadline_date, discussion_date)
		VALUES ($1::uuid, $2, $3, $4, $5)
		RETURNING id, club_id, title, page_limit, deadline_date::text, discussion_date, is_active, created_at`,
		clubID, req.Title, req.PageLimit, req.DeadlineDate, req.DiscussionDate,
	).Scan(&m.ID, &m.ClubID, &m.Title, &m.PageLimit, &m.DeadlineDate, &m.DiscussionDate, &m.IsActive, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *GroupRepository) GetMilestones(ctx context.Context, clubID string) ([]models.Milestone, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, club_id, title, page_limit, deadline_date::text, discussion_date, is_active, created_at
		FROM club_milestones WHERE club_id = $1::uuid ORDER BY deadline_date ASC`, clubID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var milestones []models.Milestone
	for rows.Next() {
		var m models.Milestone
		if err := rows.Scan(&m.ID, &m.ClubID, &m.Title, &m.PageLimit, &m.DeadlineDate, &m.DiscussionDate, &m.IsActive, &m.CreatedAt); err != nil {
			continue
		}
		milestones = append(milestones, m)
	}
	if milestones == nil {
		milestones = []models.Milestone{}
	}
	return milestones, nil
}

// ---- ПОВІДОМЛЕННЯ ----

func (r *GroupRepository) SaveMessage(ctx context.Context, msg models.ChatMessage) error {
	var clubIDArg, convIDArg interface{}
	if msg.ClubID != nil {
		clubIDArg = *msg.ClubID
	}
	if msg.ConversationID != nil {
		convIDArg = *msg.ConversationID
	}

	msgType := msg.Type
	if msgType == "" {
		msgType = "text"
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO chat_messages (id, club_id, conversation_id, user_id, username, content, type, page_ref, reply_to_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7::message_type, $8, $9)`,
		msg.ID, clubIDArg, convIDArg, msg.UserID, msg.Username,
		msg.Content, msgType, msg.PageRef, msg.ReplyToID,
	)
	return err
}

func (r *GroupRepository) GetRecentMessages(ctx context.Context, clubID string, limit int) ([]models.ChatMessage, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, club_id, user_id, COALESCE(username,''), content, type::text,
			page_ref, reply_to_id, is_deleted, created_at
		FROM chat_messages
		WHERE club_id = $1::uuid AND is_deleted = false
		ORDER BY created_at DESC LIMIT $2`, clubID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		if err := rows.Scan(
			&m.ID, &m.ClubID, &m.UserID, &m.Username, &m.Content,
			&m.Type, &m.PageRef, &m.ReplyToID, &m.IsDeleted, &m.CreatedAt,
		); err != nil {
			continue
		}
		msgs = append(msgs, m)
	}

	// Повертаємо в хронологічному порядку
	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	if msgs == nil {
		msgs = []models.ChatMessage{}
	}
	return msgs, nil
}

func (r *GroupRepository) GetMessagesBefore(ctx context.Context, clubID, beforeID string, limit int) ([]models.ChatMessage, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, club_id, user_id, COALESCE(username,''), content, type::text,
			page_ref, reply_to_id, is_deleted, created_at
		FROM chat_messages
		WHERE club_id = $1::uuid AND is_deleted = false
			AND created_at < (SELECT created_at FROM chat_messages WHERE id = $2::uuid)
		ORDER BY created_at DESC LIMIT $3`, clubID, beforeID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		if err := rows.Scan(
			&m.ID, &m.ClubID, &m.UserID, &m.Username, &m.Content,
			&m.Type, &m.PageRef, &m.ReplyToID, &m.IsDeleted, &m.CreatedAt,
		); err != nil {
			continue
		}
		msgs = append(msgs, m)
	}

	for i, j := 0, len(msgs)-1; i < j; i, j = i+1, j-1 {
		msgs[i], msgs[j] = msgs[j], msgs[i]
	}
	if msgs == nil {
		msgs = []models.ChatMessage{}
	}
	return msgs, nil
}

func (r *GroupRepository) DeleteMessage(ctx context.Context, msgID, userID string) error {
	var msgUserID string
	err := r.db.QueryRow(ctx, `SELECT user_id::text FROM chat_messages WHERE id = $1::uuid`, msgID).Scan(&msgUserID)
	if err != nil {
		return errors.New("повідомлення не знайдено")
	}

	// Перевіряємо чи є адміном/модератором клубу
	var isAdmin bool
	r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM group_members gm
			JOIN chat_messages cm ON cm.club_id = gm.group_id
			WHERE cm.id = $1::uuid AND gm.user_id = $2::uuid AND gm.role IN ('admin','moderator')
		)`, msgID, userID,
	).Scan(&isAdmin)

	if msgUserID != userID && !isAdmin {
		return errors.New("недостатньо прав")
	}

	_, err = r.db.Exec(ctx, `UPDATE chat_messages SET is_deleted = true WHERE id = $1::uuid`, msgID)
	return err
}

// ---- ЗАПРОШЕННЯ ----

func (r *GroupRepository) CreateInvite(ctx context.Context, clubID, inviterID, invitedUserID string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO club_invites (club_id, invited_user_id, invited_by_id)
		VALUES ($1::uuid, $2::uuid, $3::uuid)
		ON CONFLICT DO NOTHING`,
		clubID, invitedUserID, inviterID,
	)
	return err
}

// ---- ДОПОМІЖНІ ----

func generateInviteCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, 8)
	for i := range code {
		code[i] = chars[rand.Intn(len(chars))]
	}
	return string(code)
}

// ---- КОМЕНТАРІ ----

func (r *GroupRepository) AddComment(ctx context.Context, comment models.GroupComment, userID, groupID string) (models.GroupComment, error) {
	err := r.db.QueryRow(ctx, `
		INSERT INTO group_comments (group_id, user_id, content)
		VALUES ($1::uuid, $2::uuid, $3)
		RETURNING id, created_at`,
		groupID, userID, comment.Content,
	).Scan(&comment.ID, &comment.CreatedAt)

	if err != nil {
		return comment, err
	}

	return comment, nil
}

func (r *GroupRepository) GetComments(ctx context.Context, groupID string) ([]models.GroupComment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT c.id, c.group_id, c.user_id, COALESCE(u.username, ''), c.content, c.created_at
		FROM group_comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.group_id = $1::uuid
		ORDER BY c.created_at ASC`, groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.GroupComment
	for rows.Next() {
		var c models.GroupComment
		// Порядок Scan має точно відповідати SELECT
		if err := rows.Scan(&c.ID, &c.GroupID, &c.UserID, &c.Username, &c.Content, &c.CreatedAt); err != nil {
			continue
		}
		comments = append(comments, c)
	}

	if comments == nil {
		comments = []models.GroupComment{}
	}
	return comments, nil
}
