-- ============================================================
-- 002_upgrade_schema.sql
-- Мета: Оновити БД під нову архітектуру (Works/Editions)
-- ============================================================

-- 1. СТВОРЕННЯ НОВИХ ENUM ТИПІВ (безпечне)
DO $$ BEGIN CREATE TYPE club_status AS ENUM ('recruiting','active','discussing','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE message_type AS ENUM ('text','spoiler','system','image'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_type AS ENUM ('follow','like','comment','club_invite','system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Додаємо статус 'read', якщо його ще немає в reading_status
DO $$ BEGIN ALTER TYPE reading_status ADD VALUE IF NOT EXISTS 'read'; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. ТАБЛИЦЯ WORKS (Твори - замінює стару таблицю books)
CREATE TABLE IF NOT EXISTS works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    author_id UUID REFERENCES authors(id) ON DELETE SET NULL,
    description TEXT,
    category VARCHAR(255),
    publication_date DATE,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Переносимо дані зі старої таблиці books у works (якщо works порожня)
INSERT INTO works (id, title, description, created_at)
SELECT id, title, description, created_at FROM books
WHERE NOT EXISTS (SELECT 1 FROM works LIMIT 1)
ON CONFLICT (id) DO NOTHING;

-- 3. ТАБЛИЦЯ EDITIONS (Конкретні видання)
CREATE TABLE IF NOT EXISTS editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    cover_url TEXT,
    page_count INT,
    publisher VARCHAR(255),
    isbn VARCHAR(20),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. ТАБЛИЦЯ USER_EDITIONS (Нова "Полиця", замінює user_books)
CREATE TABLE IF NOT EXISTS user_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    status reading_status DEFAULT 'planned',
    current_page INT DEFAULT 0,
    total_pages INT DEFAULT 0,
    personal_rating DECIMAL(3,2),
    notes TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, work_id)
);

-- Переносимо полиці юзерів (старі user_books -> нові user_editions)
INSERT INTO user_editions (user_id, work_id, status, current_page, total_pages, notes, started_at, finished_at, created_at)
SELECT user_id, book_id, status, current_page, total_pages, notes, started_at, finished_at, created_at FROM user_books
WHERE NOT EXISTS (SELECT 1 FROM user_editions LIMIT 1)
ON CONFLICT (user_id, work_id) DO NOTHING;

-- 5. ТАБЛИЦЯ WORK_REVIEWS (Відгуки)
CREATE TABLE IF NOT EXISTS work_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    has_spoiler BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(work_id, user_id)
);

-- Переносимо старі відгуки
INSERT INTO work_reviews (id, work_id, user_id, rating, review_text, has_spoiler, created_at)
SELECT id, book_id, user_id, rating, comment, is_spoiler, created_at FROM book_reviews
WHERE NOT EXISTS (SELECT 1 FROM work_reviews LIMIT 1)
ON CONFLICT DO NOTHING;

-- 6. ТАБЛИЦЯ ACTIVITY_FEED (Стрічка активності)
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    club_id UUID,
    extra_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. ОНОВЛЕННЯ ІСНУЮЧОЇ ТАБЛИЦІ GROUPS (КЛУБИ)
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS work_id UUID REFERENCES works(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status club_status DEFAULT 'recruiting',
ADD COLUMN IF NOT EXISTS min_members INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_members INT DEFAULT 20,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS discussion_date TIMESTAMPTZ;

-- 8. ОНОВЛЕННЯ ТАБЛИЦІ READING_SESSIONS (Аналітика)
ALTER TABLE reading_sessions 
ADD COLUMN IF NOT EXISTS work_id UUID REFERENCES works(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS session_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS start_page INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_page INT DEFAULT 0;

-- 9. ТАБЛИЦЯ FOLLOWS (Підписки)
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(follower_id, followed_id)
);

-- Переносимо підписки, якщо була стара таблиця user_follows
INSERT INTO follows (follower_id, followed_id, created_at)
SELECT follower_id, followed_id, created_at FROM user_follows
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_follows')
AND NOT EXISTS (SELECT 1 FROM follows LIMIT 1)
ON CONFLICT DO NOTHING;

-- 10. ТАБЛИЦЯ NOTIFICATIONS (Сповіщення)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type notification_type DEFAULT 'system',
    title VARCHAR(255),
    body TEXT,
    link VARCHAR(512),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);