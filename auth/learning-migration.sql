-- Jalankan sekali dalam Neon SQL Editor: production > neondb
-- Selamat diulang; CREATE TABLE/INDEX IF NOT EXISTS sahaja.
BEGIN;
-- Teacher-verified PBD, published feedback, and explicit pupil text submissions.
-- Mission game scores are NOT official TP values.
CREATE TABLE IF NOT EXISTS hn_pbd_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  mission_id integer NOT NULL CHECK (mission_id BETWEEN 1 AND 4),
  class_id uuid REFERENCES hn_classes(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES hn_users(id) ON DELETE SET NULL,
  tp integer CHECK (tp BETWEEN 1 AND 6),
  rubric jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence text NOT NULL DEFAULT '',
  justification text NOT NULL DEFAULT '',
  status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed')),
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE(organization_id,student_id,mission_id)
);
CREATE INDEX IF NOT EXISTS hn_pbd_org_student ON hn_pbd_assessments(organization_id,student_id);
CREATE TABLE IF NOT EXISTS hn_pbd_assessment_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  mission_id integer NOT NULL CHECK (mission_id BETWEEN 1 AND 4),
  teacher_id uuid REFERENCES hn_users(id) ON DELETE SET NULL,
  revision integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_pbd_history_org_student ON hn_pbd_assessment_history(organization_id,student_id,created_at DESC);
CREATE TABLE IF NOT EXISTS hn_teacher_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  mission_id integer NOT NULL CHECK (mission_id BETWEEN 1 AND 4),
  teacher_id uuid REFERENCES hn_users(id) ON DELETE SET NULL,
  strengths varchar(1500) NOT NULL DEFAULT '',
  improvements varchar(1500) NOT NULL DEFAULT '',
  next_steps varchar(1500) NOT NULL DEFAULT '',
  status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','revision_requested')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_feedback_student ON hn_teacher_feedback(organization_id,student_id,created_at DESC);
CREATE TABLE IF NOT EXISTS hn_portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  mission_id integer NOT NULL CHECK (mission_id BETWEEN 1 AND 4),
  title varchar(120) NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 20 AND 5000),
  status varchar(24) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed','revision_requested')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_portfolio_student ON hn_portfolio_entries(organization_id,student_id,created_at DESC);
COMMIT;
