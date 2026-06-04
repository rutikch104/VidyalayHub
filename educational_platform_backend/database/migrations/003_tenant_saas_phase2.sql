-- Phase 2: Bookmarks, CommunityPosts + backfill Events/JobPosts

ALTER TABLE "Bookmarks" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "Bookmarks" b SET tenant_id = u.tenant_id FROM "Users" u
WHERE b.user_id = u.id AND b.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookmarks_tenant_user_idx ON "Bookmarks"(tenant_id, user_id, created_at DESC);

ALTER TABLE "CommunityPosts" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "CommunityPosts" cp SET tenant_id = c.tenant_id FROM "Communities" c
WHERE cp.community_id = c.id AND cp.tenant_id IS NULL AND c.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_posts_tenant_idx ON "CommunityPosts"(tenant_id, community_id, created_at DESC);

UPDATE "Events" e SET tenant_id = u.tenant_id FROM "Users" u
WHERE e.created_by = u.id AND e.tenant_id IS NULL AND u.tenant_id IS NOT NULL;

UPDATE "JobPosts" j SET tenant_id = u.tenant_id FROM "Users" u
WHERE j.posted_by = u.id AND j.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
