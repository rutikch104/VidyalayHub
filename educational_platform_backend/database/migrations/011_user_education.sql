-- LinkedIn-style education entries + per-entry skills

CREATE TABLE IF NOT EXISTS user_educations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  institution_name VARCHAR(500) NOT NULL,
  degree VARCHAR(255),
  field_of_study VARCHAR(255),
  start_month SMALLINT,
  start_year SMALLINT,
  end_month SMALLINT,
  end_year SMALLINT,
  is_current_studying BOOLEAN NOT NULL DEFAULT FALSE,
  duration VARCHAR(255),
  cgpa VARCHAR(32),
  percentage VARCHAR(32),
  description TEXT,
  achievements TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_educations_user ON user_educations (user_id);
CREATE INDEX IF NOT EXISTS idx_user_educations_user_start_date
  ON user_educations (user_id, start_year DESC NULLS LAST, start_month DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS user_education_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  education_id UUID NOT NULL REFERENCES user_educations(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  skill_name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_education_skills_education ON user_education_skills (education_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_education_skills_unique
  ON user_education_skills (education_id, skill_id)
  WHERE skill_id IS NOT NULL;
