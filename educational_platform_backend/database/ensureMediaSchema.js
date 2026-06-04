/**
 * MediaAssets audit table + attachment column upgrades (PostgreSQL).
 */
async function ensureMediaSchema(sequelize) {
  if (sequelize.getDialect() !== 'postgres') return;

  const run = (sql) => sequelize.query(sql);

  try {
    const [tables] = await sequelize.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'MediaAssets' LIMIT 1`,
    );
    if (!Array.isArray(tables) || tables.length === 0) {
      await run(`CREATE TABLE "MediaAssets" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
        category VARCHAR(32) NOT NULL,
        entity_type VARCHAR(48),
        entity_id UUID,
        storage_key VARCHAR(512) NOT NULL UNIQUE,
        public_url VARCHAR(1024) NOT NULL,
        mime_type VARCHAR(128),
        size_bytes BIGINT,
        original_name VARCHAR(512),
        media_type VARCHAR(24),
        thumbnail_url VARCHAR(1024),
        metadata JSONB DEFAULT '{}',
        provider VARCHAR(16) NOT NULL DEFAULT 'local',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await run(`CREATE INDEX media_assets_owner_idx ON "MediaAssets"(owner_id)`);
      await run(`CREATE INDEX media_assets_entity_idx ON "MediaAssets"(entity_type, entity_id)`);
      console.info('[ensureMediaSchema] created MediaAssets table');
    }
  } catch (e) {
    console.warn('[ensureMediaSchema] MediaAssets:', e.message);
  }

  const attachmentCols = [
    ['storage_key', 'VARCHAR(512)'],
    ['file_size', 'BIGINT'],
    ['original_name', 'VARCHAR(512)'],
  ];

  for (const [col, ddl] of attachmentCols) {
    try {
      const [rows] = await sequelize.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'Attachments' AND column_name = :col LIMIT 1`,
        { replacements: { col } },
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        await run(`ALTER TABLE "Attachments" ADD COLUMN ${col} ${ddl}`);
        console.info(`[ensureMediaSchema] Attachments.${col}`);
      }
    } catch (e) {
      if (!String(e.message).includes('does not exist')) {
        console.warn(`[ensureMediaSchema] Attachments.${col}:`, e.message);
      }
    }
  }
}

module.exports = { ensureMediaSchema };
