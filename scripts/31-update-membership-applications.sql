-- ============================================================================
-- Membership Approval System - Update membership_applications Table
-- ============================================================================
-- Description: Add columns for coach assignment and rejection handling
-- Task: 1.1 - Modify membership_applications table
-- Author: System
-- Created: 2024-11-23
-- ============================================================================

-- Add new columns for approval workflow
ALTER TABLE membership_applications
ADD COLUMN IF NOT EXISTS assigned_coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create composite index for coach queries (club_id, status)
CREATE INDEX IF NOT EXISTS idx_applications_club_status 
ON membership_applications(club_id, status);

-- Add index on assigned_coach_id for coach queries
CREATE INDEX IF NOT EXISTS idx_applications_assigned_coach 
ON membership_applications(assigned_coach_id);

-- Add index on reviewed_by for audit queries
CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by 
ON membership_applications(reviewed_by);

-- ============================================================================
-- Verification Queries (run separately if needed)
-- ============================================================================
-- Check columns exist:
-- SELECT column_name, data_type 
-- FROM information_schema.columns
-- WHERE table_name = 'membership_applications'
--   AND column_name IN ('assigned_coach_id', 'reviewed_by', 'rejection_reason');

-- Check indexes exist:
-- SELECT indexname 
-- FROM pg_indexes
-- WHERE tablename = 'membership_applications'
--   AND indexname IN ('idx_applications_club_status', 'idx_applications_assigned_coach', 'idx_applications_reviewed_by');
