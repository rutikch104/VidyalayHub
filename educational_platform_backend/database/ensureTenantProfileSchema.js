/**
 * Adds college-profile management columns to "Tenants" without losing data.
 * Idempotent — safe to run on every server boot.
 *
 * Columns added:
 *   short_name           short display name (header / breadcrumbs)
 *   description          long-form institution description
 *   contact_email        primary public contact email
 *   contact_phone        primary public contact phone
 *   profile_updated_at   timestamp of last profile edit
 *   logo_updated_at      timestamp of last logo replacement
 *   updated_by           UUID of the user (admin) who last edited
 */
async function ensureTenantProfileSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const tenantsTable = '"Tenants"';

  const columnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'Tenants'
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
      await sequelize.query(`ALTER TABLE ${tenantsTable} ADD COLUMN ${ddl}`);
      console.info(`[ensureTenantProfileSchema] added column Tenants.${name}`);
    } catch (e) {
      console.warn(`[ensureTenantProfileSchema] column ${name}:`, e.message);
    }
  };

  await addColumn('short_name', 'short_name VARCHAR(64)');
  await addColumn('description', 'description TEXT');
  await addColumn('contact_email', 'contact_email VARCHAR(255)');
  await addColumn('contact_phone', 'contact_phone VARCHAR(50)');
  await addColumn('profile_updated_at', 'profile_updated_at TIMESTAMP WITH TIME ZONE');
  await addColumn('logo_updated_at', 'logo_updated_at TIMESTAMP WITH TIME ZONE');
  await addColumn('updated_by', 'updated_by UUID');
}

module.exports = { ensureTenantProfileSchema };
