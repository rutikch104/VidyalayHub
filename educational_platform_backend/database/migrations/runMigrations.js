#!/usr/bin/env node
/**
 * Versioned SQL migrations for production.
 * Tracks applied files in _schema_migrations.
 *
 * Usage: npm run migrate
 * Env: same POSTGRESQL_* as the API (loads .env from project root).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const dbConfig = require('../../db/config');

const MIGRATIONS_DIR = __dirname;

async function ensureMigrationsTable(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function appliedNames(sequelize) {
  const [rows] = await sequelize.query(`SELECT name FROM _schema_migrations ORDER BY name`);
  return new Set((rows || []).map((r) => r.name));
}

async function main() {
  const config = dbConfig;
  if (!config?.database) {
    throw new Error('Database not configured (check POSTGRESQL_* in .env)');
  }
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: config.dialect || 'postgres',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    await ensureMigrationsTable(sequelize);
    const done = await appliedNames(sequelize);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d+_.*\.sql$/i.test(f))
      .sort();

    if (!files.length) {
      console.info('[migrate] No .sql migration files found.');
      return;
    }

    for (const file of files) {
      if (done.has(file)) {
        console.info(`[migrate] skip ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.info(`[migrate] applying ${file}…`);
      await sequelize.query(sql);
      await sequelize.query(`INSERT INTO _schema_migrations (name) VALUES (:name)`, {
        replacements: { name: file },
      });
      console.info(`[migrate] done ${file}`);
    }

    console.info('[migrate] All pending migrations applied.');
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
