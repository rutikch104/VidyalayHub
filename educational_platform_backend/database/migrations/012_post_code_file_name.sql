-- Dedicated filename for code snippet posts
ALTER TABLE "Posts"
  ADD COLUMN IF NOT EXISTS code_file_name VARCHAR(120);
