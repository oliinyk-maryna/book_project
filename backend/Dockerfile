# Етап 1: Збірка бінарника
FROM golang:1.25-alpine AS builder

# Встановлюємо робочу папку в контейнері
WORKDIR /app

# Копіюємо залежності та завантажуємо їх
COPY go.mod go.sum ./
RUN go mod download

# Копіюємо весь інший код бекенду
COPY . .

# Компілюємо чистий бінарний файл
RUN go build -o server_bin ./cmd/server/main.go

# Етап 2: Мінімальний контейнер для запуску
FROM alpine:latest
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Копіюємо зкомпільований сервер з першого етапу
COPY --from=builder /app/server_bin .

# Повідомляємо, що додаток працює на порту 8080 (Railway це підхопить)
EXPOSE 8080

# Команда для запуску
CMD ["./server_bin"]