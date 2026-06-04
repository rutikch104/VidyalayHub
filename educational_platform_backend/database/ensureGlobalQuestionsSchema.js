/**
 * Adds GlobalQuestions.is_resolved when missing (PostgreSQL).
 */
async function ensureGlobalQuestionsSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const columnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'GlobalQuestions'
         AND a.attname = :col
         AND a.attnum > 0
         AND NOT a.attisdropped
       LIMIT 1`,
      { replacements: { col: columnName } }
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  try {
    if (!(await columnExists('is_resolved'))) {
      await sequelize.query(
        'ALTER TABLE "GlobalQuestions" ADD COLUMN is_resolved BOOLEAN NOT NULL DEFAULT false'
      );
      console.info('[ensureGlobalQuestionsSchema] added column GlobalQuestions.is_resolved');
    }
  } catch (e) {
    console.warn('[ensureGlobalQuestionsSchema]', e.message);
  }

  const answerCommentColumnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'AnswerComments'
         AND a.attname = :col
         AND a.attnum > 0
         AND NOT a.attisdropped
       LIMIT 1`,
      { replacements: { col: columnName } }
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  try {
    if (!(await answerCommentColumnExists('parent_id'))) {
      await sequelize.query(
        'ALTER TABLE "AnswerComments" ADD COLUMN parent_id UUID NULL REFERENCES "AnswerComments"(id) ON DELETE CASCADE'
      );
      console.info('[ensureGlobalQuestionsSchema] added column AnswerComments.parent_id');
    }
  } catch (e) {
    console.warn('[ensureGlobalQuestionsSchema] AnswerComments.parent_id', e.message);
  }

  const globalAnswerColumnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'GlobalAnswers'
         AND a.attname = :col
         AND a.attnum > 0
         AND NOT a.attisdropped
       LIMIT 1`,
      { replacements: { col: columnName } }
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  try {
    if (!(await globalAnswerColumnExists('tags'))) {
      await sequelize.query(
        'ALTER TABLE "GlobalAnswers" ADD COLUMN tags VARCHAR(255)[] NULL'
      );
      console.info('[ensureGlobalQuestionsSchema] added column GlobalAnswers.tags');
    }
  } catch (e) {
    console.warn('[ensureGlobalQuestionsSchema] GlobalAnswers.tags', e.message);
  }

  try {
    const [tables] = await sequelize.query(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'AnswerMentions' LIMIT 1`
    );
    if (!Array.isArray(tables) || tables.length === 0) {
      await sequelize.query(`
        CREATE TABLE "AnswerMentions" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          answer_id UUID NOT NULL REFERENCES "GlobalAnswers"(id) ON DELETE CASCADE,
          mentioned_user UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.info('[ensureGlobalQuestionsSchema] created table AnswerMentions');
    }
  } catch (e) {
    console.warn('[ensureGlobalQuestionsSchema] AnswerMentions table', e.message);
  }
}

module.exports = { ensureGlobalQuestionsSchema };
