-- Add community_post bookmark type (also applied at runtime via ensureBookmarksSchema)
DO $$
BEGIN
  ALTER TYPE "enum_Bookmarks_type" ADD VALUE IF NOT EXISTS 'community_post';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
