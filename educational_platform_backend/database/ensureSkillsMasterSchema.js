/**
 * Skills master catalog + user_skills.skill_id (idempotent for dev / non-migrate envs).
 */
const SEED_SKILLS = [
  'JavaScript',
  'TypeScript',
  'React.js',
  'Node.js',
  'PostgreSQL',
  'MongoDB',
  'AWS',
  'Docker',
  'Kubernetes',
  'Python',
  'Java',
  'UI/UX Design',
  'GraphQL',
  'Next.js',
  'LangChain',
];

function normalizeSkillName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function formatSkillDisplayName(name) {
  const t = String(name || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t
    .split(' ')
    .map((w) => {
      if (!w) return '';
      if (w.length <= 4 && /^[a-z0-9.+#]+$/i.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

async function ensureSkillsMasterSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const run = async (sql) => {
    await sequelize.query(sql);
  };

  try {
    await run('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  } catch {
    /* ignore */
  }

  await run(`
    CREATE TABLE IF NOT EXISTS skills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      skill_name VARCHAR(120) NOT NULL,
      normalized_name VARCHAR(120) NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  /* Sequelize sync may create skills without a DB default on id — raw INSERTs need this. */
  await run(`ALTER TABLE skills ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_normalized_name ON skills (normalized_name);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_skills_normalized_prefix ON skills (normalized_name varchar_pattern_ops);`);
  await run(`CREATE INDEX IF NOT EXISTS idx_skills_usage_count ON skills (usage_count DESC);`);

  await run(`ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;`);
  await run(`CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills (skill_id);`);
  await run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_skills_user_skill_unique
      ON user_skills (user_id, skill_id)
      WHERE skill_id IS NOT NULL;
  `);

  for (const label of SEED_SKILLS) {
    const skill_name = formatSkillDisplayName(label);
    const normalized_name = normalizeSkillName(skill_name);
    if (!normalized_name) continue;
    await sequelize.query(
      `INSERT INTO skills (id, skill_name, normalized_name, usage_count)
       VALUES (gen_random_uuid(), :skill_name, :normalized_name, 0)
       ON CONFLICT (normalized_name) DO NOTHING`,
      { replacements: { skill_name, normalized_name } },
    );
  }

  await run(`
    UPDATE user_skills us
    SET skill_id = sk.id
    FROM skills sk
    WHERE us.skill_id IS NULL
      AND lower(regexp_replace(trim(us.skill_name), '\\s+', ' ', 'g')) = sk.normalized_name;
  `);

  console.info('[ensureSkillsMasterSchema] skills master catalog ready');
}

module.exports = {
  ensureSkillsMasterSchema,
  normalizeSkillName,
  formatSkillDisplayName,
};
