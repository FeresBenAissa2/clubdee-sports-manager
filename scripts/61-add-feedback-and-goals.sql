-- ============================================================================
-- Migration 61: Add Feedback System and Goal Setting
-- ============================================================================
-- Description: 
--   1. Add coach_feedback to attendance_logs
--   2. Add coach_notes to performance_records (if not exists)
--   3. Create athlete_goals table
--   4. Add RLS policies
-- ============================================================================

-- ============================================================================
-- 1. Add feedback fields to existing tables
-- ============================================================================

-- Add coach_feedback to attendance_logs (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_logs' 
    AND column_name = 'coach_feedback'
  ) THEN
    ALTER TABLE attendance_logs 
    ADD COLUMN coach_feedback TEXT;
    
    COMMENT ON COLUMN attendance_logs.coach_feedback IS 'Feedback from coach about this attendance session';
  END IF;
END $$;

-- Add coach_notes to performance_records (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'performance_records' 
    AND column_name = 'coach_notes'
  ) THEN
    ALTER TABLE performance_records 
    ADD COLUMN coach_notes TEXT;
    
    COMMENT ON COLUMN performance_records.coach_notes IS 'Additional notes from coach about this performance';
  END IF;
END $$;

-- ============================================================================
-- 2. Create athlete_goals table
-- ============================================================================

-- Drop existing table if it exists (to ensure clean state)
DROP TABLE IF EXISTS athlete_goals CASCADE;

CREATE TABLE athlete_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  
  -- Goal details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  -- Target and progress
  target_value DECIMAL(10, 2),
  target_unit TEXT,
  current_value DECIMAL(10, 2) DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  
  -- Status and timeline
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  CONSTRAINT valid_description_length CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT valid_category CHECK (category IN ('performance', 'attendance', 'skill', 'fitness', 'other')),
  CONSTRAINT valid_target_unit_length CHECK (target_unit IS NULL OR char_length(target_unit) <= 50),
  CONSTRAINT valid_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'cancelled', 'overdue')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT valid_date_range CHECK (target_date >= start_date),
  CONSTRAINT valid_target_value CHECK (target_value IS NULL OR target_value > 0),
  CONSTRAINT valid_current_value CHECK (current_value >= 0)
);

-- Add comments
COMMENT ON TABLE athlete_goals IS 'Goals set by coaches for athletes to track progress and development';
COMMENT ON COLUMN athlete_goals.category IS 'Type of goal: performance, attendance, skill, fitness, other';
COMMENT ON COLUMN athlete_goals.status IS 'Current status: active, completed, cancelled, overdue';
COMMENT ON COLUMN athlete_goals.priority IS 'Priority level: low, medium, high';
COMMENT ON COLUMN athlete_goals.progress_percentage IS 'Calculated progress percentage (0-100)';

-- ============================================================================
-- 3. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_athlete_goals_athlete_id ON athlete_goals(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_goals_coach_id ON athlete_goals(coach_id);
CREATE INDEX IF NOT EXISTS idx_athlete_goals_status ON athlete_goals(status);
CREATE INDEX IF NOT EXISTS idx_athlete_goals_target_date ON athlete_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_athlete_goals_athlete_status ON athlete_goals(athlete_id, status);

-- ============================================================================
-- 4. Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_athlete_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_athlete_goals_updated_at ON athlete_goals;
CREATE TRIGGER trigger_athlete_goals_updated_at
  BEFORE UPDATE ON athlete_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_athlete_goals_updated_at();

-- ============================================================================
-- 5. Create function to auto-update goal status
-- ============================================================================

CREATE OR REPLACE FUNCTION update_goal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as completed if progress reaches 100%
  IF NEW.progress_percentage >= 100 AND NEW.status = 'active' THEN
    NEW.status = 'completed';
    NEW.completed_at = NOW();
  END IF;
  
  -- Mark as overdue if past target date and still active
  IF NEW.target_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status = 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_goal_status ON athlete_goals;
CREATE TRIGGER trigger_update_goal_status
  BEFORE INSERT OR UPDATE ON athlete_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_status();

-- ============================================================================
-- 6. RLS Policies for athlete_goals
-- ============================================================================

ALTER TABLE athlete_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS coaches_view_own_club_goals ON athlete_goals;
DROP POLICY IF EXISTS coaches_create_goals ON athlete_goals;
DROP POLICY IF EXISTS coaches_update_own_goals ON athlete_goals;
DROP POLICY IF EXISTS coaches_delete_own_goals ON athlete_goals;
DROP POLICY IF EXISTS athletes_view_own_goals ON athlete_goals;

-- Coaches can view goals for athletes in their club
CREATE POLICY coaches_view_own_club_goals ON athlete_goals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN athletes a ON a.club_id = c.club_id
      WHERE c.user_id = auth.uid()
      AND a.id = athlete_goals.athlete_id
    )
  );

-- Coaches can create goals for athletes in their club
CREATE POLICY coaches_create_goals ON athlete_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN athletes a ON a.club_id = c.club_id
      WHERE c.user_id = auth.uid()
      AND c.id = athlete_goals.coach_id
      AND a.id = athlete_goals.athlete_id
    )
  );

-- Coaches can update their own goals
CREATE POLICY coaches_update_own_goals ON athlete_goals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.user_id = auth.uid()
      AND c.id = athlete_goals.coach_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.user_id = auth.uid()
      AND c.id = athlete_goals.coach_id
    )
  );

-- Coaches can delete their own goals
CREATE POLICY coaches_delete_own_goals ON athlete_goals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.user_id = auth.uid()
      AND c.id = athlete_goals.coach_id
    )
  );

-- Athletes can view their own goals
CREATE POLICY athletes_view_own_goals ON athlete_goals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes a
      WHERE a.user_id = auth.uid()
      AND a.id = athlete_goals.athlete_id
    )
  );

-- ============================================================================
-- 7. Update RLS policies for feedback fields
-- ============================================================================

-- Coaches can update feedback in attendance_logs
-- (Existing policies should already allow this, but let's ensure)

-- Note: attendance_logs and performance_records already have RLS policies
-- that allow coaches to update records for their club's athletes.
-- The new feedback fields will be covered by existing policies.

-- ============================================================================
-- 8. Create helper view for goal statistics
-- ============================================================================

CREATE OR REPLACE VIEW athlete_goal_stats AS
SELECT 
  athlete_id,
  COUNT(*) as total_goals,
  COUNT(*) FILTER (WHERE status = 'active') as active_goals,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_goals,
  COUNT(*) FILTER (WHERE status = 'overdue') as overdue_goals,
  ROUND(AVG(progress_percentage), 2) as avg_progress,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_goals
FROM athlete_goals
GROUP BY athlete_id;

COMMENT ON VIEW athlete_goal_stats IS 'Summary statistics of goals for each athlete';

-- Grant access to the view
GRANT SELECT ON athlete_goal_stats TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'athlete_goals')),
    'athlete_goals table was not created';
  
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_logs' AND column_name = 'coach_feedback')),
    'coach_feedback column was not added to attendance_logs';
  
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performance_records' AND column_name = 'coach_notes')),
    'coach_notes column was not added to performance_records';
    
  RAISE NOTICE 'Migration 61 completed successfully!';
END $$;
