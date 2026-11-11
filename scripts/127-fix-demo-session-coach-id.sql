-- Fix demo session coach_id to use user_id (since FK references auth.users)
-- Demo coach user_id = b2c3d4e5-f6a7-8901-bcde-f12345678901

-- Check current state
SELECT 'Before' as status, id, title, coach_id, club_id
FROM training_sessions
WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

-- The coach_id should already be the user_id, let's verify
SELECT 'Coach Info' as info, id as coaches_id, user_id, club_id
FROM coaches
WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
