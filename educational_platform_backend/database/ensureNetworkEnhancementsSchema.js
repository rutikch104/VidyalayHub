/**
 * UserFollows table for asymmetric follow (PostgreSQL).
 */
async function ensureNetworkEnhancementsSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  try {
    const [tables] = await sequelize.query(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'UserFollows' LIMIT 1`,
    );
    if (Array.isArray(tables) && tables.length > 0) return;

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "UserFollows" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (follower_id, following_id)
      );
      CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON "UserFollows"(follower_id);
      CREATE INDEX IF NOT EXISTS user_follows_following_idx ON "UserFollows"(following_id);
    `);
    console.info('[ensureNetworkEnhancementsSchema] created UserFollows table');
  } catch (e) {
    console.warn('[ensureNetworkEnhancementsSchema]', e.message);
  }
}

module.exports = { ensureNetworkEnhancementsSchema };
