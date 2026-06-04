/**
 * Allow thread-based messages without a single receiver (e.g. group chats).
 */
async function ensureMessagesSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  try {
    await sequelize.query('ALTER TABLE "Messages" ALTER COLUMN receiver_id DROP NOT NULL');
    console.info('[ensureMessagesSchema] Messages.receiver_id is nullable');
  } catch (e) {
    if (!String(e.message).includes('does not exist')) {
      console.warn('[ensureMessagesSchema]:', e.message);
    }
  }
}

module.exports = { ensureMessagesSchema };
