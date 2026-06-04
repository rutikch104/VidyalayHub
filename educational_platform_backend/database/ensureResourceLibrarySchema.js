/**
 * Aligns "ResourceLibraries" with fields used by controllers when migrations were not run.
 */
async function ensureResourceLibrarySchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const table = '"ResourceLibraries"';

  const columnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'ResourceLibraries'
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
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.info(`[ensureResourceLibrarySchema] added ResourceLibraries.${name}`);
    } catch (e) {
      console.warn(`[ensureResourceLibrarySchema] column ${name}:`, e.message);
    }
  };

  await addColumn('subject', 'subject VARCHAR(255)');
  await addColumn('resource_type', 'resource_type VARCHAR(50)');
  await addColumn('likes_count', 'likes_count INTEGER NOT NULL DEFAULT 0');
  await addColumn('downloads_count', 'downloads_count INTEGER NOT NULL DEFAULT 0');
  await addColumn('views_count', 'views_count INTEGER NOT NULL DEFAULT 0');
  await addColumn('comments_count', 'comments_count INTEGER NOT NULL DEFAULT 0');

  try {
    await sequelize.query(`ALTER TABLE ${table} ALTER COLUMN tenant_id DROP NOT NULL`);
    console.info('[ensureResourceLibrarySchema] tenant_id is now nullable');
  } catch (e) {
    if (!String(e.message).includes('does not exist')) {
      console.warn('[ensureResourceLibrarySchema] tenant_id nullable:', e.message);
    }
  }
}

module.exports = { ensureResourceLibrarySchema };
