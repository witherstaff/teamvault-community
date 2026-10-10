-- ══════════════════════════════════════════════════════════════════
-- TeamVault Community Edition — Complete Database Schema
-- ══════════════════════════════════════════════════════════════════
-- Standalone, open-source schema for self-hosted TeamVault.
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard
--
-- It provides complete multi-user storage, groups,
-- permissions, geofencing, file versioning, and verified downloads.
-- ══════════════════════════════════════════════════════════════════

-- Enable citext extension for case-insensitive email matching
CREATE EXTENSION IF NOT EXISTS citext;

-- ── 1. workspaces ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL,
  slug                        text UNIQUE NOT NULL,
  plan_id                     text NOT NULL DEFAULT 'team',
  storage_limit_bytes         bigint NOT NULL DEFAULT 1099511627776,  -- 1 TB default
  storage_used_bytes          bigint NOT NULL DEFAULT 0,
  geo_enabled                 boolean NOT NULL DEFAULT false,
  geo_allowed_countries       text[] NOT NULL DEFAULT '{}',
  geo_bypass_allowed          boolean NOT NULL DEFAULT false,
  verified_downloads_per_month int NOT NULL DEFAULT 100,
  recycle_bin_retention_days  int NOT NULL DEFAULT 30,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          citext UNIQUE NOT NULL,
  name           text,
  auth_provider  text,
  auth_subject   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_provider, auth_subject)
);

-- ── 3. memberships ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memberships (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role                text NOT NULL CHECK (role IN ('admin','user')),
  can_upload          boolean NOT NULL DEFAULT false,
  status              text NOT NULL CHECK (status IN ('invited','active','disabled')),
  geo_country_override text[] NOT NULL DEFAULT '{}',
  geo_bypass_allowed  boolean,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS memberships_workspace_user_idx ON memberships(workspace_id, user_id);

-- ── 4. groups ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          text NOT NULL,
  is_system     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

-- ── 5. group_members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  group_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- ── 6. vault_objects ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_objects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES vault_objects(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('folder','file')),
  name            text NOT NULL,
  size_bytes      bigint,
  mime_type       text,
  checksum_sha256 text,
  storage_bucket  text,
  storage_key     text,
  is_deleted      boolean NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vault_objects_workspace_parent_idx ON vault_objects(workspace_id, parent_id);
CREATE INDEX IF NOT EXISTS vault_objects_workspace_deleted_idx ON vault_objects(workspace_id, is_deleted);
CREATE INDEX IF NOT EXISTS vault_objects_workspace_type_idx ON vault_objects(workspace_id, type);
CREATE INDEX IF NOT EXISTS vault_objects_workspace_deleted_at_idx ON vault_objects(workspace_id, deleted_at) WHERE is_deleted = true;

-- ── 7. file_versions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS file_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id       uuid NOT NULL REFERENCES vault_objects(id) ON DELETE CASCADE,
  version_number  int NOT NULL,
  storage_bucket  text NOT NULL,
  storage_key     text NOT NULL,
  size_bytes      bigint NOT NULL DEFAULT 0,
  checksum_sha256 text,
  mime_type       text,
  uploaded_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (object_id, version_number)
);
CREATE INDEX IF NOT EXISTS file_versions_object_idx ON file_versions(object_id);

-- ── 8. folder_access ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folder_access (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id     uuid NOT NULL REFERENCES vault_objects(id) ON DELETE CASCADE,
  subject_type  text NOT NULL CHECK (subject_type IN ('user','group')),
  subject_id    uuid NOT NULL,
  access        text NOT NULL DEFAULT 'view' CHECK (access IN ('view')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, subject_type, subject_id)
);
CREATE INDEX IF NOT EXISTS folder_access_workspace_folder_idx ON folder_access(workspace_id, folder_id);
CREATE INDEX IF NOT EXISTS folder_access_subject_idx ON folder_access(subject_type, subject_id);

-- ── 9. audit_events ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL,
  actor_user_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  action          text NOT NULL,
  object_id       uuid,
  target_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  target_group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  result          text NOT NULL CHECK (result IN ('allowed','denied','error')),
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_workspace_created_idx ON audit_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_workspace_action_idx ON audit_events(workspace_id, action);
CREATE INDEX IF NOT EXISTS audit_events_object_idx ON audit_events(object_id);

-- ── 10. devices ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id     text UNIQUE NOT NULL,
  name          text NOT NULL,
  platform      text NOT NULL,
  hostname      text NOT NULL,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS devices_user_id_idx ON devices(user_id);

-- ── 11. geofence_bypass_codes ────────────────────────────────────
CREATE TABLE IF NOT EXISTS geofence_bypass_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash     text NOT NULL,
  expires_at    timestamptz NOT NULL,
  used          boolean NOT NULL DEFAULT false,
  attempt_count int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_geofence_bypass_user ON geofence_bypass_codes(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_geofence_bypass_expires ON geofence_bypass_codes(expires_at) WHERE NOT used;

-- ── 12. verified_download_rules ──────────────────────────────────
CREATE TABLE IF NOT EXISTS verified_download_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  object_id       uuid NOT NULL REFERENCES vault_objects(id) ON DELETE CASCADE,
  expires_at      timestamptz,
  max_downloads   int,
  allowed_emails  text[],
  allowed_ips     text[],
  watermark       boolean NOT NULL DEFAULT false,
  is_revoked      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verified_download_rules_object ON verified_download_rules(object_id);
CREATE INDEX IF NOT EXISTS idx_verified_download_rules_workspace ON verified_download_rules(workspace_id);

-- ── 13. verified_download_log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS verified_download_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  object_id             uuid NOT NULL REFERENCES vault_objects(id) ON DELETE CASCADE,
  download_token        text NOT NULL,
  downloader_email      text NOT NULL,
  downloader_ip         text,
  result                text NOT NULL,
  filename              text,
  folder_path           text,
  session_id            text,
  watermarked_checksum  text,
  file_checksum         text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verified_download_log_token ON verified_download_log(download_token);
CREATE INDEX IF NOT EXISTS idx_verified_download_log_workspace ON verified_download_log(workspace_id, created_at DESC);

-- ── Triggers & Functions ─────────────────────────────────────────

-- Updated at timestamp trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vault_objects_updated_at ON vault_objects;
CREATE TRIGGER trg_vault_objects_updated_at
BEFORE UPDATE ON vault_objects
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Atomic storage increment/decrement
CREATE OR REPLACE FUNCTION increment_workspace_storage(p_workspace_id uuid, p_bytes bigint)
RETURNS void AS $$
BEGIN
  UPDATE workspaces
  SET storage_used_bytes = GREATEST(0, storage_used_bytes + p_bytes)
  WHERE id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recursive folder hierarchy descendant resolution
CREATE OR REPLACE FUNCTION get_all_descendants(p_folder_id uuid)
RETURNS TABLE (id uuid) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE descendants AS (
        SELECT vo.id
        FROM vault_objects vo
        WHERE vo.parent_id = p_folder_id
        UNION ALL
        SELECT vo.id
        FROM vault_objects vo
        INNER JOIN descendants d ON vo.parent_id = d.id
    )
    SELECT descendants.id FROM descendants;
END;
$$ LANGUAGE plpgsql STABLE;
