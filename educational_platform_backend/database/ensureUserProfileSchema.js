/**
 * Adds profile columns to "Users" when the Sequelize model was updated without a migration.
 */
async function ensureUserProfileSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const run = async (sql) => {
    await sequelize.query(sql);
  };

  const usersTable = '"Users"';

  const columnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'Users'
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
      await run(`ALTER TABLE ${usersTable} ADD COLUMN ${ddl}`);
      console.info(`[ensureUserProfileSchema] added column Users.${name}`);
    } catch (e) {
      console.warn(`[ensureUserProfileSchema] column ${name}:`, e.message);
    }
  };

  await addColumn('bio', 'bio TEXT');
  await addColumn('cover_picture', 'cover_picture TEXT');
  await addColumn('location', 'location VARCHAR(255)');
  await addColumn('linkedin_url', 'linkedin_url VARCHAR(500)');
  await addColumn('twitter_url', 'twitter_url VARCHAR(500)');
  await addColumn('github_url', 'github_url VARCHAR(500)');
  await addColumn('website_url', 'website_url VARCHAR(500)');
  await addColumn('app_settings', "app_settings JSONB DEFAULT '{}'::jsonb");
  await addColumn('password_changed_at', 'password_changed_at TIMESTAMP WITH TIME ZONE');
}

module.exports = { ensureUserProfileSchema };
