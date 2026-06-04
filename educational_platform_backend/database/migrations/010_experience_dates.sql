-- Structured experience dates (LinkedIn-style month/year + current role flag)

ALTER TABLE user_experiences ADD COLUMN IF NOT EXISTS start_month SMALLINT;
ALTER TABLE user_experiences ADD COLUMN IF NOT EXISTS start_year SMALLINT;
ALTER TABLE user_experiences ADD COLUMN IF NOT EXISTS end_month SMALLINT;
ALTER TABLE user_experiences ADD COLUMN IF NOT EXISTS end_year SMALLINT;
ALTER TABLE user_experiences ADD COLUMN IF NOT EXISTS is_current_role BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_user_experiences_user_start_date
  ON user_experiences (user_id, start_year DESC NULLS LAST, start_month DESC NULLS LAST);
