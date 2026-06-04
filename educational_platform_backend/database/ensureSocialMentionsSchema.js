/**
 * Creates mention junction tables for community comments and answer replies.
 */
async function ensureSocialMentionsSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const tableExists = async (name) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = :name LIMIT 1`,
      { replacements: { name } },
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  try {
    if (!(await tableExists('CommunityPostCommentMentions'))) {
      await sequelize.query(`
        CREATE TABLE "CommunityPostCommentMentions" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          comment_id UUID NOT NULL REFERENCES "CommunityPostComments"(id) ON DELETE CASCADE,
          mentioned_user UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE
        )
      `);
      console.info('[ensureSocialMentionsSchema] created CommunityPostCommentMentions');
    }
  } catch (e) {
    console.warn('[ensureSocialMentionsSchema] CommunityPostCommentMentions', e.message);
  }

  try {
    if (!(await tableExists('AnswerCommentMentions'))) {
      await sequelize.query(`
        CREATE TABLE "AnswerCommentMentions" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          comment_id UUID NOT NULL REFERENCES "AnswerComments"(id) ON DELETE CASCADE,
          mentioned_user UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE
        )
      `);
      console.info('[ensureSocialMentionsSchema] created AnswerCommentMentions');
    }
  } catch (e) {
    console.warn('[ensureSocialMentionsSchema] AnswerCommentMentions', e.message);
  }

  const columnExists = async (table, col) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public' AND c.relname = :table
         AND a.attname = :col AND a.attnum > 0 AND NOT a.attisdropped LIMIT 1`,
      { replacements: { table, col } },
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  try {
    if (!(await columnExists('CommunityPosts', 'tags'))) {
      await sequelize.query(
        'ALTER TABLE "CommunityPosts" ADD COLUMN tags VARCHAR(255)[] NULL',
      );
      console.info('[ensureSocialMentionsSchema] added CommunityPosts.tags');
    }
  } catch (e) {
    console.warn('[ensureSocialMentionsSchema] CommunityPosts.tags', e.message);
  }

  try {
    if (!(await tableExists('CommunityPostMentions'))) {
      await sequelize.query(`
        CREATE TABLE "CommunityPostMentions" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id UUID NOT NULL REFERENCES "CommunityPosts"(id) ON DELETE CASCADE,
          mentioned_user UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE
        )
      `);
      console.info('[ensureSocialMentionsSchema] created CommunityPostMentions');
    }
  } catch (e) {
    console.warn('[ensureSocialMentionsSchema] CommunityPostMentions', e.message);
  }
}

module.exports = { ensureSocialMentionsSchema };
