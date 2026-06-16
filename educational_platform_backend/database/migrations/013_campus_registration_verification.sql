-- Campus registration verification workflow (Vidyalaya Hub)

ALTER TABLE "Users"
  ADD COLUMN IF NOT EXISTS registration_status VARCHAR(32) NOT NULL DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS registration_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_reviewed_by UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registration_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS registration_admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS college_email VARCHAR(255);

UPDATE "Users"
SET registration_status = CASE
  WHEN is_approved = TRUE THEN 'approved'
  ELSE 'pending_approval'
END
WHERE registration_status = 'pending_approval';

UPDATE "Users"
SET registration_submitted_at = created_at
WHERE registration_submitted_at IS NULL
  AND user_type IN ('student', 'teacher', 'alumni');

CREATE INDEX IF NOT EXISTS idx_users_tenant_registration_status
  ON "Users"(tenant_id, registration_status)
  WHERE user_type IN ('student', 'teacher', 'alumni');

-- StudentDetails verification columns
ALTER TABLE "StudentDetails"
  ADD COLUMN IF NOT EXISTS roll_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS student_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS university_reg_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS division VARCHAR(100),
  ADD COLUMN IF NOT EXISTS admission_year SMALLINT,
  ADD COLUMN IF NOT EXISTS expected_graduation_year SMALLINT,
  ADD COLUMN IF NOT EXISTS cgpa VARCHAR(20),
  ADD COLUMN IF NOT EXISTS percentage VARCHAR(20),
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS admission_letter_url TEXT;

-- TeacherDetails verification columns
ALTER TABLE "TeacherDetails"
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(255),
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS employment_proof_url TEXT;

-- AlumniDetails verification columns
ALTER TABLE "AlumniDetails"
  ADD COLUMN IF NOT EXISTS alumni_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS admission_year SMALLINT,
  ADD COLUMN IF NOT EXISTS graduation_year SMALLINT,
  ADD COLUMN IF NOT EXISTS final_cgpa VARCHAR(20),
  ADD COLUMN IF NOT EXISTS final_percentage VARCHAR(20),
  ADD COLUMN IF NOT EXISTS current_location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS id_document_url TEXT,
  ADD COLUMN IF NOT EXISTS graduation_certificate_url TEXT;

CREATE TABLE IF NOT EXISTS user_registration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES "Tenants"(tenant_id) ON DELETE SET NULL,
  doc_type VARCHAR(64) NOT NULL,
  storage_url TEXT NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(128),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES "Users"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_reg_docs_user ON user_registration_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reg_docs_tenant ON user_registration_documents(tenant_id, review_status);
