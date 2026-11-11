-- ============================================================================
-- Migration 118: Verify Demo Data Exists
-- ============================================================================
-- Description: Comprehensive verification script to check all demo data exists
-- with correct relationships and foreign key integrity.
-- 
-- This script validates:
-- - Demo club exists
-- - All demo users exist with correct roles
-- - Coach and athlete have correct club_id
-- - Training sessions exist for demo club
-- - Announcements exist from demo coach
-- - Attendance records exist
-- - Performance records exist
-- - Parent connection exists
--
-- Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
-- ============================================================================

-- ============================================================================
-- Demo IDs Reference
-- ============================================================================
-- Club:         d1e2f3a4-b5c6-7890-abcd-ef1234567890
-- Admin User:   a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- Coach User:   b2c3d4e5-f6a7-8901-bcde-f12345678901
-- Athlete User: c3d4e5f6-a7b8-9012-cdef-123456789012
-- Parent User:  d4e5f6a7-b8c9-0123-def0-234567890123

-- ============================================================================
-- 1. Verify Demo Club Exists
-- ============================================================================
SELECT '=== 1. Demo Club Verification ===' as section;

DO $$
DECLARE
  v_club_count INTEGER;
  v_club_name TEXT;
BEGIN
  SELECT COUNT(*), MAX(name) INTO v_club_count, v_club_name
  FROM public.clubs 
  WHERE id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';
  
  IF v_club_count = 0 THEN
    RAISE EXCEPTION 'FAIL: Demo club does not exist';
  ELSE
    RAISE NOTICE 'PASS: Demo club exists - %', v_club_name;
  END IF;
END $$;

-- ============================================================================
-- 2. Verify Demo Users Exist with Correct Roles
-- ============================================================================
SELECT '=== 2. Demo Users Verification ===' as section;

-- 2.1 Admin User
DO $$
DECLARE
  v_user_count INTEGER;
  v_role TEXT;
BEGIN
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users 
  WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    AND email = 'demo.admin@clubdee.com';
  
  IF v_user_count = 0 THEN
    RAISE EXCEPTION 'FAIL: Demo admin user does not exist in auth.users';
  END IF;
  
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  
  IF v_role IS NULL OR v_role != 'admin' THEN
    RAISE EXCEPTION 'FAIL: Demo admin user does not have admin role (found: %)', COALESCE(v_role, 'NULL');
  END IF;
  
  RAISE NOTICE 'PASS: Demo admin user exists with role: %', v_role;
END $$;

-- 2.2 Coach User
DO $$
DECLARE
  v_user_count INTEGER;
  v_role TEXT;
BEGIN
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users 
  WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
    AND email = 'demo.coach@clubdee.com';
  
  IF v_user_count = 0 THEN
    RAISE EXCEPTION 'FAIL: Demo coach user does not exist in auth.users';
  END IF;
  
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  
  IF v_role IS NULL OR v_role != 'coach' THEN
    RAISE EXCEPTION 'FAIL: Demo coach user does not have coach role (found: %)', COALESCE(v_role, 'NULL');
  END IF;
  
  RAISE NOTICE 'PASS: Demo coach user exists with role: %', v_role;
END $$;

-- 2.3 Athlete User
DO $$
DECLARE
  v_user_count INTEGER;
  v_role TEXT;
BEGIN
  SELECT COUNT(*) INTO v_user_count
  FROM auth.users 
  WHERE id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
    AND email = 'demo.athlete@clubdee.com';
  
  IF v_user_count = 0 THEN
    RAISE EXCEPTION 'FAIL: Demo athlete user does not exist in auth.users';
  END IF;
  
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  
  IF v_role IS NULL OR v_role != 'athlete' THEN
    RAISE EXCEPTION 'FAIL: Demo athlete user does not have athlete role (found: %)', COALESCE(v_role, 'NULL');
  END IF;
  
  RAISE NOTICE 'PASS: Demo athlete user exists with role: %', v_role;
END $$;

