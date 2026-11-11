-- ============================================================================
-- Migration 136: Create Training Assignments System
-- ============================================================================
-- Description: 
--   ระบบมอบหมายการฝึกซ้อมรายบุคคลจากโค้ชให้นักกีฬา
--   - โค้ชสามารถสร้างแผนการฝึกเฉพาะบุคคล
--   - นักกีฬาสามารถดูและอัพเดทความคืบหน้า
-- ============================================================================

-- ============================================================================
-- 1. Create training_assignments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  
  -- Assignment details
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  
  -- Target metrics
  target_value DECIMAL(10, 2),
  target_unit TEXT,
  current_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Schedule
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  frequency TEXT DEFAULT 'once', -- once, daily, weekly
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  progress_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  
  -- Athlete response
  athlete_notes TEXT,
  athlete_submitted_at TIMESTAMPTZ,
  
  -- Coach feedback
  coach_feedback TEXT,
  coach_reviewed_at TIMESTAMPTZ,
  
  -- Priority
  priority TEXT DEFAULT 'medium',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  CONSTRAINT valid_category CHECK (category IN ('general', 'strength', 'cardio', 'skill', 'flexibility', 'recovery', 'technique')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'submitted', 'completed', 'cancelled', 'overdue')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_frequency CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly')),
  CONSTRAINT valid_date_range CHECK (due_date >= start_date),
  CONSTRAINT valid_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Add comments
COMMENT ON TABLE training_assignments IS 'Individual training assignments from coaches to athletes';
COMMENT ON COLUMN training_assignments.category IS 'Type: general, strength, cardio, skill, flexibility, recovery, technique';
COMMENT ON COLUMN training_assignments.status IS 'Status: pending, in_progress, submitted, completed, cancelled, overdue';
COMMENT ON COLUMN training_assignments.frequency IS 'How often: once, daily, weekly, monthly';

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_training_assignments_athlete_id ON training_assignments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_coach_id ON training_assignments(coach_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_club_id ON training_assignments(club_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_due_date ON training_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_training_assignments_athlete_status ON training_assignments(athlete_id, status);

-- ============================================================================
-- 3. Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_training_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_training_assignments_updated_at ON training_assignments;
CREATE TRIGGER trigger_training_assignments_updated_at
  BEFORE UPDATE ON training_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_training_assignments_updated_at();

-- ============================================================================
-- 4. Create function to auto-update assignment status
-- ============================================================================

CREATE OR REPLACE FUNCTION update_assignment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as completed if progress reaches 100%
  IF NEW.progress_percentage >= 100 AND NEW.status IN ('pending', 'in_progress', 'submitted') THEN
    NEW.status = 'completed';
    NEW.completed_at = NOW();
  END IF;
  
  -- Mark as overdue if past due date and still pending/in_progress
  IF NEW.due_date < CURRENT_DATE AND NEW.status IN ('pending', 'in_progress') THEN
    NEW.status = 'overdue';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_assignment_status ON training_assignments;
CREATE TRIGGER trigger_update_assignment_status
  BEFORE INSERT OR UPDATE ON training_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_status();

-- ============================================================================
-- 5. RLS Policies for training_assignments
-- ============================================================================

ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS coaches_view_club_assignments ON training_assignments;
DROP POLICY IF EXISTS coaches_create_assignments ON training_assignments;
DROP POLICY IF EXISTS coaches_update_own_assignments ON training_assignments;
DROP POLICY IF EXISTS coaches_delete_own_assignments ON training_assignments;
DROP POLICY IF EXISTS athletes_view_own_assignments ON training_assignments;
DROP POLICY IF EXISTS athletes_update_own_assignments ON training_assignments;

-- Coaches can view assignments in their club
CREATE POLICY coaches_view_club_assignments ON training_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.user_id = auth.uid()
      AND c.club_id = training_assignments.club_id
    )
  );

-- Coaches can create assignments for athletes in their club
CREATE POLICY coaches_create_assignments ON training_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.user_id = auth.uid()
      AND c.id = training_assignments.coach_id
      AND c.club_id = training_assignments.club_id
    )
  );

-- Coaches can update their own assignments
CREATE POLICY coaches_update_own_assignments ON training_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.user_id = auth.uid()
      AND c.id = training_assignments.coach_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.user_id = auth.uid()
      AND c.id = training_assignments.coach_id
    )
  );

-- Coaches can delete their own assignments
CREATE POLICY coaches_delete_own_assignments ON training_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      WHERE c.user_id = auth.uid()
      AND c.id = training_assignments.coach_id
    )
  );

-- Athletes can view their own assignments
CREATE POLICY athletes_view_own_assignments ON training_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes a
      WHERE a.user_id = auth.uid()
      AND a.id = training_assignments.athlete_id
    )
  );

-- Athletes can update their own assignments (progress, notes, submission)
CREATE POLICY athletes_update_own_assignments ON training_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes a
      WHERE a.user_id = auth.uid()
      AND a.id = training_assignments.athlete_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athletes a
      WHERE a.user_id = auth.uid()
      AND a.id = training_assignments.athlete_id
    )
  );

-- ============================================================================
-- 6. Create helper view for assignment statistics
-- ============================================================================

CREATE OR REPLACE VIEW athlete_assignment_stats AS
SELECT 
  athlete_id,
  COUNT(*) as total_assignments,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_assignments,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_assignments,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_assignments,
  COUNT(*) FILTER (WHERE status = 'overdue') as overdue_assignments,
  ROUND(AVG(progress_percentage), 2) as avg_progress,
  COUNT(*) FILTER (WHERE priority IN ('high', 'urgent')) as high_priority_assignments
FROM training_assignments
GROUP BY athlete_id;

COMMENT ON VIEW athlete_assignment_stats IS 'Summary statistics of training assignments for each athlete';

-- Grant access to the view
GRANT SELECT ON athlete_assignment_stats TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 136: Training Assignments System created successfully!';
END $$;
