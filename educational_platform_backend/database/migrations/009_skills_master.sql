-- Master skills catalog + user_skills.skill_id (normalized, indexed, scalable)

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name VARCHAR(120) NOT NULL,
  normalized_name VARCHAR(120) NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_normalized_name ON skills (normalized_name);
CREATE INDEX IF NOT EXISTS idx_skills_normalized_prefix ON skills (normalized_name varchar_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_skills_usage_count ON skills (usage_count DESC);

ALTER TABLE user_skills ADD COLUMN IF NOT EXISTS skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills (skill_id);

-- Backfill master skills from existing user_skills rows
INSERT INTO skills (skill_name, normalized_name, usage_count)
SELECT DISTINCT ON (norm)
  trim(skill_name) AS skill_name,
  norm AS normalized_name,
  0 AS usage_count
FROM (
  SELECT
    skill_name,
    lower(regexp_replace(trim(skill_name), '\s+', ' ', 'g')) AS norm
  FROM user_skills
  WHERE skill_name IS NOT NULL AND trim(skill_name) <> ''
) s
WHERE norm <> ''
ON CONFLICT (normalized_name) DO NOTHING;

UPDATE user_skills us
SET skill_id = sk.id
FROM skills sk
WHERE us.skill_id IS NULL
  AND lower(regexp_replace(trim(us.skill_name), '\s+', ' ', 'g')) = sk.normalized_name;

-- Refresh usage counts
UPDATE skills sk
SET usage_count = sub.cnt,
    updated_at = NOW()
FROM (
  SELECT skill_id, COUNT(*)::int AS cnt
  FROM user_skills
  WHERE skill_id IS NOT NULL
  GROUP BY skill_id
) sub
WHERE sk.id = sub.skill_id;

-- Prevent duplicate skills per user (skill_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_skills_user_skill_unique
  ON user_skills (user_id, skill_id)
  WHERE skill_id IS NOT NULL;
