package worker

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// StartDiscussionNotifier запускає фоновий процес, який перевіряє наближення дат обговорень
func StartDiscussionNotifier(db *pgxpool.Pool) {
	// Перевіряємо базу кожну годину
	ticker := time.NewTicker(1 * time.Hour)

	go func() {
		for range ticker.C {
			notifyUpcomingDiscussions(db)
		}
	}()

	log.Println("Фоновий планувальник сповіщень запущено")
}

func notifyUpcomingDiscussions(db *pgxpool.Pool) {
	ctx := context.Background()

	// Знаходимо клуби, де discussion_date настане у проміжку від 23 до 24 годин від поточного моменту
	query := `
		SELECT id, name 
		FROM groups 
		WHERE discussion_date >= NOW() + INTERVAL '23 hours' 
		  AND discussion_date <= NOW() + INTERVAL '24 hours'
		  AND status != 'archived'
	`

	rows, err := db.Query(ctx, query)
	if err != nil {
		log.Printf("Помилка запиту майбутніх обговорень: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var clubID, clubName string
		if err := rows.Scan(&clubID, &clubName); err != nil {
			continue
		}

		// Знаходимо всіх учасників цього клубу і надсилаємо їм сповіщення
		notifyQuery := `
			INSERT INTO notifications (user_id, type, title, body, entity_id, entity_type)
			SELECT user_id, 'club_reminder', 'Нагадування про обговорення', 
			       'Обговорення в клубі «' || $1 || '» розпочнеться вже завтра!', $2::uuid, 'club'
			FROM group_members WHERE group_id = $2::uuid
		`
		_, err = db.Exec(ctx, notifyQuery, clubName, clubID)
		if err != nil {
			log.Printf("Помилка створення сповіщень для клубу %s: %v", clubID, err)
		} else {
			log.Printf("Надіслано нагадування учасникам клубу %s", clubName)
		}
	}
}
