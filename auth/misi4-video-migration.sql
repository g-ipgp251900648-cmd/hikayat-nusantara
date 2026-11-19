-- Apply using Neon SQL Editor before enabling Misi 4 submission.
CREATE TABLE IF NOT EXISTS hn_misi4_videos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES hn_organizations(id),
 student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
 object_key text NOT NULL UNIQUE,
 mime_type varchar(32) NOT NULL CHECK (mime_type IN ('video/webm','video/mp4')),
 expected_bytes bigint NOT NULL CHECK (expected_bytes BETWEEN 1024 AND 104857600),
 status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted')),
 submitted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_misi4_videos_student ON hn_misi4_videos(organization_id,student_id,submitted_at DESC);
