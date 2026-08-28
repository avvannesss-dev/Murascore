/*
# Murascore: Add reaction count columns to posts

1. Changes
   - Add `rock_count` (integer, default 0) to `posts` — cached count of ROCK reactions.
   - Add `popsa_count` (integer, default 0) to `posts` — cached count of ПОПСА reactions.
   These columns allow `updateReactions(postId, rockCount, popsaCount)` to sync
   reaction counters globally without a join query.

2. Backfill
   Existing posts get 0 counts (default), which is correct since the seeded
   admin post has no reactions yet.

3. Security
   No RLS policy changes — existing anon/authenticated policies already cover
   the new columns (they are on an already-open table).
*/

ALTER TABLE posts ADD COLUMN IF NOT EXISTS rock_count integer NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS popsa_count integer NOT NULL DEFAULT 0;