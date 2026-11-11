-- Check training sessions
SELECT id, title, club_id, coach_id, session_date
FROM training_sessions
ORDER BY created_at DESC
LIMIT 10;
