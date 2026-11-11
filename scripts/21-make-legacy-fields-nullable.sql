-- ============================================================================
-- Make legacy fields nullable in training_sessions table
-- The Training Attendance System uses different fields
-- ============================================================================

-- Make scheduled_at nullable since we're using session_date + start_time/end_time
ALTER TABLE training_sessions
ALTER COLUMN scheduled_at DROP NOT NULL;

-- Make duration_minutes nullable since we're using start_time/end_time
ALTER TABLE training_sessions
ALTER COLUMN duration_minutes DROP NOT NULL;

-- Make created_by nullable
ALTER TABLE training_sessions
ALTER COLUMN created_by DROP NOT NULL;

-- Add comments to explain
COMMENT ON COLUMN training_sessions.scheduled_at IS 'Legacy scheduled timestamp - nullable for date/time based sessions';
COMMENT ON COLUMN training_sessions.duration_minutes IS 'Legacy duration - nullable when using start_time/end_time';
COMMENT ON COLUMN training_sessions.created_by IS 'User who created the session - nullable for system-created sessions';
