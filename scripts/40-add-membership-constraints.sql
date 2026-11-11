-- ============================================================================
-- Migration 40: Add Membership Constraints and Triggers
-- ============================================================================
-- Purpose: Add database constraints and triggers to prevent future data
--          inconsistencies in the membership approval system
-- 
-- Changes:
-- 1. Fix existing data that violates constraints
-- 2. Add CHECK constraint: active status requires club_id
-- 3. Add trigger to sync membership_status when application status changes
-- 4. Add function to validate data consistency
-- ============================================================================

-- ============================================================================
-- 1. Fix Existing Data Before Adding Constraints
-- ============================================================================

-- Find and fix profiles with active status but no club_id
-- Set them to pending status until they get properly approved
UPDATE profiles
SET 
  membership_status = 'pending'
WHERE membership_status = 'active' 
  AND club_id IS NULL;

-- Log the fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  IF fixed_count > 0 THEN
    RAISE NOTICE 'Fixed % profiles with active status but no club_id', fixed_count;
  END IF;
END $$;

-- ============================================================================
-- 2. Add CHECK Constraint: Active Status Requires club_id
-- ============================================================================

-- Add constraint to profiles table
-- Active athletes must have a club_id assigned
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS check_active_requires_club;

ALTER TABLE profiles
ADD CONSTRAINT check_active_requires_club
CHECK (
  (membership_status = 'active' AND club_id IS NOT NULL)
  OR
  (membership_status != 'active')
);

COMMENT ON CONSTRAINT check_active_requires_club ON profiles IS
'Ensures that profiles with active membership status must have a club_id assigned';

-- ============================================================================
-- 3. Create Function to Sync membership_status
-- ============================================================================

-- Function to sync profiles.membership_status when application status changes
CREATE OR REPLACE FUNCTION sync_membership_status_on_application_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- Sync membership_status based on application status
  IF NEW.status = 'approved' THEN
    -- Update profile to active with club and coach info
    UPDATE profiles
    SET 
      membership_status = 'active',
      club_id = NEW.club_id,
      coach_id = NEW.assigned_coach_id
    WHERE user_id = NEW.user_id;

    RAISE NOTICE 'Synced profile for user % to active status', NEW.user_id;

  ELSIF NEW.status = 'rejected' THEN
    -- Update profile to rejected status
    UPDATE profiles
    SET 
      membership_status = 'rejected'
    WHERE user_id = NEW.user_id;

    RAISE NOTICE 'Synced profile for user % to rejected status', NEW.user_id;

  ELSIF NEW.status = 'pending' THEN
    -- Update profile to pending status
    UPDATE profiles
    SET 
      membership_status = 'pending'
    WHERE user_id = NEW.user_id;

    RAISE NOTICE 'Synced profile for user % to pending status', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_membership_status_on_application_change() IS
'Automatically syncs profiles.membership_status when membership_applications.status changes';

-- ============================================================================
-- 4. Create Trigger on membership_applications
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_membership_status ON membership_applications;

-- Create trigger that fires after INSERT or UPDATE on membership_applications
CREATE TRIGGER trigger_sync_membership_status
  AFTER INSERT OR UPDATE OF status
  ON membership_applications
  FOR EACH ROW
  EXECUTE FUNCTION sync_membership_status_on_application_change();

COMMENT ON TRIGGER trigger_sync_membership_status ON membership_applications IS
'Triggers membership_status sync whenever application status changes';

-- ============================================================================
-- 5. Create Data Consistency Validation Function
-- ============================================================================

