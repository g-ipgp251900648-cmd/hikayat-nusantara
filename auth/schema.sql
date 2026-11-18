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
  role varchar(10) NOT NULL CHECK (role IN ('admin','guru','murid')),
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  failed_logins integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
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
  actor_id uuid NOT NULL REFERENCES hn_users(id),
  action varchar(80) NOT NULL,
  resource_type varchar(40) NOT NULL,
  resource_id varchar(64),
  outcome varchar(20) NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hn_audit_org_time ON hn_audit(organization_id,created_at DESC);
COMMIT;
