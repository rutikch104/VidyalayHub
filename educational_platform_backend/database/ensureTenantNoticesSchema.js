/**
 * Ensures TenantNotices table exists (idempotent) for deployments where sync did not create it.
 */
async function ensureTenantNoticesSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') {
    return;
  }
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "TenantNotices" (
        "id" UUID PRIMARY KEY,
        "tenant_id" UUID NOT NULL REFERENCES "Tenants"("tenant_id") ON UPDATE CASCADE ON DELETE CASCADE,
        "created_by_user_id" UUID NOT NULL REFERENCES "Users"("id") ON UPDATE CASCADE ON DELETE CASCADE,
        "title" VARCHAR(400) NOT NULL,
        "body" TEXT,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE,
        "is_pinned" BOOLEAN NOT NULL DEFAULT false,
        "is_archived" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS "tenant_notices_tenant_active_idx" ON "TenantNotices" ("tenant_id", "is_archived", "starts_at", "ends_at");`
    );
  } catch (e) {
    console.warn('[ensureTenantNoticesSchema]', e.message);
  }
}

module.exports = { ensureTenantNoticesSchema };