-- Function to validate data consistency across membership system
CREATE OR REPLACE FUNCTION validate_membership_data_consistency()
RETURNS TABLE (
  issue_type TEXT,
  issue_count BIGINT,
  issue_description TEXT
) AS $$
BEGIN
  -- Check 1: Athletes with active status but no club_id
  RETURN QUERY
  SELECT 
    'active_without_club'::TEXT,
    COUNT(*)::BIGINT,
    'Profiles with active membership_status but no club_id'::TEXT
  FROM profiles
  WHERE membership_status = 'active' AND club_id IS NULL;

  -- Check 2: Athletes with active status but no coach_id
  RETURN QUERY
  SELECT 
    'active_without_coach'::TEXT,
    COUNT(*)::BIGINT,
    'Profiles with active membership_status but no coach_id'::TEXT
  FROM profiles
  WHERE membership_status = 'active' AND coach_id IS NULL;

  -- Check 3: Approved applications without profile_id
  RETURN QUERY
  SELECT 
    'approved_without_profile'::TEXT,
    COUNT(*)::BIGINT,
    'Approved applications without profile_id reference'::TEXT
  FROM membership_applications
  WHERE status = 'approved' AND profile_id IS NULL;

  -- Check 4: Profiles without matching application
  RETURN QUERY
  SELECT 
    'profile_without_application'::TEXT,
    COUNT(*)::BIGINT,
    'Athlete profiles without any membership application'::TEXT
  FROM profiles p
  INNER JOIN user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'athlete'
    AND NOT EXISTS (
      SELECT 1 FROM membership_applications ma
      WHERE ma.user_id = p.id
    );

  -- Check 5: Status mismatch between profile and application
  RETURN QUERY
  SELECT 
    'status_mismatch'::TEXT,
    COUNT(*)::BIGINT,
    'Profiles where membership_status does not match latest application status'::TEXT
  FROM profiles p
  INNER JOIN user_roles ur ON p.id = ur.user_id
  INNER JOIN LATERAL (
    SELECT status, created_at
    FROM membership_applications
    WHERE user_id = p.id
    ORDER BY created_at DESC
    LIMIT 1
  ) latest_app ON true
  WHERE ur.role = 'athlete'
    AND (
      (latest_app.status = 'approved' AND p.membership_status != 'active')
      OR
      (latest_app.status = 'rejected' AND p.membership_status != 'rejected')
      OR
      (latest_app.status = 'pending' AND p.membership_status != 'pending')
    );

  -- Check 6: Multiple pending applications per user
  RETURN QUERY
  SELECT 
    'multiple_pending'::TEXT,
    COUNT(*)::BIGINT,
    'Users with multiple pending applications'::TEXT
  FROM (
    SELECT user_id
    FROM membership_applications
    WHERE status = 'pending'
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) duplicates;

  -- Check 7: Approved applications with mismatched club_id
  RETURN QUERY
  SELECT 
    'club_mismatch'::TEXT,
    COUNT(*)::BIGINT,
    'Approved applications where profile.club_id does not match application.club_id'::TEXT
  FROM membership_applications ma
  INNER JOIN profiles p ON ma.user_id = p.id
  WHERE ma.status = 'approved'
    AND ma.club_id IS NOT NULL
    AND p.club_id IS NOT NULL
    AND ma.club_id != p.club_id;

  -- Check 8: Approved applications with mismatched coach_id
  RETURN QUERY
  SELECT 
    'coach_mismatch'::TEXT,
    COUNT(*)::BIGINT,
    'Approved applications where profile.coach_id does not match application.assigned_coach_id'::TEXT
  FROM membership_applications ma
  INNER JOIN profiles p ON ma.user_id = p.id
  WHERE ma.status = 'approved'
    AND ma.assigned_coach_id IS NOT NULL
    AND p.coach_id IS NOT NULL
    AND ma.assigned_coach_id != p.coach_id;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_membership_data_consistency() IS
'Validates data consistency across the membership system and returns a report of issues';

-- ============================================================================
-- 6. Run Initial Validation
-- ============================================================================

-- Run validation to see current state
DO $$
DECLARE
  rec RECORD;
  has_issues BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Data Consistency Validation Report';
  RAISE NOTICE '============================================================================';
  
  FOR rec IN SELECT * FROM validate_membership_data_consistency() WHERE issue_count > 0 ORDER BY issue_type
  LOOP
    has_issues := TRUE;
    RAISE NOTICE '% : % - %', rec.issue_type, rec.issue_count, rec.issue_description;
  END LOOP;
  
  IF NOT has_issues THEN
    RAISE NOTICE 'No data consistency issues found!';
  END IF;
  
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Migration 40 Complete: Membership Constraints and Triggers';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Added:';
  RAISE NOTICE '  ✓ CHECK constraint: active status requires club_id';
  RAISE NOTICE '  ✓ Trigger: sync_membership_status_on_application_change';
  RAISE NOTICE '  ✓ Function: validate_membership_data_consistency()';
  RAISE NOTICE '';
  RAISE NOTICE 'To validate data consistency at any time, run:';
  RAISE NOTICE '  SELECT * FROM validate_membership_data_consistency();';
  RAISE NOTICE '============================================================================';
END $$;