-- 2.4 Parent User
DO $$
DECLARE
  v_parent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_parent_count
  FROM public.parent_users 
  WHERE id = 'd4e5f6a7-b8c9-0123-def0-234567890123'
    AND email = 'demo.parent@clubdee.com';
  
  IF v_parent_count = 0 THEN
    RAISE EXCEPTION 'FAIL: Demo parent user does not exist in parent_users';
  END IF;
  
  RAISE NOTICE 'PASS: Demo parent user exists';
END $$;

-- ============================================================================
-- 3. Verify Coach and Athlete Have Correct club_id
-- ============================================================================
SELECT '=== 3. Club Assignment Verification ===' as section;

-- 3.1 Coach club_id
DO $$
DECLARE
  v_coach_club_id UUID;
BEGIN
  SELECT club_id INTO v_coach_club_id
  FROM public.coaches
  WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  
  IF v_coach_club_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: Demo coach not found in coaches table';
  END IF;
  
  IF v_coach_club_id != 'd1e2f3a4-b5c6-7890-abcd-ef1234567890' THEN
    RAISE EXCEPTION 'FAIL: Demo coach has wrong club_id: %', v_coach_club_id;
  END IF;
  
  RAISE NOTICE 'PASS: Demo coach has correct club_id';
END $$;

-- 3.2 Athlete club_id
DO $$
DECLARE
  v_athlete_club_id UUID;
BEGIN
  SELECT club_id INTO v_athlete_club_id
  FROM public.athletes
  WHERE user_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  
  IF v_athlete_club_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: Demo athlete not found in athletes table';
  END IF;
  
  IF v_athlete_club_id != 'd1e2f3a4-b5c6-7890-abcd-ef1234567890' THEN
    RAISE EXCEPTION 'FAIL: Demo athlete has wrong club_id: %', v_athlete_club_id;
  END IF;
  
  RAISE NOTICE 'PASS: Demo athlete has correct club_id';
END $$;

-- ============================================================================
-- 4. Verify Training Sessions Exist for Demo Club
-- ============================================================================
SELECT '=== 4. Training Sessions Verification ===' as section;

DO $$
DECLARE
  v_session_count INTEGER;
  v_future_count INTEGER;
  v_past_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_session_count
  FROM public.training_sessions
  WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';
  
  IF v_session_count = 0 THEN
    RAISE EXCEPTION 'FAIL: No training sessions found for demo club';
  END IF;
  
  -- Check for future sessions (Requirement 6.1)
  SELECT COUNT(*) INTO v_future_count
  FROM public.training_sessions
  WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890'
    AND session_date >= CURRENT_DATE;
  
  IF v_future_count = 0 THEN
    RAISE EXCEPTION 'FAIL: No future training sessions found (Requirement 6.1)';
  END IF;
  
  -- Check for past sessions
  SELECT COUNT(*) INTO v_past_count
  FROM public.training_sessions
  WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890'
    AND session_date < CURRENT_DATE;
  
  RAISE NOTICE 'PASS: Training sessions exist - Total: %, Future: %, Past: %', 
    v_session_count, v_future_count, v_past_count;
END $$;

-- ============================================================================
-- 5. Verify Announcements Exist from Demo Coach
-- ============================================================================
SELECT '=== 5. Announcements Verification ===' as section;

DO $$
DECLARE
  v_announcement_count INTEGER;
  v_coach_id UUID;
BEGIN
  -- Get demo coach ID
  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: Demo coach not found';
  END IF;
  
  SELECT COUNT(*) INTO v_announcement_count
  FROM public.announcements
  WHERE coach_id = v_coach_id;
  
  IF v_announcement_count = 0 THEN
    RAISE EXCEPTION 'FAIL: No announcements found from demo coach (Requirement 6.2)';
  END IF;
  
  RAISE NOTICE 'PASS: Announcements exist from demo coach - Count: %', v_announcement_count;
END $$;

-- ============================================================================
-- 6. Verify Attendance Records Exist
-- ============================================================================
SELECT '=== 6. Attendance Records Verification ===' as section;

