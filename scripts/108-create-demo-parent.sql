-- ============================================================================
-- Migration: 108-create-demo-parent.sql
-- Description: Creates demo parent user and connects to demo athlete
-- ============================================================================

-- First, get the demo athlete's info from athletes table
DO $$
DECLARE
  v_athlete_id UUID;
  v_athlete_email TEXT := 'demo.athlete@test.com';
  v_parent_email TEXT := 'demo.parent@test.com';
BEGIN
  -- Get athlete ID from athletes table (not auth.users)
  SELECT id INTO v_athlete_id FROM athletes WHERE email = v_athlete_email;
  
  IF v_athlete_id IS NULL THEN
    RAISE NOTICE 'Demo athlete not found in athletes table';
    RETURN;
  END IF;
  
  -- Create parent connection for demo athlete
  INSERT INTO parent_connections (
    athlete_id, 
    parent_email, 
    parent_name, 
    relationship, 
    is_verified, 
    is_active,
    notify_attendance,
    notify_performance,
    notify_announcements
  )
  VALUES (
    v_athlete_id,
    v_parent_email,
    'Demo Parent',
    'father',
    true,
    true,
    true,
    true,
    true
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Parent connection created for athlete %', v_athlete_id;
END $$;

-- Verify parent connections
SELECT 
  pc.id,
  pc.athlete_id,
  pc.parent_email,
  pc.parent_name,
  pc.is_verified,
  p.full_name as athlete_name
FROM parent_connections pc
JOIN profiles p ON p.id = pc.athlete_id
WHERE pc.parent_email = 'demo.parent@test.com';
