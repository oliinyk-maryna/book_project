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

	_, err = tx.Exec(ctx, `
		INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
		club.ID, creatorID,
	)
	if err != nil {
		return nil, err
	}

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
func (r *GroupRepository) GetClubMembers(ctx context.Context, clubID string) ([]models.GroupMember, error) {
	query := `
        SELECT 
            u.id::text, 
            u.username, 
            COALESCE(ue.current_page, 0) as current_page,
            gm.role
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        LEFT JOIN groups g ON g.id = gm.group_id
        LEFT JOIN user_editions ue ON ue.user_id = gm.user_id AND ue.work_id = g.work_id
        WHERE gm.group_id = $1::uuid`

	rows, err := r.db.Query(ctx, query, clubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.GroupMember
	for rows.Next() {
		var m models.GroupMember
		err := rows.Scan(&m.ID, &m.Username, &m.CurrentPage, &m.Role)
		if err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func (r *GroupRepository) GetClubs(ctx context.Context, workID string, userID string) ([]models.Club, error) {
	args := []any{}
	argIdx := 1

	selectClause := `
		SELECT g.id, g.name, COALESCE(g.description,''), g.creator_id,
			COALESCE(u.username,'') as creator_name,
			COALESCE(g.invite_code,''),
			g.status::text, g.min_members, g.max_members, g.is_private,
			COUNT(gm.user_id)::int as members_count,
			COALESCE(w.title,'') as book_title,
			COALESCE(a.name,'') as book_author,
			COALESCE(e.cover_url,'') as book_cover,
			COALESCE(g.current_page_limit,0),
			g.discussion_date,
			COALESCE(e.page_count,0),
			g.created_at, g.updated_at`

	if userID != "" {
		selectClause += fmt.Sprintf(`, COALESCE((SELECT role::text FROM group_members WHERE group_id = g.id AND user_id = $%d::uuid LIMIT 1), '') as user_role`, argIdx)
		args = append(args, userID)
		argIdx++
	} else {
		selectClause += `, '' as user_role`
	}

	fromClause := `
		FROM groups g
		LEFT JOIN users u ON g.creator_id = u.id
		LEFT JOIN group_members gm ON g.id = gm.group_id
		LEFT JOIN works w ON g.work_id = w.id
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON e.work_id = w.id`

	whereConditions := `(g.is_private = false AND g.status IN ('recruiting','active','discussing'))`
	if userID != "" {
		whereConditions = fmt.Sprintf(`(%s OR EXISTS(SELECT 1 FROM group_members gm2 WHERE gm2.group_id = g.id AND gm2.user_id = $%d::uuid))`, whereConditions, argIdx-1)
	}

	if workID != "" {
		whereConditions += fmt.Sprintf(` AND g.work_id = $%d::uuid`, argIdx)
		args = append(args, workID)
		argIdx++
	}

	query := selectClause + fromClause + " WHERE " + whereConditions + ` GROUP BY g.id, u.username, w.title, a.name, e.cover_url, e.page_count, g.discussion_date ORDER BY g.created_at DESC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		fmt.Println("Помилка Query у GetClubs:", err)
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
			&c.CurrentPage, &c.DiscussionDate, &c.TotalPages, &c.CreatedAt, &c.UpdatedAt, &c.UserRole,
		)
		if err != nil {
			fmt.Println("Помилка Scan у GetClubs:", err) // Виводимо помилку в консоль
			continue
		}

		// Якщо людина має якусь роль — вона є в клубі
		if c.UserRole != "" {
			c.IsMember = true
		}

		clubs = append(clubs, c)
	}
	if clubs == nil {
		clubs = []models.Club{}
	}
	return clubs, nil
}

