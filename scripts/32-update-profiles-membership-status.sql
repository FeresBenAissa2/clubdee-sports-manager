-- ============================================================================
-- Membership Approval System - Update profiles Table
-- ============================================================================
-- Description: Add membership_status and coach_id columns to profiles table
-- Task: 1.2 - Modify profiles table
-- Author: System
-- Created: 2024-11-23
-- ============================================================================

-- Create membership_status enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('pending', 'active', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add membership_status column with default 'pending'
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS membership_status membership_status DEFAULT 'pending';

-- Add coach_id column (nullable until application is approved)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add club_id column (nullable until application is approved)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE SET NULL;

-- Add index on membership_status for filtering queries
CREATE INDEX IF NOT EXISTS idx_profiles_membership_status 
ON profiles(membership_status);

-- Add index on coach_id for coach queries
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id 
ON profiles(coach_id);

-- Add comment to document the column
COMMENT ON COLUMN profiles.membership_status IS 
'Membership status: pending (awaiting approval), active (approved and can access system), rejected (application denied), suspended (temporarily disabled)';

COMMENT ON COLUMN profiles.coach_id IS 
'Assigned coach after membership application is approved. NULL until approval.';

-- ============================================================================
-- Verification Queries (run separately if needed)
-- ============================================================================
-- Check columns exist:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN ('membership_status', 'coach_id', 'club_id');

-- Check enum values:
-- SELECT enumlabel 
-- FROM pg_enum 
-- WHERE enumtypid = 'membership_status'::regtype
-- ORDER BY enumsortorder;

-- Check indexes exist:
-- SELECT indexname 
-- FROM pg_indexes
-- WHERE tablename = 'profiles'
--   AND indexname IN ('idx_profiles_membership_status', 'idx_profiles_coach_id');

-- Check existing data:
-- SELECT 
--   COUNT(*) as total_profiles,
--   COUNT(CASE WHEN membership_status = 'pending' THEN 1 END) as pending,
--   COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active,
--   COUNT(CASE WHEN membership_status = 'rejected' THEN 1 END) as rejected,
--   COUNT(CASE WHEN membership_status = 'suspended' THEN 1 END) as suspended,
--   COUNT(coach_id) as with_coach,
--   COUNT(club_id) as with_club
-- FROM profiles;