DO $$
DECLARE
  v_attendance_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_attendance_count
  FROM public.attendance
  WHERE athlete_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  
  IF v_attendance_count = 0 THEN
    RAISE EXCEPTION 'FAIL: No attendance records found for demo athlete (Requirement 6.3)';
  END IF;
  
  RAISE NOTICE 'PASS: Attendance records exist for demo athlete - Count: %', v_attendance_count;
END $$;

-- ============================================================================
-- 7. Verify Performance Records Exist
-- ============================================================================
SELECT '=== 7. Performance Records Verification ===' as section;

DO $$
DECLARE
  v_performance_count INTEGER;
  v_athlete_id UUID;
BEGIN
  -- Get demo athlete ID from athletes table
  SELECT id INTO v_athlete_id
  FROM public.athletes
  WHERE user_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  
  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: Demo athlete not found in athletes table';
  END IF;
  
  SELECT COUNT(*) INTO v_performance_count
  FROM public.performance_records
  WHERE athlete_id = v_athlete_id;
  
  IF v_performance_count = 0 THEN
    RAISE EXCEPTION 'FAIL: No performance records found for demo athlete (Requirement 6.4)';
  END IF;
  
  RAISE NOTICE 'PASS: Performance records exist for demo athlete - Count: %', v_performance_count;
END $$;

-- ============================================================================
-- 8. Verify Parent Connection Exists
-- ============================================================================
SELECT '=== 8. Parent Connection Verification ===' as section;

DO $$
DECLARE
  v_connection_count INTEGER;
  v_athlete_id UUID;
BEGIN
  -- Get demo athlete ID from athletes table
  SELECT id INTO v_athlete_id
  FROM public.athletes
  WHERE user_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  
  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'FAIL: Demo athlete not found in athletes table';
  END IF;
  
  SELECT COUNT(*) INTO v_connection_count
  FROM public.parent_connections
  WHERE athlete_id = v_athlete_id
    AND parent_user_id = 'd4e5f6a7-b8c9-0123-def0-234567890123';
  
  IF v_connection_count = 0 THEN
    RAISE EXCEPTION 'FAIL: No parent connection found for demo athlete (Requirement 6.5)';
  END IF;
  
  RAISE NOTICE 'PASS: Parent connection exists for demo athlete';
END $$;

-- ============================================================================
-- 9. Verify Foreign Key Integrity (Requirement 6.6)
-- ============================================================================
SELECT '=== 9. Foreign Key Integrity Verification ===' as section;

-- 9.1 Announcements -> Coaches FK
DO $$
DECLARE
  v_orphan_count INTEGER;
  v_demo_orphan_count INTEGER;
  v_demo_coach_id UUID;
BEGIN
  -- Get demo coach ID
  SELECT id INTO v_demo_coach_id
  FROM public.coaches
  WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  
  -- Check for orphaned announcements globally
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.announcements a
  LEFT JOIN public.coaches c ON a.coach_id = c.id
  WHERE c.id IS NULL;
  
  -- Check for orphaned demo announcements specifically
  SELECT COUNT(*) INTO v_demo_orphan_count
  FROM public.announcements a
  LEFT JOIN public.coaches c ON a.coach_id = c.id
  WHERE c.id IS NULL
    AND a.coach_id = v_demo_coach_id;
  
  IF v_orphan_count > 0 THEN
    RAISE WARNING 'WARNING: Found % announcements with invalid coach_id (legacy data)', v_orphan_count;
  END IF;
  
  IF v_demo_orphan_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Found % demo announcements with invalid coach_id', v_demo_orphan_count;
  END IF;
  
  RAISE NOTICE 'PASS: Demo announcements have valid coach_id references';
END $$;

-- 9.2 Training Sessions -> Clubs FK
DO $$
DECLARE
  v_orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.training_sessions ts
  LEFT JOIN public.clubs c ON ts.club_id = c.id
  WHERE c.id IS NULL;
  
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Found % training sessions with invalid club_id', v_orphan_count;
  END IF;
  
  RAISE NOTICE 'PASS: All training sessions have valid club_id references';
