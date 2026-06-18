package utils

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"os"
)

func SendResetEmail(toEmail, code string) error {
	from := os.Getenv("SMTP_USER")
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := "smtp.gmail.com"
	smtpPort := "465" // Перемикаємо на SSL порт

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

	// Конфігурація безпечного з'єднання TLS
	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         smtpHost,
	}

	// 1. Встановлюємо шифроване TCP-з'єднання
	conn, err := tls.Dial("tcp", smtpHost+":"+smtpPort, tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to connect via TLS: %w", err)
	}
	defer conn.Close()

	// 2. Створюємо новий SMTP-клієнт на базі цього з'єднання
	client, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Quit()

	// 3. Проходимо авторизацію (PlainAuth працює всередині вже зашифрованого тунелю)
	auth := smtp.PlainAuth("", from, password, smtpHost)
	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}

	// 4. Задаємо відправника
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("failed to set sender: %w", err)
	}

	// 5. Задаємо отримувача
	if err := client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("failed to set recipient: %w", err)
	}

	// 6. Відкриваємо потік для запису тіла листа і відправляємо дані
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to open data writer: %w", err)
	}

	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("failed to write message body: %w", err)
	}

	return w.Close()
}
