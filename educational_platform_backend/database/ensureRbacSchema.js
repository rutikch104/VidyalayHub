async function ensureRbacSchema(sequelize) {
  if (sequelize.getDialect() !== 'postgres') return;

  const q = async (sql, replacements) => sequelize.query(sql, replacements ? { replacements } : undefined);

  await q(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await q(`
    CREATE TABLE IF NOT EXISTS "Roles" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(64) NOT NULL UNIQUE,
      description VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Existing DBs may already have Roles without a default on id.
  await q(`
    ALTER TABLE "Roles"
    ALTER COLUMN id SET DEFAULT gen_random_uuid()
  `);
  await q(`
    ALTER TABLE "Roles"
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW()
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "Permissions" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      resource VARCHAR(64) NOT NULL,
      action VARCHAR(32) NOT NULL,
      key VARCHAR(128) NOT NULL UNIQUE,
      description VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Existing DBs may already have Permissions without a default on id.
  await q(`
    ALTER TABLE "Permissions"
    ALTER COLUMN id SET DEFAULT gen_random_uuid()
  `);
  await q(`
    ALTER TABLE "Permissions"
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW()
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS "Role_Permissions" (
      role_id UUID NOT NULL REFERENCES "Roles"(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES "Permissions"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (role_id, permission_id)
    )
  `);
  await q(`
    ALTER TABLE "Role_Permissions"
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW()
  `);

  await q(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name='Users' AND column_name='role_id'
      ) THEN
        ALTER TABLE "Users" ADD COLUMN role_id UUID NULL REFERENCES "Roles"(id) ON DELETE SET NULL;
      END IF;
    END
    $$;
  `);

  const defaultRoles = [
    { name: 'SUPER_ADMIN', description: 'Platform super administrator' },
    { name: 'ADMIN', description: 'Institution or platform admin' },
    { name: 'USER', description: 'Default platform user' },
  ];

  for (const r of defaultRoles) {
    await q(
      `
      INSERT INTO "Roles" (name, description, created_at, updated_at)
      VALUES (:name, :description, NOW(), NOW())
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, updated_at = NOW()
    `,
      r
    );
  }

  const defaultPermissions = [
    ['users', 'read'],
    ['users', 'write'],
    ['roles', 'read'],
    ['roles', 'write'],
    ['permissions', 'read'],
    ['permissions', 'write'],
    ['admin_panel', 'read'],
    ['admin_panel', 'write'],
  ].map(([resource, action]) => ({
    resource,
    action,
    key: `${resource}:${action}`,
    description: `${action.toUpperCase()} ${resource}`,
  }));

  for (const p of defaultPermissions) {
    await q(
      `
      INSERT INTO "Permissions" (resource, action, key, description, created_at, updated_at)
      VALUES (:resource, :action, :key, :description, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE
      SET resource = EXCLUDED.resource,
          action = EXCLUDED.action,
          description = EXCLUDED.description,
          updated_at = NOW()
    `,
      p
    );
  }

  await q(`
    INSERT INTO "Role_Permissions" (role_id, permission_id)
    SELECT r.id, p.id
    FROM "Roles" r
    CROSS JOIN "Permissions" p
    WHERE r.name = 'SUPER_ADMIN'
    ON CONFLICT DO NOTHING
  `);

  await q(`
    UPDATE "Users" u
    SET role_id = r.id
    FROM "Roles" r
    WHERE u.role_id IS NULL AND r.name = 'USER'
  `);

  const openSuperAdmin = String(process.env.SUPER_ADMIN_OPEN || '').toLowerCase() === 'true';
  if (openSuperAdmin) {
    await q(`
      UPDATE "Users" u
      SET role_id = r.id
      FROM "Roles" r
      WHERE r.name = 'SUPER_ADMIN'
    `);
  }
}

module.exports = { ensureRbacSchema };
