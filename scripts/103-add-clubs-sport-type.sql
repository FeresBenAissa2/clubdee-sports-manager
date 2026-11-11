-- ============================================================================
-- Add sport_type column to clubs table
-- Migration: 103-add-clubs-sport-type.sql
-- Description: Add sport_type field to clubs table for categorization
-- Author: System View Master Spec
-- Date: 2025-11-27
-- ============================================================================

-- ============================================
-- UP Migration
-- ============================================

BEGIN;

-- Add sport_type field if it doesn't exist
ALTER TABLE clubs
ADD COLUMN IF NOT EXISTS sport_type VARCHAR(100);

-- Add index for sport_type for filtering
CREATE INDEX IF NOT EXISTS idx_clubs_sport_type ON clubs(sport_type);

-- Add comment to document the field
COMMENT ON COLUMN clubs.sport_type IS 'Type of sport for this club (e.g., football, basketball, swimming)';

COMMIT;

-- ============================================
-- DOWN Migration (Rollback)
-- ============================================

BEGIN;

-- Drop index
DROP INDEX IF EXISTS idx_clubs_sport_type;

-- Drop column
ALTER TABLE clubs
DROP COLUMN IF EXISTS sport_type;

COMMIT;
