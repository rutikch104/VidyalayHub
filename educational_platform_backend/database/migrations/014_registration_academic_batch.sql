-- Academic batch + college ID for streamlined registration

ALTER TABLE "StudentDetails"
  ADD COLUMN IF NOT EXISTS academic_batch VARCHAR(20),
  ADD COLUMN IF NOT EXISTS college_id VARCHAR(100);

ALTER TABLE "AlumniDetails"
  ADD COLUMN IF NOT EXISTS academic_batch VARCHAR(20),
  ADD COLUMN IF NOT EXISTS college_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS student_id VARCHAR(100);
