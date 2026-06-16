/**
 * job_skills junction table + GIN index on JobPosts.skills_required for overlap filters.
 */
async function ensureJobSkillsSchema(sequelize) {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS job_skills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES "JobPosts"(id) ON DELETE CASCADE,
        skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (job_id, skill_id)
      );
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_job_skills_job_id ON job_skills(job_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_job_skills_skill_id ON job_skills(skill_id);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_job_posts_skills_required_gin
      ON "JobPosts" USING GIN (skills_required);
    `);

    console.info('[ensureJobSkillsSchema] job_skills junction ready');
  } catch (e) {
    console.warn('[ensureJobSkillsSchema]', e.message);
  }
}

module.exports = { ensureJobSkillsSchema };
