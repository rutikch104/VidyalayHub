-- Run once against your PostgreSQL DB if Posts already existed without these columns/enum values.
-- psql -U postgres -d VH_Database -f database/scripts/patch_posts_table.sql

ALTER TABLE "Posts" ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Posts" ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Posts" ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

-- Extend post type enum (re-run errors if values already exist — safe to ignore)
ALTER TYPE "enum_Posts_type" ADD VALUE 'image';
ALTER TYPE "enum_Posts_type" ADD VALUE 'video';
