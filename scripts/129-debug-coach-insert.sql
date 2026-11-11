-- Debug: Check if demo coach can insert training sessions
-- Demo coach user_id = b2c3d4e5-f6a7-8901-bcde-f12345678901

-- 1. Check demo coach exists in coaches table
SELECT 'Demo Coach' as check_type, id, user_id, club_id
FROM coaches
WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- 2. Check demo coach has coach role
SELECT 'User Role' as check_type, user_id, role
FROM user_roles
WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- 3. Check RLS policies on training_sessions
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'training_sessions';

-- 4. Try to understand what the policy checks
-- For INSERT, the WITH CHECK clause is evaluated
-- "Coaches manage own sessions" should allow if:
-- - coach_id = auth.uid() OR
-- - created_by = auth.uid() OR  
-- - club_id IN (SELECT club_id FROM coaches WHERE user_id = auth.uid())
