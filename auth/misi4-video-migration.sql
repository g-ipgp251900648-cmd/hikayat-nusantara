-- Run once in Neon SQL Editor, production/neondb. Idempotent; preserves existing pupil records.
BEGIN;
-- Private video metadata only: video bytes live exclusively in a private S3-compatible bucket.
-- Run in Neon production database before enabling Render media environment variables.
CREATE TABLE IF NOT EXISTS hn_misi4_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  class_id uuid REFERENCES hn_classes(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  mime_type varchar(40) NOT NULL CHECK (mime_type IN ('video/webm','video/mp4')),
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1024 AND 41943040),
  status varchar(24) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','revision_requested')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_misi4_submissions_student
  ON hn_misi4_submissions(organization_id,student_id,created_at DESC);
CREATE INDEX IF NOT EXISTS hn_misi4_submissions_class
  ON hn_misi4_submissions(organization_id,class_id,created_at DESC);
COMMIT;
