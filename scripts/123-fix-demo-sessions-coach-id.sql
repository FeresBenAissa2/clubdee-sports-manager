-- ============================================================================
-- Fix Demo Training Sessions - Update coach_id to use coaches.id
-- ============================================================================
-- Problem: Sessions were created with coach_id = user_id instead of coaches.id
-- ============================================================================

-- First, let's see what we have
SELECT 'Before Fix' as status, ts.id, ts.title, ts.coach_id, c.id as correct_coach_id
FROM training_sessions ts
LEFT JOIN coaches c ON c.user_id = ts.coach_id
WHERE ts.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

-- Update existing demo sessions to use correct coach_id
UPDATE training_sessions
SET coach_id = (
  SELECT id FROM coaches WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
)
WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890'
  AND coach_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- Verify the fix
SELECT 'After Fix' as status, ts.id, ts.title, ts.coach_id, c.id as coaches_table_id, c.user_id
FROM training_sessions ts
LEFT JOIN coaches c ON c.id = ts.coach_id
WHERE ts.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';
