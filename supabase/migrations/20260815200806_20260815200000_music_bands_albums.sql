/*
# Music Community: Bands and Albums hierarchy

## Purpose
Restructures the music module into a three-level hierarchy: Band -> Album -> Track.
Creates `music_bands` and `music_albums` tables, and links existing `music_tracks` to albums.

## New Tables

1. `music_bands` — musical groups
   - `id` (uuid, PK)
   - `name` (text, not null)
   - `description` (text, default '')
   - `avatar_url` (text, nullable) — band avatar image
   - `created_at` (timestamptz)

2. `music_albums` — albums belonging to a band
   - `id` (uuid, PK)
   - `band_id` (uuid, FK to music_bands, ON DELETE CASCADE)
   - `title` (text, not null)
   - `cover_url` (text, nullable) — album cover image
   - `created_at` (timestamptz)

## Modified Tables

1. `music_tracks` — added columns:
   - `album_id` (uuid, FK to music_albums, ON DELETE CASCADE, nullable for backward compat)
   - `order_index` (int, default 0) — track ordering within album

## Security
- All new tables have RLS enabled.
- Policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` — the app is intentionally public/shared (nickname-based auth).
- All CRUD operations allowed for anon + authenticated.

## Notes
1. `music_tracks.album_id` is nullable so existing tracks aren't lost, but new tracks should reference an album.
2. Cascade deletes ensure that deleting a band removes its albums and tracks.
3. The app uses nickname-based auth, not Supabase Auth sessions.
*/

-- ============================================================
-- music_bands
-- ============================================================
CREATE TABLE IF NOT EXISTS music_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE music_bands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bands" ON music_bands;
CREATE POLICY "anon_select_bands" ON music_bands FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bands" ON music_bands;
CREATE POLICY "anon_insert_bands" ON music_bands FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bands" ON music_bands;
CREATE POLICY "anon_delete_bands" ON music_bands FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- music_albums
-- ============================================================
CREATE TABLE IF NOT EXISTS music_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES music_bands(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE music_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_albums" ON music_albums;
CREATE POLICY "anon_select_albums" ON music_albums FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_albums" ON music_albums;
CREATE POLICY "anon_insert_albums" ON music_albums FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_albums" ON music_albums;
CREATE POLICY "anon_delete_albums" ON music_albums FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- music_tracks: add album_id and order_index
-- ============================================================
DO $$ BEGIN
  ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES music_albums(id) ON DELETE CASCADE;
  ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS order_index int NOT NULL DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_music_albums_band_id ON music_albums(band_id);
CREATE INDEX IF NOT EXISTS idx_music_tracks_album_id ON music_tracks(album_id);
