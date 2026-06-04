ALTER TABLE "ResourceLibraries"
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

CREATE TABLE IF NOT EXISTS "ResourceLibraryLikes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES "ResourceLibraries"(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_id, user_id)
);

CREATE TABLE IF NOT EXISTS "ResourceLibraryReports" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES "ResourceLibraries"(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_library_likes_user
  ON "ResourceLibraryLikes"(user_id);

CREATE INDEX IF NOT EXISTS idx_resource_library_reports_resource
  ON "ResourceLibraryReports"(resource_id);
