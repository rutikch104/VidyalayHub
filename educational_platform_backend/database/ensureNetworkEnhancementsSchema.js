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
    if (!Array.isArray(tables) || tables.length === 0) {
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
    }

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS connections_sender_status_idx
        ON "Connections"(sender_id, status);
      CREATE INDEX IF NOT EXISTS connections_receiver_status_idx
        ON "Connections"(receiver_id, status);
      CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx
        ON "UserBlocks"(blocker_id);
      CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx
        ON "UserBlocks"(blocked_user_id);
      CREATE INDEX IF NOT EXISTS users_discover_eligible_idx
        ON "Users"(is_approved, registration_status, user_type);
      CREATE INDEX IF NOT EXISTS users_tenant_type_idx
        ON "Users"(tenant_id, user_type);
      CREATE INDEX IF NOT EXISTS community_members_user_active_idx
        ON "CommunityMembers"(user_id, is_active);
    `);
  } catch (e) {
    console.warn('[ensureNetworkEnhancementsSchema]', e.message);
  }
}

module.exports = { ensureNetworkEnhancementsSchema };
