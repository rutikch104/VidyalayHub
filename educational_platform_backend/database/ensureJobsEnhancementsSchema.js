/**
 * JobPosts: category, company_logo columns (PostgreSQL).
 */
async function ensureJobsEnhancementsSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const columnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'JobPosts'
         AND a.attname = :col
         AND a.attnum > 0
         AND NOT a.attisdropped
       LIMIT 1`,
      { replacements: { col: columnName } },
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  try {
    if (!(await columnExists('category'))) {
      await sequelize.query(
        `ALTER TABLE "JobPosts" ADD COLUMN category VARCHAR(32) NOT NULL DEFAULT 'full_time'`,
      );
      console.info('[ensureJobsEnhancementsSchema] added JobPosts.category');
    }
    if (!(await columnExists('company_logo'))) {
      await sequelize.query(`ALTER TABLE "JobPosts" ADD COLUMN company_logo TEXT`);
      console.info('[ensureJobsEnhancementsSchema] added JobPosts.company_logo');
    }
  } catch (e) {
    console.warn('[ensureJobsEnhancementsSchema]', e.message);
  }
}

module.exports = { ensureJobsEnhancementsSchema };
