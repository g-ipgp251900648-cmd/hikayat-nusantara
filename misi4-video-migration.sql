
-- Hikayat Nusantara: migrasi rakaman Misi 4
-- Selamat dijalankan semula.

CREATE TABLE IF NOT EXISTS hn_misi4_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id uuid NOT NULL
    REFERENCES hn_organizations(id),

  student_id uuid NOT NULL
    REFERENCES hn_users(id) ON DELETE CASCADE,

  drive_file_id text,
  object_key text,

  mime_type varchar(30) NOT NULL
    CHECK (mime_type IN ('video/mp4', 'video/webm')),

  expected_bytes bigint NOT NULL
    CHECK (expected_bytes > 0),

  status varchar(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'submitted',
      'reviewed',
      'revision_requested'
    )),

  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hn_misi4_videos_student
ON hn_misi4_videos (
  organization_id,
  student_id,
  submitted_at DESC
);
