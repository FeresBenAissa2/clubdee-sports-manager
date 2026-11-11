-- ============================================================================
-- Membership Approval System - Helper Functions
-- ============================================================================
-- Description: Helper functions for membership application management
-- Task: 1.4 - Create helper functions
-- Author: System
-- Created: 2024-11-23
-- ============================================================================

-- ============================================================================
-- Function: Expire Old Applications (>30 days)
-- ============================================================================
-- Description: Automatically reject applications that have been pending for more than 30 days
-- Business Rule: BR3 - Application Expiry
-- Usage: Can be called manually or scheduled via pg_cron

CREATE OR REPLACE FUNCTION expire_old_applications()
RETURNS TABLE(
  expired_count INTEGER,
  expired_application_ids UUID[]
) AS $$
DECLARE
  v_expired_ids UUID[];
  v_count INTEGER;
BEGIN
  -- Find and update applications that are pending for more than 30 days
  WITH expired_apps AS (
    UPDATE membership_applications
    SET 
      status = 'rejected',
      rejection_reason = 'คำขอหมดอายุ (เกิน 30 วัน) - Application expired (over 30 days)',
      reviewed_by = '00000000-0000-0000-0000-000000000000'::UUID, -- System user
      updated_at = NOW()
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id, user_id, club_id
  )
  SELECT 
    array_agg(id),
    COUNT(*)::INTEGER
  INTO v_expired_ids, v_count
  FROM expired_apps;

  -- Update profile membership_status for affected users
  UPDATE profiles
  SET membership_status = 'rejected'
  WHERE id IN (
    SELECT user_id 
    FROM membership_applications 
    WHERE id = ANY(v_expired_ids)
  )
  AND membership_status = 'pending';

  -- Log activity for each expired application
  IF v_expired_ids IS NOT NULL THEN
    PERFORM add_activity_log(
      app_id,
      'auto_expired',
      '00000000-0000-0000-0000-000000000000'::UUID, -- System user
      jsonb_build_object(
        'reason', 'Application pending for more than 30 days',
        'expired_at', NOW()
      )
    )
    FROM unnest(v_expired_ids) AS app_id;
  END IF;

  -- Return results
  expired_count := COALESCE(v_count, 0);
  expired_application_ids := COALESCE(v_expired_ids, ARRAY[]::UUID[]);
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION expire_old_applications() IS 
'Automatically rejects membership applications that have been pending for more than 30 days. Returns count and IDs of expired applications.';

-- ============================================================================
-- Function: Check for Duplicate Pending Applications
-- ============================================================================
-- Description: Check if a user already has a pending application for any club
-- Business Rule: BR1 - One Active Application Per User
-- Usage: Call before allowing new application submission

CREATE OR REPLACE FUNCTION check_duplicate_pending_application(
  p_user_id UUID
)
RETURNS TABLE(
  has_pending BOOLEAN,
  pending_application_id UUID,
  pending_club_id UUID,
  pending_since TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as has_pending,
    ma.id as pending_application_id,
    ma.club_id as pending_club_id,
    ma.created_at as pending_since
  FROM membership_applications ma
  WHERE ma.user_id = p_user_id
    AND ma.status = 'pending'
  LIMIT 1;
  
  -- If no pending application found, return false
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      FALSE as has_pending,
      NULL::UUID as pending_application_id,
      NULL::UUID as pending_club_id,
      NULL::TIMESTAMPTZ as pending_since;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION check_duplicate_pending_application(UUID) IS 
'Checks if a user has an existing pending application. Returns application details if found.';

-- ============================================================================
-- Function: Validate Coach-Club Relationship
-- ============================================================================
-- Description: Verify that a coach belongs to the specified club
-- Business Rule: BR2 - Coach-Club Relationship
-- Usage: Call before allowing coach to approve applications

CREATE OR REPLACE FUNCTION validate_coach_club_relationship(
  p_coach_id UUID,
  p_club_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_valid BOOLEAN;
BEGIN
  -- Check if coach's profile has the specified club_id
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = p_coach_id
      AND ur.role = 'coach'
      AND p.club_id = p_club_id
  ) INTO v_is_valid;
  
  RETURN COALESCE(v_is_valid, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION validate_coach_club_relationship(UUID, UUID) IS 
'Validates that a coach belongs to the specified club. Returns TRUE if valid, FALSE otherwise.';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  -- Count helper functions
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'expire_old_applications',
      'check_duplicate_pending_application',
      'validate_coach_club_relationship'
    );
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Membership Helper Functions Created';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total functions created: %', func_count;
  
  IF func_count < 3 THEN
    RAISE WARNING 'Expected 3 functions, found %', func_count;
  ELSE
    RAISE NOTICE '✓ All helper functions created successfully';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Function Summary:';
  RAISE NOTICE '1. expire_old_applications()';
  RAISE NOTICE '   - Auto-rejects applications pending > 30 days';
  RAISE NOTICE '   - Returns: expired_count, expired_application_ids';
  RAISE NOTICE '';
  RAISE NOTICE '2. check_duplicate_pending_application(user_id)';
  RAISE NOTICE '   - Checks for existing pending applications';
  RAISE NOTICE '   - Returns: has_pending, application details';
  RAISE NOTICE '';
  RAISE NOTICE '3. validate_coach_club_relationship(coach_id, club_id)';
  RAISE NOTICE '   - Validates coach belongs to club';
  RAISE NOTICE '   - Returns: BOOLEAN';
  RAISE NOTICE '==============================================';
  
  -- Test expire_old_applications function exists and is callable
  PERFORM expire_old_applications();
  RAISE NOTICE '✓ expire_old_applications() is callable';
  
END $$;
