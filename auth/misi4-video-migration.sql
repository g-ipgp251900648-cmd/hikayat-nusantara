-- Jalankan sekali dalam Neon SQL Editor sebelum mengaktifkan video pada Render.
BEGIN;
-- Private media metadata only. Actual recordings live in a private S3-compatible
-- bucket, never in GitHub or the Render application's ephemeral /dist.
CREATE TABLE IF NOT EXISTS hn_misi4_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES hn_classes(id) ON DELETE SET NULL,
  reference_no varchar(64) NOT NULL UNIQUE,
  version integer NOT NULL CHECK (version>=1),
  story_title varchar(120) NOT NULL,
  mime_type varchar(40) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 32 AND 62914560),
  duration_seconds numeric(9,2) NOT NULL CHECK (duration_seconds BETWEEN 1 AND 3600),
  storage_key varchar(320) NOT NULL UNIQUE,
  has_supporting_pdf boolean NOT NULL DEFAULT false,
  status varchar(36) NOT NULL DEFAULT 'Telah Dihantar'
    CHECK (status IN ('Telah Dihantar','Dalam Semakan','Selesai Disemak','Perlu Penambahbaikan')),
  reviewer_id uuid REFERENCES hn_users(id) ON DELETE SET NULL,
  review_comment varchar(1500),
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,student_id,version)
);
CREATE INDEX IF NOT EXISTS hn_misi4_student_date
  ON hn_misi4_submissions(organization_id,student_id,submitted_at DESC);
CREATE INDEX IF NOT EXISTS hn_misi4_class_date
  ON hn_misi4_submissions(organization_id,class_id,submitted_at DESC);
COMMIT;
