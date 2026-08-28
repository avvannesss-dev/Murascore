/*
# Murascore: Image storage support

1. Changes
   - Add `attachments` JSONB column to `posts` — stores array of {name, url, type} for uploaded images.
   - Add `image_url` text column to `comments` — stores Storage public URL when a comment has an image.

2. Storage Bucket
   - Creates a public bucket `media` for image uploads.
   - Public read so all users can see images; writes allowed for anon/authenticated.

3. Security
   No RLS policy changes needed — existing policies already cover the new columns.
*/

ALTER TABLE posts ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';

-- Create the media bucket (public for reads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow anyone to read, anyone to upload
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_public_upload" ON storage.objects;
CREATE POLICY "media_public_upload" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_public_update" ON storage.objects;
CREATE POLICY "media_public_update" ON storage.objects FOR UPDATE
  TO anon, authenticated USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_public_delete" ON storage.objects;
CREATE POLICY "media_public_delete" ON storage.objects FOR DELETE
  TO anon, authenticated USING (bucket_id = 'media');