// Файл: internal/repository/group_repo.go
func (r *GroupRepository) GetClubByID(ctx context.Context, clubID, userID string) (*models.Club, error) {
	safeUserID := userID
	if safeUserID == "" {
		safeUserID = "00000000-0000-0000-0000-000000000000"
	}

	var c models.Club
	err := r.db.QueryRow(ctx, `
		SELECT g.id, g.name, COALESCE(g.description,''), g.creator_id,
			COALESCE(u.username,'') as creator_name,
			COALESCE(g.invite_code,''), g.status::text,
			g.min_members, g.max_members, g.is_private,
			COUNT(gm.user_id)::int as members_count,
			COALESCE(w.title,'') as book_title,
			COALESCE(a.name,'') as book_author,
			COALESCE(e.cover_url,'') as book_cover,
			COALESCE(e.page_count,0), COALESCE(g.current_page_limit,0),
			g.discussion_date,
			g.created_at, g.updated_at,
			COALESCE((SELECT role::text FROM group_members gm2 WHERE gm2.group_id = g.id AND gm2.user_id = $2::uuid LIMIT 1), '') as user_role
		FROM groups g
		LEFT JOIN users u ON g.creator_id = u.id
		LEFT JOIN group_members gm ON g.id = gm.group_id
		LEFT JOIN works w ON g.work_id = w.id
		LEFT JOIN authors a ON w.author_id = a.id
		LEFT JOIN editions e ON e.work_id = w.id
		WHERE g.id = $1::uuid
		GROUP BY g.id, u.username, w.title, a.name, e.cover_url, e.page_count, g.discussion_date`,
		clubID, safeUserID,
	).Scan(
		&c.ID, &c.Name, &c.Description, &c.CreatorID, &c.CreatorName,
		&c.InviteCode, &c.Status, &c.MinMembers, &c.MaxMembers, &c.IsPrivate,
		&c.MembersCount, &c.BookTitle, &c.BookAuthor, &c.BookCover,
		&c.TotalPages, &c.CurrentPage, &c.DiscussionDate, &c.CreatedAt, &c.UpdatedAt, &c.UserRole,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("клуб не знайдено")
		}
		fmt.Println("Помилка Scan у GetClubByID:", err)
		return nil, err
	}

	// Якщо людина має якусь роль — вона є в клубі
	if c.UserRole != "" {
		c.IsMember = true
	}

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

// DeleteClub — видаляє клуб повністю (тільки адмін)
func (r *GroupRepository) DeleteClub(ctx context.Context, clubID, userID string) error {
	var role string
	err := r.db.QueryRow(ctx,
		`SELECT role::text FROM group_members WHERE group_id = $1::uuid AND user_id = $2::uuid`,
		clubID, userID,
	).Scan(&role)
	if err != nil || role != "admin" {
		return errors.New("лише адмін може видалити клуб")
	}
	_, err = r.db.Exec(ctx, `DELETE FROM groups WHERE id = $1::uuid`, clubID)
	return err
}

