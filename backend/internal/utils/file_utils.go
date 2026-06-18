package utils

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// SaveUploadedFile приймає файл з форми і зберігає його локально
func SaveUploadedFile(r *http.Request, formKey string, destFolder string) (string, error) {
	// 1. Отримуємо файл з форми (максимум 10 MB)
	r.ParseMultipartForm(10 << 20)
	file, handler, err := r.FormFile(formKey)
	if err != nil {
		if err == http.ErrMissingFile {
			return "", nil // Файл не передали, це не помилка, просто повертаємо порожній рядок
		}
		return "", err
	}
	defer file.Close()

	// 2. Створюємо папку, якщо її ще немає (наприклад, uploads/covers)
	fullPath := filepath.Join(".", destFolder)
	if err := os.MkdirAll(fullPath, os.ModePerm); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// 3. Генеруємо унікальне ім'я файлу (щоб не перезаписати існуючі)
	ext := filepath.Ext(handler.Filename)
	if ext == "" {
		ext = ".jpg" // дефолт
	}
	newFileName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	filePath := filepath.Join(fullPath, newFileName)

	// 4. Створюємо порожній файл на диску
	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file on disk: %w", err)
	}
	defer dst.Close()

	// 5. Копіюємо вміст
	if _, err := io.Copy(dst, file); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	// Повертаємо URL-шлях, який ми запишемо в БД
	// Якщо папка "uploads/covers", шлях буде "/uploads/covers/12345.jpg"
	return "/" + filepath.ToSlash(filePath), nil
}
