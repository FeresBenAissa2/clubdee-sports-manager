-- Test: Check if athlete can see sessions via RLS
-- Demo athlete user_id = c3d4e5f6-a7b8-9012-cdef-123456789012
-- Demo athlete club_id = d1e2f3a4-b5c6-7890-abcd-ef1234567890

-- 1. Check athlete info
SELECT 'Athlete Info' as check_type, id, user_id, club_id
FROM athletes
WHERE user_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

-- 2. Check sessions in athlete's club
SELECT 'Sessions in Club' as check_type, id, title, club_id, session_date
FROM training_sessions
WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890'
ORDER BY session_date;

-- 3. Check RLS policy for athletes
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'training_sessions' AND policyname LIKE '%Athlete%';
