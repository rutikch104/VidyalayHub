/**
 * AI Interview practice tables (PostgreSQL).
 */
async function ensureInterviewSchema(sequelize) {
  const dialect = sequelize.getDialect();
  if (dialect !== 'postgres') return;

  const tableExists = async (name) => {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = :name LIMIT 1`,
      { replacements: { name } },
    );
    return Array.isArray(rows) && rows.length > 0;
  };

  try {
    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    if (!(await tableExists('InterviewTypes'))) {
      await sequelize.query(`
        CREATE TABLE "InterviewTypes" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL,
          slug VARCHAR(64) NOT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          category VARCHAR(64) NOT NULL DEFAULT 'technical',
          difficulty VARCHAR(32) NOT NULL DEFAULT 'medium',
          duration_minutes INTEGER NOT NULL DEFAULT 30,
          question_count INTEGER NOT NULL DEFAULT 5,
          is_active BOOLEAN NOT NULL DEFAULT true,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX interview_types_tenant_idx ON "InterviewTypes"(tenant_id);
        CREATE UNIQUE INDEX interview_types_slug_tenant_unique
          ON "InterviewTypes"(slug, COALESCE(tenant_id::text, 'global'));
      `);
      console.info('[ensureInterviewSchema] created InterviewTypes');
    }

    if (!(await tableExists('InterviewSessions'))) {
      await sequelize.query(`
        CREATE TABLE "InterviewSessions" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
          tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL,
          type_id UUID NOT NULL REFERENCES "InterviewTypes"(id) ON DELETE RESTRICT,
          status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
          overall_score NUMERIC(5,2),
          summary_feedback TEXT,
          report_json JSONB,
          current_question_index INTEGER NOT NULL DEFAULT 0,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX interview_sessions_user_idx ON "InterviewSessions"(user_id);
        CREATE INDEX interview_sessions_tenant_idx ON "InterviewSessions"(tenant_id);
        CREATE INDEX interview_sessions_status_idx ON "InterviewSessions"(status);
      `);
      console.info('[ensureInterviewSchema] created InterviewSessions');
    }

    if (!(await tableExists('InterviewQuestions'))) {
      await sequelize.query(`
        CREATE TABLE "InterviewQuestions" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES "InterviewSessions"(id) ON DELETE CASCADE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          prompt TEXT NOT NULL,
          question_type VARCHAR(64) NOT NULL DEFAULT 'general',
          difficulty VARCHAR(32) NOT NULL DEFAULT 'medium',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX interview_questions_session_idx ON "InterviewQuestions"(session_id);
      `);
      console.info('[ensureInterviewSchema] created InterviewQuestions');
    }

    if (!(await tableExists('InterviewAnswers'))) {
      await sequelize.query(`
        CREATE TABLE "InterviewAnswers" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          question_id UUID NOT NULL REFERENCES "InterviewQuestions"(id) ON DELETE CASCADE,
          session_id UUID NOT NULL REFERENCES "InterviewSessions"(id) ON DELETE CASCADE,
          answer_text TEXT NOT NULL,
          score NUMERIC(5,2),
          feedback_text TEXT,
          feedback_json JSONB,
          answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX interview_answers_question_unique ON "InterviewAnswers"(question_id);
        CREATE INDEX interview_answers_session_idx ON "InterviewAnswers"(session_id);
      `);
      console.info('[ensureInterviewSchema] created InterviewAnswers');
    }

    try {
      await sequelize.query(`ALTER TABLE "InterviewTypes" ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    } catch {
      /* table may not exist yet */
    }

    const [typeCount] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM "InterviewTypes"`);
    const count = typeCount?.[0]?.c ?? 0;
    if (Number(count) === 0) {
      await sequelize.query(`
        INSERT INTO "InterviewTypes" (id, slug, title, description, category, difficulty, duration_minutes, question_count, sort_order)
        VALUES
          (gen_random_uuid(), 'technical', 'Technical Interview', 'Core CS, problem-solving, and system thinking.', 'technical', 'medium', 30, 5, 1),
          (gen_random_uuid(), 'hr', 'HR Interview', 'Behavioral questions using the STAR method.', 'hr', 'easy', 25, 5, 2),
          (gen_random_uuid(), 'behavioral', 'Behavioral Interview', 'Leadership, teamwork, and conflict resolution.', 'behavioral', 'medium', 25, 5, 3),
          (gen_random_uuid(), 'coding', 'Coding Interview', 'Algorithms, data structures, and complexity.', 'coding', 'hard', 35, 5, 4),
          (gen_random_uuid(), 'mock', 'Mock Interview', 'Mixed questions simulating a real hiring loop.', 'mock', 'medium', 30, 5, 5)
      `);
      console.info('[ensureInterviewSchema] seeded default interview types');
    }
  } catch (e) {
    console.warn('[ensureInterviewSchema]', e.message);
  }
}

module.exports = { ensureInterviewSchema };
