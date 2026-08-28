/*
# Murascore: Global forum schema (posts, comments, reactions, games, profiles, messages)

1. Purpose
   Replaces localStorage with a global Supabase-backed store so that every
   user worldwide sees the identical live feed of posts, comments, reactions
   and games. Data is intentionally public/shared (no Supabase Auth sign-in
   screen — the app uses its own PBKDF2 credential store in a `users` table),
   so all policies are scoped to `anon, authenticated`.

2. New Tables (creation order respects FK dependencies)
   - `games`        — User-added games (name, cover URL, rating). Created first because posts.game_id references it.
   - `users`        — PBKDF2 credential store (nickname, salt, hash). No plaintext passwords.
   - `posts`        — Forum posts with title, body, category, author, game link, pin flag.
   - `comments`     — Comments on posts (FK -> posts).
   - `reactions`    — Rock/Popsa reactions on posts (unique per user+post+type).
   - `profiles`     — Per-user profile metadata (following list stored as text[]).
   - `messages`     — Direct messages between users (sender, recipient, body).

3. Admin Notice
   A pinned post is seeded as the first row in `posts` with `is_pinned = true`:
   "[ВНИМАНИЕ] Если нужной игры нет в базе, пишите её название вручную в заголовке поста!"

4. Security (RLS)
   RLS enabled on every table. Because the app has NO Supabase sign-in screen
   (it uses its own PBKDF2 auth in the `users` table), policies are scoped to
   `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` — the
   data is intentionally public/shared across all devices.
*/

-- ============================================================
-- GAMES (created first — posts.game_id references this)
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  cover_url   text NOT NULL DEFAULT '',
  rating      double precision NOT NULL DEFAULT 7.0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_games" ON games;
CREATE POLICY "anon_select_games" ON games FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_games" ON games;
CREATE POLICY "anon_insert_games" ON games FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_games" ON games;
CREATE POLICY "anon_update_games" ON games FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_games" ON games;
CREATE POLICY "anon_delete_games" ON games FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- USERS (PBKDF2 credential store)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname    text UNIQUE NOT NULL,
  salt        text NOT NULL,
  hash        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_users" ON users;
CREATE POLICY "anon_read_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  body         text NOT NULL DEFAULT '',
  category     text NOT NULL DEFAULT 'posts',
  author       text NOT NULL,
  game_id      uuid REFERENCES games(id) ON DELETE SET NULL,
  is_pinned    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_posts" ON posts;
CREATE POLICY "anon_select_posts" ON posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_posts" ON posts;
CREATE POLICY "anon_insert_posts" ON posts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_posts" ON posts;
CREATE POLICY "anon_update_posts" ON posts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_posts" ON posts;
CREATE POLICY "anon_delete_posts" ON posts FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author      text NOT NULL,
  text        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_comments" ON comments;
CREATE POLICY "anon_select_comments" ON comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_comments" ON comments;
CREATE POLICY "anon_insert_comments" ON comments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_comments" ON comments;
CREATE POLICY "anon_update_comments" ON comments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_comments" ON comments;
CREATE POLICY "anon_delete_comments" ON comments FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- REACTIONS (rock / popsa)
-- ============================================================
CREATE TABLE IF NOT EXISTS reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_nick   text NOT NULL,
  type        text NOT NULL CHECK (type IN ('rock','popsa')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_nick, type)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_reactions" ON reactions;
CREATE POLICY "anon_select_reactions" ON reactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reactions" ON reactions;
CREATE POLICY "anon_insert_reactions" ON reactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_reactions" ON reactions;
CREATE POLICY "anon_delete_reactions" ON reactions FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- PROFILES (following lists)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  nickname    text PRIMARY KEY,
  following   text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- MESSAGES (DMs)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender      text NOT NULL,
  recipient   text NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages (recipient, created_at);

-- ============================================================
-- SEED: Admin pinned post
-- ============================================================
INSERT INTO posts (id, title, body, category, author, is_pinned, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '[ВНИМАНИЕ] Если нужной игры нет в базе, пишите её название вручную в заголовке поста!',
  'Это закреплённое сообщение администратора. Уважайте чужой вкус. Рок жив. 🤘',
  'posts',
  'ADMIN',
  true,
  now()
)
ON CONFLICT (id) DO NOTHING;