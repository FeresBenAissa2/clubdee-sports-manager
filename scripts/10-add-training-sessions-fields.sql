-- ============================================================================
-- Add fields to training_sessions table for Training Attendance System
-- ============================================================================

-- Add coach_id field (references auth.users who are coaches)
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add max_participants field (nullable - unlimited if not set)
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS max_participants INTEGER;

-- Add status field with default 'scheduled'
ALTER TABLE training_sessions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'scheduled';

-- Add constraint to ensure status has valid values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'training_sessions_status_check'
  ) THEN
    ALTER TABLE training_sessions
    ADD CONSTRAINT training_sessions_status_check 
    CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled'));
  END IF;
END $$;

-- Add index for coach_id for faster queries
CREATE INDEX IF NOT EXISTS idx_training_sessions_coach_id ON training_sessions(coach_id);

-- Add index for status for filtering
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);

-- Add comment to document the fields
COMMENT ON COLUMN training_sessions.coach_id IS 'Coach responsible for this training session';
COMMENT ON COLUMN training_sessions.max_participants IS 'Maximum number of participants allowed (NULL = unlimited)';
COMMENT ON COLUMN training_sessions.status IS 'Session status: scheduled, ongoing, completed, cancelled';


-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- Uncomment and run this section to rollback the migration

/*

-- Remove indexes
DROP INDEX IF EXISTS idx_training_sessions_status;
DROP INDEX IF EXISTS idx_training_sessions_coach_id;

-- Remove constraint
ALTER TABLE training_sessions DROP CONSTRAINT IF EXISTS training_sessions_status_check;

-- Remove columns
ALTER TABLE training_sessions DROP COLUMN IF EXISTS status;
ALTER TABLE training_sessions DROP COLUMN IF EXISTS max_participants;
ALTER TABLE training_sessions DROP COLUMN IF EXISTS coach_id;

*/
