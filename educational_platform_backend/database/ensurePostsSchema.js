/**
 * Aligns existing PostgreSQL "Posts" table with the Sequelize model when columns
 * were added in code but never migrated (likes_count, comments_count, views_count).
 *
 * Uses information_schema checks so it works on PostgreSQL < 11 (no ADD COLUMN IF NOT EXISTS).
 */
async function ensurePostsSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const run = async (sql, opts = {}) => {
    await sequelize.query(sql, opts);
  };

  const postsTable = '"Posts"';
  const commentsTable = '"Comments"';

  const columnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'Posts'
         AND a.attname = :col
         AND a.attnum > 0
         AND NOT a.attisdropped
       LIMIT 1`,
      { replacements: { col: columnName } }
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  const addColumn = async (name, ddl) => {
    try {
      if (await columnExists(name)) return;
      await run(`ALTER TABLE ${postsTable} ADD COLUMN ${ddl}`);
      console.info(`[ensurePostsSchema] added column Posts.${name}`);
    } catch (e) {
      console.warn(`[ensurePostsSchema] column ${name}:`, e.message);
    }
  };

  await addColumn('likes_count', 'likes_count INTEGER NOT NULL DEFAULT 0');
  await addColumn('comments_count', 'comments_count INTEGER NOT NULL DEFAULT 0');
  await addColumn('views_count', 'views_count INTEGER NOT NULL DEFAULT 0');

  const commentColumnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'Comments'
         AND a.attname = :col
         AND a.attnum > 0
         AND NOT a.attisdropped
       LIMIT 1`,
      { replacements: { col: columnName } }
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  const addCommentColumn = async (name, ddl) => {
    try {
      if (await commentColumnExists(name)) return;
      await run(`ALTER TABLE ${commentsTable} ADD COLUMN ${ddl}`);
      console.info(`[ensurePostsSchema] added column Comments.${name}`);
    } catch (e) {
      console.warn(`[ensurePostsSchema] comments column ${name}:`, e.message);
    }
  };

  await addCommentColumn('created_at', 'created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');
  await addCommentColumn('updated_at', 'updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()');
  await addCommentColumn('likes_count', 'likes_count INTEGER NOT NULL DEFAULT 0');

  try {
    const [tables] = await sequelize.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'CommentLikes' LIMIT 1`,
    );
    if (!Array.isArray(tables) || tables.length === 0) {
      await run(`CREATE TABLE IF NOT EXISTS "CommentLikes" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id UUID NOT NULL REFERENCES "Comments"(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        UNIQUE (comment_id, user_id)
      )`);
      await run(`CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx ON "CommentLikes"(comment_id)`);
      console.info('[ensurePostsSchema] created CommentLikes table');
    }
  } catch (e) {
    console.warn('[ensurePostsSchema] CommentLikes:', e.message);
  }

  try {
    if (!(await commentColumnExists('parent_comment_id'))) {
      await run(`ALTER TABLE ${commentsTable} ADD COLUMN parent_comment_id UUID NULL`);
      await run(
        `ALTER TABLE ${commentsTable}
         ADD CONSTRAINT comments_parent_comment_fk
         FOREIGN KEY (parent_comment_id) REFERENCES ${commentsTable}(id) ON DELETE CASCADE`
      );
      console.info('[ensurePostsSchema] added Comments.parent_comment_id');
    }
  } catch (e) {
    if (!String(e.message).includes('already exists')) {
      console.warn('[ensurePostsSchema] parent_comment_id:', e.message);
    }
  }

  for (const val of ['image', 'video']) {
    try {
      await run(`ALTER TYPE "enum_Posts_type" ADD VALUE '${val}';`);
    } catch (e) {
      if (!String(e.message).includes('already exists')) {
        console.warn(`[ensurePostsSchema] enum ${val}:`, e.message);
      }
    }
  }
}

module.exports = { ensurePostsSchema };
