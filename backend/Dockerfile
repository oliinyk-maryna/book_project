FROM golang:1.25-alpine

WORKDIR /app

# Копіюємо всі файли проєкту
COPY . .

# Завантажуємо модулі
RUN go mod download

# Збираємо застосунок
RUN go build -o server_bin ./cmd/server/main.go

# Запускаємо сервер
CMD ["./server_bin"]