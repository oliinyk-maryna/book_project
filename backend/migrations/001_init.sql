-- ==============================================================================
-- 1. РОЗШИРЕННЯ ТА ТИПИ ДАНИХ
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Для gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- Для швидкого текстового пошуку

-- Ідемпотентне створення ENUM-ів (безпечно для міграцій)
DO $$ BEGIN
    CREATE TYPE reading_status AS ENUM ('planned', 'reading', 'finished', 'dropped');

EXCEPTION WHEN duplicate_object THEN NULL;

END $$;

DO $$ BEGIN
    CREATE TYPE group_role AS ENUM ('admin', 'moderator', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE reading_pace_enum AS ENUM ('slow', 'medium', 'fast');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Універсальна функція для автоматичного оновлення поля updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================================================
-- 2. КОРИСТУВАЧІ ТА СОЦІАЛЬНІ ЗВ'ЯЗКИ
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_users_modtime ON users;

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID REFERENCES users (id) ON DELETE CASCADE,
    following_id UUID REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_id, following_id),
        CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    reading_pace reading_pace_enum DEFAULT 'medium',
    updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_prefs_modtime ON user_preferences;

CREATE TRIGGER update_prefs_modtime BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==============================================================================
-- 3. КАТАЛОГ КНИГ ТА МЕТАДАНІ
-- ==============================================================================
CREATE TABLE IF NOT EXISTS authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    photo_url TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    title VARCHAR(255) NOT NULL,
    author_id UUID REFERENCES authors (id) ON DELETE SET NULL,
    description TEXT,
    cover_url TEXT,
    page_count INT CHECK (page_count > 0),
    publication_date DATE,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings INT DEFAULT 0,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_books_modtime ON books;

CREATE TRIGGER update_books_modtime BEFORE UPDATE ON books FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS book_genres (
    book_id UUID REFERENCES books (id) ON DELETE CASCADE,
    genre_id INT REFERENCES genres (id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, genre_id)
);

CREATE TABLE IF NOT EXISTS user_favorite_genres (
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    genre_id INT REFERENCES genres (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, genre_id)
);

-- ==============================================================================
-- 4. ІНДИВІДУАЛЬНЕ ЧИТАННЯ, ВІДГУКИ ТА СТАТИСТИКА
-- ==============================================================================

-- Таблиця полиць (доданих книг)
CREATE TABLE IF NOT EXISTS user_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    status reading_status DEFAULT 'planned',
    current_page INTEGER DEFAULT 0 CHECK (current_page >= 0),
    total_pages INTEGER NOT NULL CHECK (total_pages > 0),
    personal_rating DECIMAL(3, 2) CHECK (
        personal_rating >= 0
        AND personal_rating <= 5
    ),
    notes TEXT,
    started_at TIMESTAMP
    WITH
        TIME ZONE,
        finished_at TIMESTAMP
    WITH
        TIME ZONE,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, book_id)
);

DROP TRIGGER IF EXISTS update_ub_modtime ON user_books;

CREATE TRIGGER update_ub_modtime BEFORE UPDATE ON user_books FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Рецензії на книги
CREATE TABLE IF NOT EXISTS book_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    book_id UUID REFERENCES books (id) ON DELETE CASCADE,
    rating INT CHECK (
        rating >= 1
        AND rating <= 5
    ) NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, book_id)
);

DROP TRIGGER IF EXISTS update_reviews_modtime ON book_reviews;

CREATE TRIGGER update_reviews_modtime BEFORE UPDATE ON book_reviews FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Тригер перерахунку середнього рейтингу книги
CREATE OR REPLACE FUNCTION update_book_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_book_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_book_id := OLD.book_id;
    ELSE
        v_book_id := NEW.book_id;
    END IF;

    UPDATE books
    SET average_rating = (SELECT COALESCE(AVG(rating), 0) FROM book_reviews WHERE book_id = v_book_id),
        total_ratings = (SELECT COUNT(*) FROM book_reviews WHERE book_id = v_book_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_book_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_book_rating_trigger ON book_reviews;

CREATE TRIGGER update_book_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON book_reviews
FOR EACH ROW EXECUTE PROCEDURE update_book_rating();

-- Трекер читання (Таймер)
CREATE TABLE IF NOT EXISTS reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    book_id UUID REFERENCES books (id) ON DELETE CASCADE,
    session_date DATE DEFAULT CURRENT_DATE,
    pages_read INT NOT NULL CHECK (pages_read > 0),
    duration_seconds INT CHECK (duration_seconds > 0), -- Змінено на секунди для більшої точності
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Річні цілі користувача
CREATE TABLE IF NOT EXISTS reading_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    goal_year INT NOT NULL,
    target_books INT DEFAULT 0,
    target_pages INT DEFAULT 0,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, goal_year)
);

DROP TRIGGER IF EXISTS update_goals_modtime ON reading_goals;

CREATE TRIGGER update_goals_modtime BEFORE UPDATE ON reading_goals FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- ==============================================================================
-- 5. ГРУПОВІ ЧИТАННЯ ТА ОБГОВОРЕННЯ (КЛУБИ)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users (id) ON DELETE SET NULL,
    current_book_id UUID REFERENCES books (id) ON DELETE SET NULL,
    invite_code VARCHAR(10) UNIQUE,
    is_temporary BOOLEAN DEFAULT false, -- Для тимчасових кімнат
    expires_at TIMESTAMP
    WITH
        TIME ZONE, -- Час життя тимчасової кімнати
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_groups_modtime ON groups;

CREATE TRIGGER update_groups_modtime BEFORE UPDATE ON groups FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID REFERENCES groups (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    role group_role DEFAULT 'member',
    joined_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    group_id UUID REFERENCES groups (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    book_id UUID REFERENCES books (id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page_number INTEGER, -- На якій сторінці залишено коментар (для приховання спойлерів)
    is_spoiler BOOLEAN DEFAULT false,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. ТОПИ ТА НАГОРОДИ (Goodreads Choice Awards Style)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS award_categories (
    id SERIAL PRIMARY KEY,
    award_year INT NOT NULL,
    title VARCHAR(255) NOT NULL, -- Наприклад: "Художня література 2025"
    UNIQUE (award_year, title)
);

CREATE TABLE IF NOT EXISTS award_nominees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    category_id INT REFERENCES award_categories (id) ON DELETE CASCADE,
    book_id UUID REFERENCES books (id) ON DELETE CASCADE,
    votes_count INT DEFAULT 0,
    UNIQUE (category_id, book_id)
);

CREATE TABLE IF NOT EXISTS user_award_votes (
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    category_id INT REFERENCES award_categories (id) ON DELETE CASCADE,
    nominee_id UUID REFERENCES award_nominees (id) ON DELETE CASCADE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, category_id) -- Один користувач = один голос у конкретній категорії
);

-- ==============================================================================
-- 7. ІНДЕКСИ ДЛЯ ОПТИМІЗАЦІЇ
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_books_author ON books (author_id);

CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON books USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_books_updated ON user_books (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_comments_group ON group_comments (group_id);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_composite ON reading_sessions (
    user_id,
    book_id,
    session_date
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_book_genres_genre ON book_genres (genre_id);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);

CREATE INDEX IF NOT EXISTS idx_user_fav_genres_genre ON user_favorite_genres (genre_id);

CREATE INDEX IF NOT EXISTS idx_award_nominees_category ON award_nominees (category_id);