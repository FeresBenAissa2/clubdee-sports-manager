-- Test: Try to insert a training session as demo coach
-- This will help identify the exact error

-- First, let's see what data we need
SELECT 'Demo Coach Info' as info, 
  c.id as coach_table_id, 
  c.user_id, 
  c.club_id,
  c.email
FROM coaches c
WHERE c.email = 'demo.coach@clubdee.com';

-- Try direct insert (bypassing RLS since this runs as service role)
INSERT INTO training_sessions (
  club_id,
  coach_id,
  created_by,
  title,
  description,
  session_date,
  start_time,
  end_time,
  location,
  status
) VALUES (
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890', -- demo club_id
  'b2c3d4e5-f6a7-8901-bcde-f12345678901', -- demo coach user_id
  'b2c3d4e5-f6a7-8901-bcde-f12345678901', -- created_by = coach user_id
  'Test Session from SQL',
  'Testing if insert works',
  CURRENT_DATE + INTERVAL '7 days',
  '09:00:00',
  '11:00:00',
  'Test Location',
  'scheduled'
)
RETURNING id, title, club_id, coach_id, created_by;