func (r *GroupRepository) UpdateClubStatus(ctx context.Context, clubID, userID, status string) error {
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
	if err != nil || (role != "admin" && role != "moderator") {
		return errors.New("недостатньо прав")
	}

	// Приймаємо формат YYYY-MM-DD від фронтенду, зберігаємо як TIMESTAMPTZ
	_, err = r.db.Exec(ctx,
		`UPDATE groups SET discussion_date = $1::date WHERE id = $2::uuid`,
		date, clubID,
	)
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
	// Робимо LEFT JOIN з ПРАВИЛЬНОЮ таблицею (user_editions ue)
	query := `
		SELECT 
			gm.group_id, 
			gm.user_id, 
			COALESCE(u.username, ''), 
			COALESCE(u.avatar_url, ''),
			gm.role::text, 
			gm.joined_at,
			COALESCE(ue.current_page, 0) as current_page
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		JOIN groups g ON g.id = gm.group_id
		LEFT JOIN user_editions ue ON ue.user_id = gm.user_id AND ue.work_id = g.work_id
		WHERE gm.group_id = $1::uuid
		ORDER BY gm.joined_at ASC`

	rows, err := r.db.Query(ctx, query, clubID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.GroupMember
	for rows.Next() {
		var m models.GroupMember
		// Скануємо всі поля. Якщо ue.current_page пустий, COALESCE дасть 0
		if err := rows.Scan(&m.GroupID, &m.UserID, &m.Username, &m.Avatar, &m.Role, &m.JoinedAt, &m.CurrentPage); err == nil {
			members = append(members, m)
		}
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
	// Вибрано всі необхідні поля без CASE WHEN is_deleted
	rows, err := r.db.Query(ctx, `
		SELECT id, club_id, user_id, COALESCE(username,''), content, 
		type::text, page_ref, reply_to_id, is_deleted, is_edited, created_at
		FROM chat_messages 
		WHERE club_id = $1::uuid
		ORDER BY created_at DESC LIMIT $2`, clubID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []models.ChatMessage
	for rows.Next() {
		var m models.ChatMessage
		// Скануємо всі поля, включаючи is_deleted та is_edited
		if err := rows.Scan(
			&m.ID, &m.ClubID, &m.UserID, &m.Username, &m.Content,
			&m.Type, &m.PageRef, &m.ReplyToID, &m.IsDeleted, &m.IsEdited, &m.CreatedAt,
		); err != nil {
			continue // або можна повертати помилку залежно від того, як ви хочете обробляти сканування
		}
		msgs = append(msgs, m)
	}

	// Розвертаємо масив, щоб повідомлення були у хронологічному порядку
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
			page_ref, reply_to_id, is_deleted, is_edited, created_at
		FROM chat_messages
		WHERE club_id = $1::uuid 
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
		// Додано &m.IsEdited у Scan
		if err := rows.Scan(
			&m.ID, &m.ClubID, &m.UserID, &m.Username, &m.Content,
			&m.Type, &m.PageRef, &m.ReplyToID, &m.IsDeleted, &m.IsEdited, &m.CreatedAt,
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

func (r *GroupRepository) CreateInvite(ctx context.Context, clubID, inviterID, invitedUserID string) (string, error) {
	// 1. Перевірка на адміна (залишаємо як було)
	var isAdmin bool
	err := r.db.QueryRow(ctx, `
        SELECT EXISTS(
            SELECT 1 FROM group_members
            WHERE group_id = $1::uuid AND user_id = $2::uuid AND role IN ('admin','moderator')
        )`, clubID, inviterID).Scan(&isAdmin)

	if err != nil {
		return "", err
	}
	if !isAdmin {
		return "", errors.New("лише адміністратор клубу може надсилати запрошення")
	}

	// 2. Вставляємо і повертаємо ID через RETURNING
	var inviteID string
	err = r.db.QueryRow(ctx, `
        INSERT INTO club_invites (club_id, invited_user_id, invited_by_id)
        VALUES ($1::uuid, $2::uuid, $3::uuid)
        RETURNING id`, // <--- Ось магічний рядок
		clubID, invitedUserID, inviterID,
	).Scan(&inviteID)

	if err != nil {
		return "", err
	}

	return inviteID, nil
}

func generateInviteCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	code := make([]byte, 8)
	for i := range code {
		code[i] = chars[rand.Intn(len(chars))]
	}
	return string(code)
}

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

// GetUserInvites — повертає список активних запрошень для конкретного користувача
func (r *GroupRepository) GetUserInvites(ctx context.Context, userID string) ([]models.UserInviteResponse, error) {
	query := `
		SELECT ci.id, ci.club_id, g.name, u.username, ci.status, ci.created_at
		FROM club_invites ci
		JOIN groups g ON ci.club_id = g.id
		JOIN users u ON ci.invited_by_id = u.id
		WHERE ci.invited_user_id = $1::uuid AND ci.status = 'pending'
		ORDER BY ci.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invites []models.UserInviteResponse
	for rows.Next() {
		var inv models.UserInviteResponse
		if err := rows.Scan(&inv.ID, &inv.ClubID, &inv.ClubName, &inv.InvitedBy, &inv.Status, &inv.CreatedAt); err != nil {
			return nil, err
		}
		invites = append(invites, inv)
	}
	return invites, nil
}

// AcceptInvite — приймає запрошення: змінює статус на 'accepted',
// додає користувача до членів клубу та автоматично додає книгу на полицю ('planned')
func (r *GroupRepository) AcceptInvite(ctx context.Context, inviteID, userID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	// Гарантуємо відкат транзакції у разі помилки
	defer tx.Rollback(ctx)

	// 1. Отримуємо club_id та перевіряємо, чи інвайт дійсно належить цьому юзеру
	var clubID string
	err = tx.QueryRow(ctx, `
        UPDATE club_invites 
        SET status = 'accepted' 
        WHERE id = $1::uuid AND invited_user_id = $2::uuid AND status = 'pending'
        RETURNING club_id::text`, inviteID, userID).Scan(&clubID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("запрошення не знайдено або воно вже недійсне")
		}
		return err
	}

	// 2. Додаємо користувача в учасники клубу (group_members)
	_, err = tx.Exec(ctx, `
        INSERT INTO group_members (group_id, user_id, role) 
        VALUES ($1::uuid, $2::uuid, 'member')
        ON CONFLICT (group_id, user_id) DO NOTHING`, clubID, userID)
	if err != nil {
		return err
	}

	// 3. Отримуємо work_id (ID книги), прив'язаний до цього клубу
	var workID *string
	err = tx.QueryRow(ctx, "SELECT work_id::text FROM groups WHERE id = $1::uuid", clubID).Scan(&workID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	// 4. Якщо у клубу є прив'язана книга, додаємо її на полицю користувача (якщо її там ще немає)
	if workID != nil && *workID != "" {
		var exists bool
		err = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM user_editions WHERE user_id = $1::uuid AND work_id = $2::uuid)", userID, *workID).Scan(&exists)
		if err != nil {
			return err
		}

		// Якщо книги на полиці немає, створюємо новий запис
		if !exists {
			// Дістаємо кількість сторінок (як у вашій функції EnsureUserBookExists)
			var totalPages int
			err = tx.QueryRow(ctx, `SELECT COALESCE(page_count, 1) FROM editions WHERE work_id = $1::uuid LIMIT 1`, *workID).Scan(&totalPages)
			if err != nil {
				totalPages = 1
			}

			// Додаємо книгу в user_editions зі статусом 'planned'
			_, err = tx.Exec(ctx, `
                INSERT INTO user_editions (user_id, work_id, status, total_pages, current_page, updated_at)
                VALUES ($1::uuid, $2::uuid, 'planned', $3, 0, NOW())
                ON CONFLICT (user_id, work_id) DO NOTHING
            `, userID, *workID, totalPages)

			if err != nil {
				return err
			}
		}
	}

	// Зберігаємо всі зміни в базі даних
	return tx.Commit(ctx)
}

// RejectInvite — відхиляє запрошення (змінює статус на 'rejected')
func (r *GroupRepository) RejectInvite(ctx context.Context, inviteID, userID string) error {
	cmd, err := r.db.Exec(ctx, `
		UPDATE club_invites 
		SET status = 'rejected' 
		WHERE id = $1::uuid AND invited_user_id = $2::uuid AND status = 'pending'`,
		inviteID, userID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("запрошення не знайдено або вже оброблено")
	}
	return nil
}
func (r *GroupRepository) EditMessage(ctx context.Context, messageID, userID, newContent string) error {
	// Оновлюємо повідомлення лише якщо user_id співпадає (автор).
	// Також дозволяємо адмінам/модераторам клубу редагувати будь-яке повідомлення.
	result, err := r.db.Exec(ctx, `
		UPDATE chat_messages
		SET content = $1, is_edited = true, updated_at = NOW()
		WHERE id = $2::uuid
		  AND (
		    user_id = $3::uuid
		    OR EXISTS (
		      SELECT 1 FROM group_members gm
		      JOIN chat_messages cm ON cm.club_id = gm.group_id
		      WHERE cm.id = $2::uuid
		        AND gm.user_id = $3::uuid
		        AND gm.role IN ('admin', 'moderator')
		    )
		  )
	`, newContent, messageID, userID)

	if err != nil {
		return fmt.Errorf("помилка оновлення: %v", err)
	}

	if result.RowsAffected() == 0 {
		// Перевіряємо чи повідомлення взагалі існує
		var exists bool
		r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM chat_messages WHERE id = $1::uuid)`, messageID).Scan(&exists)
		if !exists {
			return errors.New("повідомлення не знайдено")
		}
		return errors.New("ви не маєте права редагувати це повідомлення")
	}

	return nil
}

// EnsureUserBookExists перевіряє, чи є книга на полиці юзера. Якщо ні - додає зі статусом 'reading'
func (r *GroupRepository) EnsureUserBookExists(ctx context.Context, userID, workID string) error {
	// Перевіряємо у ПРАВИЛЬНІЙ таблиці (user_editions)
	var exists bool
	err := r.db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM user_editions WHERE user_id = $1::uuid AND work_id = $2::uuid)", userID, workID).Scan(&exists)
	if err != nil {
		return err
	}

	// Якщо запису немає, створюємо його
	if !exists {
		// Дістаємо кількість сторінок (як це робить ваш user_book_repo.go)
		var totalPages int
		err := r.db.QueryRow(ctx, `SELECT COALESCE(page_count, 1) FROM editions WHERE work_id = $1::uuid LIMIT 1`, workID).Scan(&totalPages)
		if err != nil {
			totalPages = 1
		}

		// Додаємо в user_editions
		_, err = r.db.Exec(ctx, `
			INSERT INTO user_editions (user_id, work_id, status, total_pages, current_page, updated_at)
			VALUES ($1::uuid, $2::uuid, 'planned', $3, 0, NOW())
		`, userID, workID, totalPages)
		return err
	}
	return nil
}

func (r *GroupRepository) GetWorkIDByGroupID(ctx context.Context, groupID string) (string, error) {
	var workID string
	err := r.db.QueryRow(ctx, "SELECT work_id::text FROM groups WHERE id = $1::uuid", groupID).Scan(&workID)
	return workID, err
}

// GetClubIDByInviteID повертає ID клубу на основі ID запрошення
func (r *GroupRepository) GetClubIDByInviteID(ctx context.Context, inviteID string) (string, error) {
	var clubID string

	// Звертаємося до таблиці запрошень (group_invites), щоб дістати group_id
	err := r.db.QueryRow(ctx, "SELECT group_id::text FROM group_invites WHERE id = $1::uuid", inviteID).Scan(&clubID)
	if err != nil {
		return "", err
	}

	return clubID, nil
}
