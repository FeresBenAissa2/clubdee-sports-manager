-- Migration: 105-create-feature-flags-table.sql
-- Description: Create feature_flags table for gradual feature rollout and kill-switch capability
-- Author: System
-- Date: 2025-11-27
-- Requirements: 20.8, 20.9

-- ============================================
-- UP Migration
-- ============================================

BEGIN;

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  name VARCHAR(255) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups by enabled status
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);

-- Create index for rollout queries
CREATE INDEX IF NOT EXISTS idx_feature_flags_rollout ON feature_flags(enabled, rollout_percentage);

-- Add comment to table
COMMENT ON TABLE feature_flags IS 'Feature flag configuration for gradual rollout and kill-switch capability';
COMMENT ON COLUMN feature_flags.name IS 'Unique feature flag identifier (e.g., attendance_qr_checkin_v1)';
COMMENT ON COLUMN feature_flags.enabled IS 'Master switch for the feature';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Percentage of users who see the feature (0-100)';
COMMENT ON COLUMN feature_flags.description IS 'Human-readable description of the feature';

-- Seed initial feature flags for existing features
INSERT INTO feature_flags (name, enabled, rollout_percentage, description) VALUES
  ('attendance_qr_checkin_v1', true, 100, 'QR code-based attendance check-in for training sessions'),
  ('parent_dashboard_v1', true, 100, 'Parent portal for monitoring athlete progress and attendance'),
  ('home_training_v1', true, 100, 'Self-directed home training logging with coach feedback'),
  ('tournament_management_v1', true, 100, 'Tournament creation, registration, and results tracking'),
  ('activity_checkin_v1', true, 100, 'QR code check-in for general club activities beyond training sessions')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ============================================
-- DOWN Migration (Rollback)
-- ============================================

-- BEGIN;

-- -- Drop indexes
-- DROP INDEX IF EXISTS idx_feature_flags_rollout;
-- DROP INDEX IF EXISTS idx_feature_flags_enabled;

-- -- Drop table
-- DROP TABLE IF EXISTS feature_flags;

-- COMMIT;
