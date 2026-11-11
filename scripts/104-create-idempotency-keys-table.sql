-- Migration: 104-create-idempotency-keys-table.sql
-- Description: Create idempotency_keys table for preventing duplicate operations
-- Author: System
-- Date: 2025-11-27
-- Requirements: 20.6, 20.7

-- ============================================
-- UP Migration
-- ============================================

BEGIN;

-- Create idempotency_keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(500) NOT NULL,
  response_body JSONB,
  response_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite primary key ensures uniqueness per user+endpoint+key
  PRIMARY KEY (key, user_id, endpoint)
);

-- Create index on key for fast lookups
CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(key);

-- Create index on user_id for user-specific queries
CREATE INDEX idx_idempotency_keys_user_id ON idempotency_keys(user_id);

-- Create index on created_at for cleanup queries
CREATE INDEX idx_idempotency_keys_created_at ON idempotency_keys(created_at);

-- Add comment to table
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys to prevent duplicate operations on retry';

-- Add comments to columns
COMMENT ON COLUMN idempotency_keys.key IS 'Unique idempotency key provided by client';
COMMENT ON COLUMN idempotency_keys.user_id IS 'User who made the request';
COMMENT ON COLUMN idempotency_keys.endpoint IS 'API endpoint that was called';
COMMENT ON COLUMN idempotency_keys.response_body IS 'Cached response body to return for duplicate requests';
COMMENT ON COLUMN idempotency_keys.response_status IS 'HTTP status code of the original response';
COMMENT ON COLUMN idempotency_keys.created_at IS 'Timestamp when the key was first used';

-- Enable Row Level Security
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own idempotency keys
CREATE POLICY "users_own_idempotency_keys"
  ON idempotency_keys FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: System can insert idempotency keys (service role)
CREATE POLICY "service_role_insert_idempotency_keys"
  ON idempotency_keys FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Admins can view all idempotency keys for debugging
CREATE POLICY "admins_view_all_idempotency_keys"
  ON idempotency_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to clean up old idempotency keys (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_keys
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_idempotency_keys() IS 'Removes idempotency keys older than 24 hours';

COMMIT;

-- ============================================
-- DOWN Migration (Rollback)
-- ============================================

BEGIN;

-- Drop function
DROP FUNCTION IF EXISTS cleanup_old_idempotency_keys();

-- Drop RLS policies
DROP POLICY IF EXISTS "admins_view_all_idempotency_keys" ON idempotency_keys;
DROP POLICY IF EXISTS "service_role_insert_idempotency_keys" ON idempotency_keys;
DROP POLICY IF EXISTS "users_own_idempotency_keys" ON idempotency_keys;

-- Drop indexes
DROP INDEX IF EXISTS idx_idempotency_keys_created_at;
DROP INDEX IF EXISTS idx_idempotency_keys_user_id;
DROP INDEX IF EXISTS idx_idempotency_keys_key;

-- Drop table
DROP TABLE IF EXISTS idempotency_keys;

COMMIT;
