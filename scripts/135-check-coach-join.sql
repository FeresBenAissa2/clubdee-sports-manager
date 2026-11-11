-- Check if coach join works correctly
-- training_sessions.coach_id references auth.users(id)
-- but we're joining with coaches table

-- 1. Check sessions with coach info
SELECT 
  ts.id, 
  ts.title, 
  ts.coach_id as session_coach_id,
  c.id as coaches_table_id,
  c.user_id as coach_user_id,
  c.first_name,
  c.last_name
FROM training_sessions ts
LEFT JOIN coaches c ON c.user_id = ts.coach_id
WHERE ts.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

-- 2. Check if the join in the app would work
-- The app uses: coaches (first_name, last_name)
-- This implies a foreign key relationship
-- But coach_id references auth.users, not coaches

-- Check foreign key on training_sessions.coach_id
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'training_sessions'::regclass
AND conname LIKE '%coach%';
