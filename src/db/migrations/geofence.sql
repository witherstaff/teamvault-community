-- ─────────────────────────────────────────────────────────────────────────────
-- Geofencing migration
-- Run this in the Supabase SQL Editor after deploying the geofencing feature.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Workspace-level geo settings ─────────────────────────────────────────────

ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS geo_enabled boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS geo_allowed_countries text[] NOT NULL DEFAULT '{}',
    -- If true, ALL workspace members may request an email bypass code when blocked.
    -- Can be further overridden per user via memberships.geo_bypass_allowed.
    ADD COLUMN IF NOT EXISTS geo_bypass_allowed boolean NOT NULL DEFAULT false;

-- ── Per-membership geo settings ───────────────────────────────────────────────

ALTER TABLE memberships
    -- Country codes that bypass the workspace allowlist for this specific user.
    -- e.g. '{"US","CA"}' — ISO 3166-1 alpha-2, stored uppercase.
    ADD COLUMN IF NOT EXISTS geo_country_override text[] NOT NULL DEFAULT '{}',
    -- Explicitly allow (or deny) this user to request bypass codes, overriding
    -- the workspace-level geo_bypass_allowed flag.
    -- NULL = inherit workspace default, true = allow, false = deny.
    ADD COLUMN IF NOT EXISTS geo_bypass_allowed boolean;

-- ── Bypass codes table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS geofence_bypass_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- SHA-256 hex of the plain-text code (never store plain codes).
    code_hash       text NOT NULL,
    expires_at      timestamptz NOT NULL,
    used            boolean NOT NULL DEFAULT false,
    attempt_count   int NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofence_bypass_user
    ON geofence_bypass_codes (user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_geofence_bypass_expires
    ON geofence_bypass_codes (expires_at)
    WHERE NOT used;
