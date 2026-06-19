package utils

import (
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

// Зверніть увагу: назва функції тепер починається з великої літери
func SendResetEmail(userEmail string, resetToken string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	// 1. Вказуємо ваш новий верифікований домен
	fromEmail := "support@readlongue.pp.ua"

	// 2. Вказуємо реальну адресу вашого проєкту на Railway
	// Замініть 'your-app-name.up.railway.app' на ваш справжній лінк
	resetLink := fmt.Sprintf("https://your-app-name.up.railway.app/reset-password?token=%s", resetToken)

	params := &resend.SendEmailRequest{
		From:    fromEmail,
		To:      []string{userEmail},
		Subject: "Відновлення паролю",
		Html:    fmt.Sprintf("<p>Для відновлення паролю перейдіть за цим <a href='%s'>посиланням</a>.</p>", resetLink),
	}

	sent, err := client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("помилка відправки листа: %v", err)
	}

	fmt.Printf("Лист успішно відправлено! ID: %s\n", sent.Id)
	return nil
}
