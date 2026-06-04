-- Phase 0: tenant slug, posts & media tenant_id (idempotent-style; safe to re-run fragments)

ALTER TABLE "Tenants" ADD COLUMN IF NOT EXISTS slug VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique_idx ON "Tenants"(slug) WHERE slug IS NOT NULL;

ALTER TABLE "Posts" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "Posts" p SET tenant_id = u.tenant_id FROM "Users" u
WHERE p.user_id = u.id AND p.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_tenant_created_idx ON "Posts"(tenant_id, created_at DESC);

ALTER TABLE "MediaAssets" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "MediaAssets" m SET tenant_id = u.tenant_id FROM "Users" u
WHERE m.owner_id = u.id AND m.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS media_assets_tenant_idx ON "MediaAssets"(tenant_id);
