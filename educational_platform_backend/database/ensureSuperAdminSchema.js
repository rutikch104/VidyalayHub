async function ensureSuperAdminSchema(sequelize) {
  if (sequelize.getDialect() !== 'postgres') return;

  const q = async (sql) => sequelize.query(sql);
  await q(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await q(`
    CREATE TABLE IF NOT EXISTS "super_admins" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
      phone_number VARCHAR(20),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT '',
      access BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await q(`
    ALTER TABLE "super_admins"
    ADD COLUMN IF NOT EXISTS password_hash TEXT
  `);
  await q(`
    UPDATE "super_admins"
    SET password_hash = ''
    WHERE password_hash IS NULL
  `);

  await q(`
    ALTER TABLE "super_admins"
    ALTER COLUMN id SET DEFAULT gen_random_uuid(),
    ALTER COLUMN password_hash SET DEFAULT '',
    ALTER COLUMN password_hash SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW()
  `);
}

module.exports = { ensureSuperAdminSchema };
