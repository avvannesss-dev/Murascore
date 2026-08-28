/*
# Murascore: Game Hubs, Music, Books, Profile Banners, DM upgrades

## Purpose
Adds tables for game-specific comments, music tracks, books with chapters,
blocked users (DM blacklist), and extends the profiles table with banner/avatar columns.
Also adds a `read` column to messages for read receipts.

## New Tables

1. `game_comments` — comments on game hub pages
   - `id` (uuid, PK)
   - `game_id` (uuid, FK to games)
   - `author` (text — nickname or guest name)
   - `text` (text)
   - `image_url` (text, nullable)
   - `is_guest` (boolean, default false)
   - `created_at` (timestamptz)

2. `music_tracks` — tracks for the "УдОвОлЬсТвИе НоЧу" player
   - `id` (uuid, PK)
   - `title` (text)
   - `artist` (text, default 'УдОвОлЬсТвИе НоЧу')
   - `audio_url` (text)
   - `duration` (int, nullable)
   - `created_at` (timestamptz)

3. `books` — books by Игорь Горь
   - `id` (uuid, PK)
   - `title` (text)
   - `description` (text)
   - `author` (text, default 'Игорь Горь')
   - `cover_url` (text, nullable)
   - `created_at` (timestamptz)

4. `book_chapters` — chapters within a book
   - `id` (uuid, PK)
   - `book_id` (uuid, FK to books)
   - `title` (text)
   - `content` (text)
   - `order_index` (int)
   - `created_at` (timestamptz)

5. `blocked_users` — DM blacklist
   - `id` (uuid, PK)
   - `blocker` (text — nickname)
   - `blocked` (text — nickname)
   - `created_at` (timestamptz)
   - UNIQUE constraint on (blocker, blocked)

## Modified Tables

1. `profiles` — added columns:
   - `banner_url` (text, nullable) — custom profile banner image
   - `avatar_url` (text, nullable) — custom avatar image

2. `messages` — added columns:
   - `read` (boolean, default false) — read receipt flag
   - `attachment_url` (text, nullable) — file/image attachment URL
   - `attachment_name` (text, nullable) — attachment filename

## Security
- All new tables have RLS enabled.
- All policies use `TO anon, authenticated` since this app uses nickname-based auth (no Supabase Auth sessions).
- `USING (true)` / `WITH CHECK (true)` is used because the app is intentionally public/shared (nickname-based, no auth.uid()).
- blocked_users: anyone can read (to check blocks), anyone can insert (block action).

## Notes
1. All tables are single-tenant / public-shared — the app uses nickname-based auth stored in `users` table, not Supabase Auth.
2. The `read` column on messages defaults to false; the app sets it to true when the recipient opens the thread.
3. `game_comments.is_guest` distinguishes registered users from anonymous commenters.
4. Book chapters are ordered by `order_index` for proper reading flow.
*/

-- ============================================================
-- game_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS game_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  author text NOT NULL,
  text text NOT NULL,
  image_url text,
  is_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_game_comments" ON game_comments;
CREATE POLICY "anon_select_game_comments" ON game_comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_game_comments" ON game_comments;
CREATE POLICY "anon_insert_game_comments" ON game_comments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_game_comments" ON game_comments;
CREATE POLICY "anon_delete_game_comments" ON game_comments FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- music_tracks
-- ============================================================
CREATE TABLE IF NOT EXISTS music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL DEFAULT 'УдОвОлЬсТвИе НоЧу',
  audio_url text NOT NULL,
  duration int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_music" ON music_tracks;
CREATE POLICY "anon_select_music" ON music_tracks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_music" ON music_tracks;
CREATE POLICY "anon_insert_music" ON music_tracks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_music" ON music_tracks;
CREATE POLICY "anon_delete_music" ON music_tracks FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- books
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT 'Игорь Горь',
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_books" ON books;
CREATE POLICY "anon_select_books" ON books FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_books" ON books;
CREATE POLICY "anon_insert_books" ON books FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_books" ON books;
CREATE POLICY "anon_delete_books" ON books FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- book_chapters
-- ============================================================
CREATE TABLE IF NOT EXISTS book_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chapters" ON book_chapters;
CREATE POLICY "anon_select_chapters" ON book_chapters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chapters" ON book_chapters;
CREATE POLICY "anon_insert_chapters" ON book_chapters FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chapters" ON book_chapters;
CREATE POLICY "anon_delete_chapters" ON book_chapters FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- blocked_users
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker text NOT NULL,
  blocked text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker, blocked)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_blocked" ON blocked_users;
CREATE POLICY "anon_select_blocked" ON blocked_users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_blocked" ON blocked_users;
CREATE POLICY "anon_insert_blocked" ON blocked_users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_blocked" ON blocked_users;
CREATE POLICY "anon_delete_blocked" ON blocked_users FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- profiles: add banner_url and avatar_url
-- ============================================================
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- messages: add read, attachment_url, attachment_name
-- ============================================================
DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS read boolean NOT NULL DEFAULT false;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text;
  ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name text;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_game_comments_game_id ON game_comments(game_id);
CREATE INDEX IF NOT EXISTS idx_book_chapters_book_id ON book_chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker);
CREATE INDEX IF NOT EXISTS idx_music_tracks_created ON music_tracks(created_at);
