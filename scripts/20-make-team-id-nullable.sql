-- ============================================================================
-- Make team_id nullable in training_sessions table
-- The Training Attendance System uses club_id instead of team_id
-- ============================================================================

-- Make team_id nullable since we're using club_id for the training attendance system
ALTER TABLE training_sessions
ALTER COLUMN team_id DROP NOT NULL;

-- Add comment to explain
COMMENT ON COLUMN training_sessions.team_id IS 'Legacy team reference - nullable for club-based sessions';
