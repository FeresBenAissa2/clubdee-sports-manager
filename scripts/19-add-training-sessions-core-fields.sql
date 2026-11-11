-- ============================================================================
-- Add core fields to training_sessions table for Training Attendance System
-- This adds the fields that should have been added but were missing
-- ============================================================================

-- Add club_id field (references clubs table)
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;

-- Add session_date field
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS session_date DATE;

-- Add start_time field
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS start_time TIME;

-- Add end_time field
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Add qr_code field for future QR code check-in feature
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_training_sessions_club_id ON training_sessions(club_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_session_date ON training_sessions(session_date);

-- Add comments to document the fields
COMMENT ON COLUMN training_sessions.club_id IS 'Club that this training session belongs to';
COMMENT ON COLUMN training_sessions.session_date IS 'Date of the training session';
COMMENT ON COLUMN training_sessions.start_time IS 'Start time of the training session';
COMMENT ON COLUMN training_sessions.end_time IS 'End time of the training session';
COMMENT ON COLUMN training_sessions.qr_code IS 'QR code for check-in (future feature)';
