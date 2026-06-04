/**
 * Adds Event columns used by the REST API (PostgreSQL).
 */
async function ensureEventsSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const columnExists = async (columnName) => {
    const [rows] = await sequelize.query(
      `SELECT 1 AS ok
       FROM pg_attribute a
       INNER JOIN pg_class c ON a.attrelid = c.oid
       INNER JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE n.nspname = 'public'
         AND c.relname = 'Events'
         AND a.attname = :col
         AND a.attnum > 0
         AND NOT a.attisdropped
       LIMIT 1`,
      { replacements: { col: columnName } }
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  const add = async (name, ddl) => {
    try {
      if (await columnExists(name)) return;
      await sequelize.query(`ALTER TABLE "Events" ADD COLUMN ${ddl}`);
      console.info(`[ensureEventsSchema] added Events.${name}`);
    } catch (e) {
      console.warn(`[ensureEventsSchema] ${name}:`, e.message);
    }
  };

  await add('event_type', `event_type VARCHAR(50) NOT NULL DEFAULT 'seminar'`);
  await add('category', 'category VARCHAR(100)');
  await add('max_participants', 'max_participants INTEGER');
  await add('tags', "tags VARCHAR(255)[] NOT NULL DEFAULT ARRAY[]::VARCHAR(255)[]");
  await add('is_online', 'is_online BOOLEAN NOT NULL DEFAULT false');
  await add('meeting_link', 'meeting_link VARCHAR(500)');
  await add('registration_deadline', 'registration_deadline DATE');
  await add('is_featured', 'is_featured BOOLEAN NOT NULL DEFAULT false');
  await add('updated_at', 'updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');

  try {
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS event_participants_event_user_unique
      ON "EventParticipants" (event_id, user_id);
    `);
    console.info('[ensureEventsSchema] ensured EventParticipants unique (event_id, user_id)');
  } catch (e) {
    console.warn('[ensureEventsSchema] EventParticipants unique index:', e.message);
  }
}

module.exports = { ensureEventsSchema };
