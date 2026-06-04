-- Phase 1: tenant_id on social tables

ALTER TABLE "Comments" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "Comments" c SET tenant_id = p.tenant_id FROM "Posts" p
WHERE c.post_id = p.id AND c.tenant_id IS NULL AND p.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_tenant_idx ON "Comments"(tenant_id);

ALTER TABLE "Connections" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "Connections" c SET tenant_id = u.tenant_id FROM "Users" u
WHERE c.sender_id = u.id AND c.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS connections_tenant_idx ON "Connections"(tenant_id);

ALTER TABLE "Communities" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "Communities" c SET tenant_id = u.tenant_id FROM "Users" u
WHERE c.created_by = u.id AND c.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS communities_tenant_idx ON "Communities"(tenant_id);

ALTER TABLE "MessageThreads" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "MessageThreads" t SET tenant_id = u.tenant_id FROM "Users" u
WHERE t.created_by = u.id AND t.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS message_threads_tenant_idx ON "MessageThreads"(tenant_id);

ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "Messages" m SET tenant_id = t.tenant_id FROM "MessageThreads" t
WHERE m.thread_id = t.id AND m.tenant_id IS NULL AND t.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_tenant_idx ON "Messages"(tenant_id);

ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "Notifications" n SET tenant_id = u.tenant_id FROM "Users" u
WHERE n.user_id = u.id AND n.tenant_id IS NULL AND u.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_tenant_user_idx ON "Notifications"(tenant_id, user_id, created_at DESC);
