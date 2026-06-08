package utils

import (
	"fmt"
	"net/smtp"
	"os"
)

func SendResetEmail(toEmail, code string) error {
	from := os.Getenv("SMTP_USER")
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	subject := "Subject: Відновлення пароля ReadLounge\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
		<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#FDFBF7;border-radius:16px;">
			<h2 style="color:#2C5234;margin-bottom:8px;">Відновлення пароля</h2>
			<p style="color:#57534e;font-size:15px;">Введіть цей код у вікні ReadLounge, щоб встановити новий пароль:</p>
			<div style="text-align:center;margin:32px 0;">
				<span style="display:inline-block;font-size:42px;font-weight:800;letter-spacing:12px;color:#2C5234;background:#f0fdf4;padding:16px 28px;border-radius:12px;border:2px dashed #86efac;">%s</span>
			</div>
			<p style="color:#78716c;font-size:13px;">Код дійсний протягом <strong>15 хвилин</strong>. Якщо ви не робили цього запиту — просто проігноруйте лист.</p>
		</div>
	`, code)

	msg := []byte(subject + mime + body)

	auth := smtp.PlainAuth("", from, password, smtpHost)
	return smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{toEmail}, msg)
}