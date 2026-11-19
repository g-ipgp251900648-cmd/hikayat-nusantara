-- Run once in Neon SQL Editor on production/neondb before deploying.
BEGIN;
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
COMMIT;
