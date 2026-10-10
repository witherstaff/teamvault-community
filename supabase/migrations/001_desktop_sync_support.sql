-- Migration: Desktop Sync Support
-- Description: Adds necessary database features for TeamVault Drive desktop sync
-- Date: 2026-03-06

-- ============================================================
-- 1. TRIGGER FOR AUTO-UPDATING updated_at COLUMN
-- ============================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger ONLY if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_vault_objects_updated_at'
  ) THEN
    CREATE TRIGGER update_vault_objects_updated_at
      BEFORE UPDATE ON vault_objects
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- ============================================================
-- 2. PERFORMANCE INDEXES FOR DELTA SYNC
-- ============================================================

-- Index for efficient delta sync queries (updated_at filtering)
CREATE INDEX IF NOT EXISTS idx_vault_objects_updated_at
  ON vault_objects(workspace_id, updated_at)
  WHERE is_deleted = false;

-- Index for folder hierarchy traversal
CREATE INDEX IF NOT EXISTS idx_vault_objects_parent_id
  ON vault_objects(parent_id)
  WHERE is_deleted = false;

-- Index for folder ACL lookups
CREATE INDEX IF NOT EXISTS idx_folder_access_folder_subject
  ON folder_access(folder_id, subject_type, subject_id);

-- Index for audit log performance
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_created
  ON audit_events(workspace_id, created_at DESC);

-- Index for group membership lookups
CREATE INDEX IF NOT EXISTS idx_group_members_user_id
  ON group_members(user_id);

-- ============================================================
-- 3. STORAGE QUOTA TRACKING FUNCTION
-- ============================================================

-- Function to atomically increment workspace storage usage
CREATE OR REPLACE FUNCTION increment_workspace_storage(
  p_workspace_id UUID,
  p_bytes BIGINT
) RETURNS VOID AS $$
BEGIN
  UPDATE workspaces
  SET storage_used_bytes = storage_used_bytes + p_bytes
  WHERE id = p_workspace_id;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement workspace storage usage (for future delete support)
CREATE OR REPLACE FUNCTION decrement_workspace_storage(
  p_workspace_id UUID,
  p_bytes BIGINT
) RETURNS VOID AS $$
BEGIN
  UPDATE workspaces
  SET storage_used_bytes = GREATEST(0, storage_used_bytes - p_bytes)
  WHERE id = p_workspace_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. VERIFICATION QUERIES (Run these to verify migration)
-- ============================================================

-- Check if updated_at column exists
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'vault_objects'
-- AND column_name = 'updated_at';

-- Check if trigger exists
-- SELECT * FROM pg_trigger
-- WHERE tgname = 'update_vault_objects_updated_at';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('vault_objects', 'folder_access', 'audit_events', 'group_members')
-- ORDER BY tablename, indexname;

-- Check functions
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name LIKE '%workspace_storage%';
