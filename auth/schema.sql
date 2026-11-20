-- Initial schema for one or more organizations. Run only on a private PostgreSQL database.
-- No real student data should be entered until institutional privacy requirements are met.
BEGIN;
CREATE TABLE IF NOT EXISTS hn_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 150),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hn_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  login_id varchar(32) NOT NULL UNIQUE,
  display_name varchar(100) NOT NULL,
  password_hash text NOT NULL,
  role varchar(10) NOT NULL CHECK (role IN ('admin','guru','murid','gkmp','panitia')),
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  failed_logins integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Backward-compatible upgrade for databases created with three original roles.
ALTER TABLE hn_users DROP CONSTRAINT IF EXISTS hn_users_role_check;
ALTER TABLE hn_users ADD CONSTRAINT hn_users_role_check
  CHECK (role IN ('admin','guru','murid','gkmp','panitia'));
-- Only one active person for each leadership position in an organization.
CREATE UNIQUE INDEX IF NOT EXISTS hn_one_active_bm_leader_per_org
  ON hn_users(organization_id,role)
  WHERE active AND role IN ('gkmp','panitia');
CREATE INDEX IF NOT EXISTS hn_users_org_role ON hn_users(organization_id,role);
CREATE TABLE IF NOT EXISTS hn_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  teacher_id uuid NOT NULL REFERENCES hn_users(id),
  name varchar(100) NOT NULL,
  school_year integer NOT NULL CHECK (school_year BETWEEN 2020 AND 2100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id,name,school_year)
);
CREATE TABLE IF NOT EXISTS hn_class_members (
  class_id uuid NOT NULL REFERENCES hn_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(class_id,student_id)
);
CREATE INDEX IF NOT EXISTS hn_class_members_student ON hn_class_members(student_id);
CREATE TABLE IF NOT EXISTS hn_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_sessions_user ON hn_sessions(user_id);
CREATE TABLE IF NOT EXISTS hn_mission_progress (
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  mission_id integer NOT NULL CHECK (mission_id BETWEEN 1 AND 4),
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  state varchar(12) NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','submitted','verified')),
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id,mission_id)
);
CREATE TABLE IF NOT EXISTS hn_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  actor_id uuid REFERENCES hn_users(id) ON DELETE SET NULL,
  action varchar(80) NOT NULL,
  resource_type varchar(40) NOT NULL,
  resource_id varchar(64),
  outcome varchar(20) NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Keep historical audit entries when a departed account is permanently deleted.
-- Its actor reference becomes NULL; the audit event itself is preserved.
ALTER TABLE hn_audit ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE hn_audit DROP CONSTRAINT IF EXISTS hn_audit_actor_id_fkey;
ALTER TABLE hn_audit ADD CONSTRAINT hn_audit_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES hn_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS hn_audit_org_time ON hn_audit(organization_id,created_at DESC);
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
CREATE TABLE IF NOT EXISTS hn_teacher_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  student_id uuid NOT NULL REFERENCES hn_users(id) ON DELETE CASCADE,
  mission_id integer NOT NULL CHECK (mission_id BETWEEN 1 AND 4),
  teacher_id uuid REFERENCES hn_users(id) ON DELETE SET NULL,
  plan varchar(1500) NOT NULL CHECK (char_length(plan) BETWEEN 10 AND 1500),
  status varchar(24) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_interventions_student ON hn_teacher_interventions(organization_id,student_id,created_at DESC);
-- Guru preferences are private to the authenticated teacher and organization.
-- Running this migration again does not overwrite existing settings.
CREATE TABLE IF NOT EXISTS hn_teacher_settings (
  user_id uuid PRIMARY KEY REFERENCES hn_users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  default_class_id uuid REFERENCES hn_classes(id) ON DELETE SET NULL,
  compact_tables boolean NOT NULL DEFAULT false,
  reduce_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_teacher_settings_org ON hn_teacher_settings(organization_id);
-- Private Misi 2 game snapshot, scoped to a pupil and organization.
-- Raw story drafts are never returned to teacher or admin APIs.
CREATE TABLE IF NOT EXISTS hn_misi2_game_state (
  student_id uuid PRIMARY KEY REFERENCES hn_users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES hn_organizations(id),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_misi2_state_org ON hn_misi2_game_state(organization_id);
COMMIT;
