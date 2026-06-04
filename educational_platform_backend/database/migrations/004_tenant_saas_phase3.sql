-- Phase 3: global teacher network scope + job application tenant_id

ALTER TABLE "Connections" ADD COLUMN IF NOT EXISTS scope VARCHAR(16) NOT NULL DEFAULT 'college';
UPDATE "Connections" SET scope = 'college' WHERE scope IS NULL OR scope = '';

DO $$ BEGIN
  ALTER TABLE "Connections" ADD CONSTRAINT connections_scope_check
    CHECK (scope IN ('college', 'global'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS connections_scope_idx ON "Connections"(scope);

ALTER TABLE "JobApplications" ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL;
UPDATE "JobApplications" ja SET tenant_id = j.tenant_id FROM "JobPosts" j
WHERE ja.job_id = j.id AND ja.tenant_id IS NULL AND j.tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS job_applications_tenant_idx ON "JobApplications"(tenant_id);
