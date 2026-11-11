-- Debug: Check if athlete can see training sessions
-- ============================================================================

-- 1. Check demo athlete's club_id
SELECT 'Demo Athlete' as check_type, id, user_id, club_id 
FROM athletes 
WHERE email = 'demo.athlete@clubdee.com';

-- 2. Check training sessions with their club_id
SELECT 'Training Sessions' as check_type, id, title, club_id, coach_id, session_date
FROM training_sessions
ORDER BY session_date DESC
LIMIT 10;

-- 3. Check if club_ids match
SELECT 
  a.id as athlete_id,
  a.club_id as athlete_club_id,
  ts.id as session_id,
  ts.club_id as session_club_id,
  ts.title,
  CASE WHEN a.club_id = ts.club_id THEN 'MATCH' ELSE 'NO MATCH' END as club_match
FROM athletes a
CROSS JOIN training_sessions ts
WHERE a.email = 'demo.athlete@clubdee.com'
LIMIT 10;

-- 4. Check demo club
SELECT 'Demo Club' as check_type, id, name
FROM clubs
WHERE name LIKE '%Demo%' OR name LIKE '%ClubDee%';

-- 5. Check coaches in demo club
SELECT 'Demo Coach' as check_type, id, user_id, club_id, email
FROM coaches
WHERE email = 'demo.coach@clubdee.com';