END $$;

-- 9.3 Attendance -> Athletes FK
DO $$
DECLARE
  v_orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.attendance att
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = att.athlete_id
  );
  
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Found % attendance records with invalid athlete_id', v_orphan_count;
  END IF;
  
  RAISE NOTICE 'PASS: All attendance records have valid athlete_id references';
END $$;

-- 9.4 Parent Connections -> Athletes FK
DO $$
DECLARE
  v_orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.parent_connections pc
  LEFT JOIN public.athletes a ON pc.athlete_id = a.id
  WHERE a.id IS NULL;
  
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Found % parent connections with invalid athlete_id', v_orphan_count;
  END IF;
  
  RAISE NOTICE 'PASS: All parent connections have valid athlete_id references';
END $$;

-- 9.5 Parent Connections -> Parent Users FK
DO $$
DECLARE
  v_orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.parent_connections pc
  LEFT JOIN public.parent_users pu ON pc.parent_user_id = pu.id
  WHERE pc.parent_user_id IS NOT NULL AND pu.id IS NULL;
  
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Found % parent connections with invalid parent_user_id', v_orphan_count;
  END IF;
  
  RAISE NOTICE 'PASS: All parent connections have valid parent_user_id references';
END $$;

-- ============================================================================
-- 10. Summary Report
-- ============================================================================
SELECT '=== DEMO DATA VERIFICATION SUMMARY ===' as section;

SELECT 
  'Club' as entity,
  (SELECT COUNT(*) FROM public.clubs WHERE id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.clubs WHERE id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Admin User' as entity,
  (SELECT COUNT(*) FROM auth.users WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') as count,
  CASE WHEN (SELECT COUNT(*) FROM auth.users WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Coach User' as entity,
  (SELECT COUNT(*) FROM auth.users WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901') as count,
  CASE WHEN (SELECT COUNT(*) FROM auth.users WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Athlete User' as entity,
  (SELECT COUNT(*) FROM auth.users WHERE id = 'c3d4e5f6-a7b8-9012-cdef-123456789012') as count,
  CASE WHEN (SELECT COUNT(*) FROM auth.users WHERE id = 'c3d4e5f6-a7b8-9012-cdef-123456789012') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Parent User' as entity,
  (SELECT COUNT(*) FROM public.parent_users WHERE id = 'd4e5f6a7-b8c9-0123-def0-234567890123') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.parent_users WHERE id = 'd4e5f6a7-b8c9-0123-def0-234567890123') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Coach Record' as entity,
  (SELECT COUNT(*) FROM public.coaches WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.coaches WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Athlete Record' as entity,
  (SELECT COUNT(*) FROM public.athletes WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.athletes WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Training Sessions' as entity,
  (SELECT COUNT(*) FROM public.training_sessions WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.training_sessions WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Announcements' as entity,
  (SELECT COUNT(*) FROM public.announcements a 
   JOIN public.coaches c ON a.coach_id = c.id 
   WHERE c.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.announcements a 
             JOIN public.coaches c ON a.coach_id = c.id 
             WHERE c.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Attendance Records' as entity,
  (SELECT COUNT(*) FROM public.attendance WHERE athlete_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.attendance WHERE athlete_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Performance Records' as entity,
  (SELECT COUNT(*) FROM public.performance_records pr 
   JOIN public.athletes a ON pr.athlete_id = a.id 
   WHERE a.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.performance_records pr 
             JOIN public.athletes a ON pr.athlete_id = a.id 
             WHERE a.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
  'Parent Connections' as entity,
  (SELECT COUNT(*) FROM public.parent_connections pc 
   JOIN public.athletes a ON pc.athlete_id = a.id 
   WHERE a.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') as count,
  CASE WHEN (SELECT COUNT(*) FROM public.parent_connections pc 
             JOIN public.athletes a ON pc.athlete_id = a.id 
             WHERE a.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890') > 0 
       THEN 'PASS' ELSE 'FAIL' END as status;

SELECT '=== VERIFICATION COMPLETE ===' as section;
