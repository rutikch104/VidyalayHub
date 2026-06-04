/**
 * Normalized profile sections: about extension, experience rows, achievements, skills, teaching info.
 * Safe for existing PostgreSQL databases (CREATE IF NOT EXISTS + idempotent alters).
 */
async function ensureUserProfileSectionsSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const run = async (sql) => {
    await sequelize.query(sql);
  };

  try {
    await run('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  } catch (e) {
    /* ignore if not permitted */
  }

  await run(`
    CREATE TABLE IF NOT EXISTS user_abouts (
      user_id UUID PRIMARY KEY REFERENCES "Users"(id) ON DELETE CASCADE,
      bio TEXT,
      location VARCHAR(255),
      headline VARCHAR(255),
      website VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS user_experiences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      duration VARCHAR(255),
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_user_experiences_user ON user_experiences (user_id);`);

  await run(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id);`);

  await run(`
    CREATE TABLE IF NOT EXISTS user_skills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      skill_name VARCHAR(200) NOT NULL,
      level INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills (user_id);`);

  await run(`
    CREATE TABLE IF NOT EXISTS user_teaching_infos (
      user_id UUID PRIMARY KEY REFERENCES "Users"(id) ON DELETE CASCADE,
      subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
      experience_years NUMERIC(6,1),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS user_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      technologies JSONB NOT NULL DEFAULT '[]'::jsonb,
      status VARCHAR(80),
      image_url TEXT,
      github_url VARCHAR(500),
      live_url VARCHAR(500),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_user_projects_user ON user_projects (user_id);`);

  await run(`
    CREATE TABLE IF NOT EXISTS user_publications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      venue VARCHAR(500),
      year VARCHAR(16),
      description TEXT,
      url VARCHAR(500),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS idx_user_publications_user ON user_publications (user_id);`);

  console.info('[ensureUserProfileSectionsSchema] ensured profile section tables');
}

module.exports = { ensureUserProfileSectionsSchema };
