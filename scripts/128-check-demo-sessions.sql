-- Check all sessions in demo club
SELECT id, title, coach_id, club_id, session_date
FROM training_sessions
WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890'
ORDER BY session_date;
