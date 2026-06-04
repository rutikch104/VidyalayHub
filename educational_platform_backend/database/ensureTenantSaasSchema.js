/**
 * Multi-tenant SaaS schema: tenant slug, Posts.tenant_id, MediaAssets.tenant_id + backfill.
 */
function slugify(name) {
  return String(name || 'college')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'college';
}

async function columnExists(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT 1 AS ok FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table AND column_name = :col LIMIT 1`,
    { replacements: { table: tableName, col: columnName } },
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureTenantSaasSchema(sequelize) {
  if (sequelize.getDialect() !== 'postgres') return;

  const run = (sql, opts) => sequelize.query(sql, opts);

  // Tenants.slug
  if (!(await columnExists(sequelize, 'Tenants', 'slug'))) {
    await run(`ALTER TABLE "Tenants" ADD COLUMN slug VARCHAR(64)`);
    console.info('[ensureTenantSaasSchema] added Tenants.slug');
  }

  try {
    await run(
      `CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique_idx ON "Tenants"(slug) WHERE slug IS NOT NULL`,
    );
  } catch (e) {
    console.warn('[ensureTenantSaasSchema] tenants_slug_unique_idx:', e.message);
  }

  const [tenants] = await run(`SELECT tenant_id, name, slug FROM "Tenants"`);
  for (const row of tenants || []) {
    if (row.slug) continue;
    let base = slugify(row.name);
    if (/rcpatel|rajarambapu|rcp/i.test(String(row.name))) base = 'rcpit';
    let candidate = base;
    let n = 0;
    for (;;) {
      const [dup] = await run(
        `SELECT 1 FROM "Tenants" WHERE slug = :slug AND tenant_id != :id LIMIT 1`,
        { replacements: { slug: candidate, id: row.tenant_id } },
      );
      if (!dup?.length) break;
      n += 1;
      candidate = `${base}-${n}`;
    }
    await run(`UPDATE "Tenants" SET slug = :slug WHERE tenant_id = :id`, {
      replacements: { slug: candidate, id: row.tenant_id },
    });
    console.info(`[ensureTenantSaasSchema] slug ${candidate} → tenant ${row.tenant_id}`);
  }

  // Posts.tenant_id
  if (!(await columnExists(sequelize, 'Posts', 'tenant_id'))) {
    await run(`ALTER TABLE "Posts" ADD COLUMN tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL`);
    console.info('[ensureTenantSaasSchema] added Posts.tenant_id');
  }

  await run(`
    UPDATE "Posts" p
    SET tenant_id = u.tenant_id
    FROM "Users" u
    WHERE p.user_id = u.id AND p.tenant_id IS NULL AND u.tenant_id IS NOT NULL
  `);

  try {
    await run(`CREATE INDEX IF NOT EXISTS posts_tenant_created_idx ON "Posts"(tenant_id, created_at DESC)`);
  } catch (e) {
    console.warn('[ensureTenantSaasSchema] posts_tenant_created_idx:', e.message);
  }

  // MediaAssets.tenant_id
  if (!(await columnExists(sequelize, 'MediaAssets', 'tenant_id'))) {
    await run(`
      ALTER TABLE "MediaAssets" ADD COLUMN tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL
    `);
    console.info('[ensureTenantSaasSchema] added MediaAssets.tenant_id');
  }

  await run(`
    UPDATE "MediaAssets" m
    SET tenant_id = u.tenant_id
    FROM "Users" u
    WHERE m.owner_id = u.id AND m.tenant_id IS NULL AND u.tenant_id IS NOT NULL
  `);

  try {
    await run(`CREATE INDEX IF NOT EXISTS media_assets_tenant_idx ON "MediaAssets"(tenant_id)`);
  } catch (e) {
    console.warn('[ensureTenantSaasSchema] media_assets_tenant_idx:', e.message);
  }

  // --- Phase 1: Comments, Connections, Communities, Messages, Notifications ---
  const phase1Tables = [
    {
      table: 'Comments',
      backfill: `
        UPDATE "Comments" c SET tenant_id = p.tenant_id
        FROM "Posts" p WHERE c.post_id = p.id AND c.tenant_id IS NULL AND p.tenant_id IS NOT NULL`,
      index: 'comments_tenant_idx ON "Comments"(tenant_id)',
    },
    {
      table: 'Connections',
      backfill: `
        UPDATE "Connections" c SET tenant_id = u.tenant_id
        FROM "Users" u WHERE c.sender_id = u.id AND c.tenant_id IS NULL AND u.tenant_id IS NOT NULL`,
      index: 'connections_tenant_idx ON "Connections"(tenant_id)',
    },
    {
      table: 'Communities',
      backfill: `
        UPDATE "Communities" c SET tenant_id = u.tenant_id
        FROM "Users" u WHERE c.created_by = u.id AND c.tenant_id IS NULL AND u.tenant_id IS NOT NULL`,
      index: 'communities_tenant_idx ON "Communities"(tenant_id)',
    },
    {
      table: 'MessageThreads',
      backfill: `
        UPDATE "MessageThreads" t SET tenant_id = u.tenant_id
        FROM "Users" u WHERE t.created_by = u.id AND t.tenant_id IS NULL AND u.tenant_id IS NOT NULL`,
      index: 'message_threads_tenant_idx ON "MessageThreads"(tenant_id)',
    },
    {
      table: 'Messages',
      backfill: `
        UPDATE "Messages" m SET tenant_id = t.tenant_id
        FROM "MessageThreads" t
        WHERE m.thread_id = t.id AND m.tenant_id IS NULL AND t.tenant_id IS NOT NULL`,
      index: 'messages_tenant_idx ON "Messages"(tenant_id)',
    },
    {
      table: 'Notifications',
      backfill: `
        UPDATE "Notifications" n SET tenant_id = u.tenant_id
        FROM "Users" u WHERE n.user_id = u.id AND n.tenant_id IS NULL AND u.tenant_id IS NOT NULL`,
      index: 'notifications_tenant_user_idx ON "Notifications"(tenant_id, user_id, created_at DESC)',
    },
  ];

  for (const { table, backfill, index } of phase1Tables) {
    if (!(await columnExists(sequelize, table, 'tenant_id'))) {
      await run(
        `ALTER TABLE "${table}" ADD COLUMN tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL`,
      );
      console.info(`[ensureTenantSaasSchema] added ${table}.tenant_id`);
    }
    await run(backfill);
    try {
      await run(`CREATE INDEX IF NOT EXISTS ${index}`);
    } catch (e) {
      console.warn(`[ensureTenantSaasSchema] index ${table}:`, e.message);
    }
  }

  // --- Phase 2: Bookmarks, CommunityPosts (+ backfill Events/JobPosts if needed) ---
  const phase2Tables = [
    {
      table: 'Bookmarks',
      backfill: `
        UPDATE "Bookmarks" b SET tenant_id = u.tenant_id
        FROM "Users" u WHERE b.user_id = u.id AND b.tenant_id IS NULL AND u.tenant_id IS NOT NULL`,
      index: 'bookmarks_tenant_user_idx ON "Bookmarks"(tenant_id, user_id, created_at DESC)',
    },
    {
      table: 'CommunityPosts',
      backfill: `
        UPDATE "CommunityPosts" cp SET tenant_id = c.tenant_id
        FROM "Communities" c
        WHERE cp.community_id = c.id AND cp.tenant_id IS NULL AND c.tenant_id IS NOT NULL`,
      index: 'community_posts_tenant_idx ON "CommunityPosts"(tenant_id, community_id, created_at DESC)',
    },
  ];

  for (const { table, backfill, index } of phase2Tables) {
    if (!(await columnExists(sequelize, table, 'tenant_id'))) {
      await run(
        `ALTER TABLE "${table}" ADD COLUMN tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL`,
      );
      console.info(`[ensureTenantSaasSchema] added ${table}.tenant_id`);
    }
    await run(backfill);
    try {
      await run(`CREATE INDEX IF NOT EXISTS ${index}`);
    } catch (e) {
      console.warn(`[ensureTenantSaasSchema] index ${table}:`, e.message);
    }
  }

  await run(`
    UPDATE "Events" e SET tenant_id = u.tenant_id
    FROM "Users" u
    WHERE e.created_by = u.id AND e.tenant_id IS NULL AND u.tenant_id IS NOT NULL
  `);
  await run(`
    UPDATE "JobPosts" j SET tenant_id = u.tenant_id
    FROM "Users" u
    WHERE j.posted_by = u.id AND j.tenant_id IS NULL AND u.tenant_id IS NOT NULL
  `);

  // --- Phase 3: connection scope, job applications tenant_id ---
  if (!(await columnExists(sequelize, 'Connections', 'scope'))) {
    await run(`ALTER TABLE "Connections" ADD COLUMN scope VARCHAR(16) NOT NULL DEFAULT 'college'`);
    await run(`UPDATE "Connections" SET scope = 'college' WHERE scope IS NULL`);
    console.info('[ensureTenantSaasSchema] added Connections.scope');
  }

  try {
    await run(`
      DO $$ BEGIN
        ALTER TABLE "Connections" ADD CONSTRAINT connections_scope_check
          CHECK (scope IN ('college', 'global'));
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
  } catch (e) {
    console.warn('[ensureTenantSaasSchema] connections_scope_check:', e.message);
  }

  if (!(await columnExists(sequelize, 'JobApplications', 'tenant_id'))) {
    await run(
      `ALTER TABLE "JobApplications" ADD COLUMN tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL`,
    );
    console.info('[ensureTenantSaasSchema] added JobApplications.tenant_id');
  }

  await run(`
    UPDATE "JobApplications" ja SET tenant_id = j.tenant_id
    FROM "JobPosts" j
    WHERE ja.job_id = j.id AND ja.tenant_id IS NULL AND j.tenant_id IS NOT NULL
  `);

  try {
    await run(`CREATE INDEX IF NOT EXISTS job_applications_tenant_idx ON "JobApplications"(tenant_id)`);
  } catch (e) {
    console.warn('[ensureTenantSaasSchema] job_applications_tenant_idx:', e.message);
  }
}

module.exports = { ensureTenantSaasSchema, slugify };
