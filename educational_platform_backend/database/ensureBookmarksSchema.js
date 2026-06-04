/**
 * PostgreSQL: add Bookmark.type value "resource" and unique (user_id, type, type_id).
 */
async function ensureBookmarksSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const run = async (sql) => {
    await sequelize.query(sql);
  };

  try {
    await run(`ALTER TYPE "enum_Bookmarks_type" ADD VALUE 'resource';`);
    console.info('[ensureBookmarksSchema] added enum value resource');
  } catch (e) {
    const m = String(e.message || '');
    if (!/already exists/i.test(m) && !/duplicate/i.test(m)) {
      console.warn('[ensureBookmarksSchema] enum resource:', m);
    }
  }

  try {
    await run(`ALTER TYPE "enum_Bookmarks_type" ADD VALUE 'event';`);
    console.info('[ensureBookmarksSchema] added enum value event');
  } catch (e) {
    const m = String(e.message || '');
    if (!/already exists/i.test(m) && !/duplicate/i.test(m)) {
      console.warn('[ensureBookmarksSchema] enum event:', m);
    }
  }

  try {
    await run(`ALTER TYPE "enum_Bookmarks_type" ADD VALUE 'job';`);
    console.info('[ensureBookmarksSchema] added enum value job');
  } catch (e) {
    const m = String(e.message || '');
    if (!/already exists/i.test(m) && !/duplicate/i.test(m)) {
      console.warn('[ensureBookmarksSchema] enum job:', m);
    }
  }

  try {
    await run(`ALTER TYPE "enum_Bookmarks_type" ADD VALUE 'community_post';`);
    console.info('[ensureBookmarksSchema] added enum value community_post');
  } catch (e) {
    const m = String(e.message || '');
    if (!/already exists/i.test(m) && !/duplicate/i.test(m)) {
      console.warn('[ensureBookmarksSchema] enum community_post:', m);
    }
  }

  try {
    await run(`
      CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_type_typeid_unique
      ON "Bookmarks" (user_id, type, type_id);
    `);
    console.info('[ensureBookmarksSchema] ensured unique index on Bookmarks');
  } catch (e) {
    console.warn('[ensureBookmarksSchema] unique index:', e.message);
  }
}

module.exports = { ensureBookmarksSchema };
