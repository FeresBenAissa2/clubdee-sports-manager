-- ============================================================================
-- Migration: 109-ensure-demo-users-same-club.sql
-- Description: Ensures demo athlete is in the same club as demo coach for testing
-- ============================================================================

-- First, get the coach's club_id
DO $$
DECLARE
  v_coach_club_id UUID;
  v_coach_user_id UUID;
  v_athlete_user_id UUID;
BEGIN
  -- Get coach info
  SELECT c.club_id, c.user_id INTO v_coach_club_id, v_coach_user_id
  FROM coaches c
  JOIN auth.users u ON u.id = c.user_id
  WHERE u.email = 'demo.coach@test.com';

  -- Get athlete user_id
  SELECT id INTO v_athlete_user_id
  FROM auth.users
  WHERE email = 'demo.athlete@test.com';

  IF v_coach_club_id IS NULL THEN
    RAISE NOTICE 'Demo coach not found or has no club';
    RETURN;
  END IF;

  IF v_athlete_user_id IS NULL THEN
    RAISE NOTICE 'Demo athlete not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Coach club_id: %, Coach user_id: %, Athlete user_id: %', 
    v_coach_club_id, v_coach_user_id, v_athlete_user_id;

  -- Update athlete's club_id in athletes table
  UPDATE athletes
  SET club_id = v_coach_club_id
  WHERE user_id = v_athlete_user_id;

  -- Update athlete's club_id in profiles table
  UPDATE profiles
  SET club_id = v_coach_club_id
  WHERE id = v_athlete_user_id;

  RAISE NOTICE 'Updated demo athlete to be in same club as demo coach';
END $$;

-- Verify the update
SELECT 
  'Demo Users Club Assignment' as check_type,
  u.email,
  CASE 
    WHEN c.id IS NOT NULL THEN 'coach'
    WHEN a.id IS NOT NULL THEN 'athlete'
    ELSE 'unknown'
  END as role,
  COALESCE(c.club_id, a.club_id) as club_id,
  cl.name as club_name
FROM auth.users u
LEFT JOIN coaches c ON c.user_id = u.id
LEFT JOIN athletes a ON a.user_id = u.id
LEFT JOIN clubs cl ON cl.id = COALESCE(c.club_id, a.club_id)
WHERE u.email IN ('demo.coach@test.com', 'demo.athlete@test.com')
ORDER BY u.email;
