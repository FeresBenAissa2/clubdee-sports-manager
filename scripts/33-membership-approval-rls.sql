-- ============================================================================
-- Membership Approval System - RLS Policies
-- ============================================================================
-- Description: Row Level Security policies for coach-club isolation
-- Task: 1.3 - Create RLS policies for membership approval
-- Author: System
-- Created: 2024-11-23
-- ============================================================================

-- ============================================================================
-- Drop existing policies
-- ============================================================================
DROP POLICY IF EXISTS "coach_view_own_club_applications" ON membership_applications;
DROP POLICY IF EXISTS "coach_approve_own_club_applications" ON membership_applications;
DROP POLICY IF EXISTS "athlete_view_own_applications" ON membership_applications;
DROP POLICY IF EXISTS "admin_view_all_applications" ON membership_applications;
DROP POLICY IF EXISTS "admin_update_all_applications" ON membership_applications;
DROP POLICY IF EXISTS "admin_insert_applications" ON membership_applications;

-- Also drop old policies from script 28 if they exist
DROP POLICY IF EXISTS "Coaches can view club applications" ON membership_applications;
DROP POLICY IF EXISTS "Coaches can review club applications" ON membership_applications;
DROP POLICY IF EXISTS "Athletes can view own applications" ON membership_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON membership_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON membership_applications;

-- ============================================================================
-- Coach Policies - View only their club's applications
-- ============================================================================

-- Coach: View only applications for their club
-- Validates: AC2 - Coach Assignment by Club
CREATE POLICY "coach_view_own_club_applications"
ON membership_applications FOR SELECT
TO authenticated
USING (
  -- Coach can see applications where the club_id matches their profile's club_id
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'coach'
    AND p.club_id = membership_applications.club_id
  )
);

-- Coach: Approve/reject only applications for their club
-- Validates: AC3 - Coach Approval Process
CREATE POLICY "coach_approve_own_club_applications"
ON membership_applications FOR UPDATE
TO authenticated
USING (
  -- Coach can only update applications for their club
  membership_applications.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'coach'
    AND p.club_id = membership_applications.club_id
  )
)
WITH CHECK (
  -- After update, status must be approved or rejected
  membership_applications.status IN ('approved', 'rejected')
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'coach'
    AND p.club_id = membership_applications.club_id
  )
);

-- ============================================================================
-- Athlete Policies - View only their own applications
-- ============================================================================

-- Athlete: View only their own applications
-- Validates: AC4, AC5, AC6 - Post-approval, rejection, and pending state
CREATE POLICY "athlete_view_own_applications"
ON membership_applications FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- ============================================================================
-- Admin Policies - Full access
-- ============================================================================

-- Admin: View all applications
-- Validates: AC8 - Admin Override
CREATE POLICY "admin_view_all_applications"
ON membership_applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Admin: Update all applications
-- Validates: AC8 - Admin Override
CREATE POLICY "admin_update_all_applications"
ON membership_applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Admin: Insert applications (for testing and admin operations)
CREATE POLICY "admin_insert_applications"
ON membership_applications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies on membership_applications
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'membership_applications';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RLS Policies Created Successfully';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total policies on membership_applications: %', policy_count;
  
  IF policy_count < 6 THEN
    RAISE WARNING 'Expected at least 6 policies, found %', policy_count;
  ELSE
    RAISE NOTICE '✓ All required policies created';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Policy Summary:';
  RAISE NOTICE '- coach_view_own_club_applications (SELECT)';
  RAISE NOTICE '- coach_approve_own_club_applications (UPDATE)';
  RAISE NOTICE '- athlete_view_own_applications (SELECT)';
  RAISE NOTICE '- admin_view_all_applications (SELECT)';
  RAISE NOTICE '- admin_update_all_applications (UPDATE)';
  RAISE NOTICE '- admin_insert_applications (INSERT)';
  RAISE NOTICE '==============================================';
END $$;
