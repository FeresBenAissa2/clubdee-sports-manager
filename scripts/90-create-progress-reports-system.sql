-- ============================================================================
-- Migration 90: Create Progress Reports System
-- ============================================================================
-- Description: 
--   1. Create progress_reports table for storing generated reports
--   2. Create progress_snapshots table for tracking metrics over time
--   3. Add RLS policies
--   4. Create helper functions and views
-- ============================================================================

-- ============================================================================
-- 1. Create progress_snapshots table (for tracking metrics over time)
-- ============================================================================

CREATE TABLE IF NOT EXISTS progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  
  -- Snapshot period
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Attendance metrics
  total_sessions INTEGER DEFAULT 0,
  attended_sessions INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5, 2) DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  excused_count INTEGER DEFAULT 0,
  
  -- Performance metrics (aggregated from performance_records)
  performance_tests_count INTEGER DEFAULT 0,
  avg_performance_score DECIMAL(10, 2),
  best_performance_score DECIMAL(10, 2),
  performance_improvement DECIMAL(10, 2),
  
  -- Goal metrics
  active_goals_count INTEGER DEFAULT 0,
  completed_goals_count INTEGER DEFAULT 0,
  avg_goal_progress DECIMAL(5, 2) DEFAULT 0,
  
  -- Additional metrics
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_period_type CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  CONSTRAINT valid_period_range CHECK (period_end >= period_start),
  CONSTRAINT valid_attendance_rate CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
  CONSTRAINT valid_sessions CHECK (attended_sessions <= total_sessions),
  CONSTRAINT unique_athlete_period UNIQUE (athlete_id, period_type, period_start, period_end)
);

-- Add comments
COMMENT ON TABLE progress_snapshots IS 'Periodic snapshots of athlete progress metrics';
COMMENT ON COLUMN progress_snapshots.period_type IS 'Type of period: weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN progress_snapshots.attendance_rate IS 'Percentage of sessions attended (0-100)';

-- Create indexes
CREATE INDEX idx_progress_snapshots_athlete_id ON progress_snapshots(athlete_id);
CREATE INDEX idx_progress_snapshots_period ON progress_snapshots(period_type, period_start, period_end);
CREATE INDEX idx_progress_snapshots_date ON progress_snapshots(snapshot_date);

-- ============================================================================
-- 2. Create progress_reports table (for generated reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  generated_by UUID REFERENCES coaches(id) ON DELETE SET NULL,
  
  -- Report details
  report_type TEXT NOT NULL DEFAULT 'monthly',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  
  -- Report content
  summary TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  areas_for_improvement JSONB DEFAULT '[]'::jsonb,
  coach_comments TEXT,
  
  -- Metrics included in report
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Charts and visualizations data
  charts_data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_report_type CHECK (report_type IN ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  CONSTRAINT valid_period_range CHECK (period_end >= period_start),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT valid_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 200)
);

-- Add comments
COMMENT ON TABLE progress_reports IS 'Generated progress reports for athletes';
COMMENT ON COLUMN progress_reports.report_type IS 'Type of report: weekly, monthly, quarterly, yearly, custom';
COMMENT ON COLUMN progress_reports.status IS 'Report status: draft, published, archived';
COMMENT ON COLUMN progress_reports.metrics IS 'JSON object containing all metrics for the period';
COMMENT ON COLUMN progress_reports.charts_data IS 'JSON object containing data for charts and graphs';

-- Create indexes
CREATE INDEX idx_progress_reports_athlete_id ON progress_reports(athlete_id);
CREATE INDEX idx_progress_reports_generated_by ON progress_reports(generated_by);
CREATE INDEX idx_progress_reports_period ON progress_reports(period_start, period_end);
CREATE INDEX idx_progress_reports_status ON progress_reports(status);
CREATE INDEX idx_progress_reports_published_at ON progress_reports(published_at);

-- ============================================================================
-- 3. Create triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_progress_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_progress_snapshots_updated_at ON progress_snapshots;
CREATE TRIGGER trigger_progress_snapshots_updated_at
  BEFORE UPDATE ON progress_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_progress_reports_updated_at ON progress_reports;
CREATE TRIGGER trigger_progress_reports_updated_at
  BEFORE UPDATE ON progress_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_tables_updated_at();

-- ============================================================================
-- 4. RLS Policies for progress_snapshots
-- ============================================================================

ALTER TABLE progress_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS coaches_view_club_snapshots ON progress_snapshots;
DROP POLICY IF EXISTS coaches_manage_snapshots ON progress_snapshots;
DROP POLICY IF EXISTS athletes_view_own_snapshots ON progress_snapshots;

-- Coaches can view snapshots for athletes in their club
CREATE POLICY coaches_view_club_snapshots ON progress_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN athletes a ON a.club_id = c.club_id
      WHERE c.user_id = auth.uid()
      AND a.id = progress_snapshots.athlete_id
    )
  );

-- Coaches can manage snapshots for athletes in their club
CREATE POLICY coaches_manage_snapshots ON progress_snapshots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN athletes a ON a.club_id = c.club_id
      WHERE c.user_id = auth.uid()
      AND a.id = progress_snapshots.athlete_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN athletes a ON a.club_id = c.club_id
      WHERE c.user_id = auth.uid()
      AND a.id = progress_snapshots.athlete_id
    )
  );

-- Athletes can view their own snapshots
CREATE POLICY athletes_view_own_snapshots ON progress_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes a
      WHERE a.user_id = auth.uid()
      AND a.id = progress_snapshots.athlete_id
    )
  );

-- ============================================================================
-- 5. RLS Policies for progress_reports
-- ============================================================================

ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS coaches_view_club_reports ON progress_reports;
DROP POLICY IF EXISTS coaches_manage_reports ON progress_reports;
DROP POLICY IF EXISTS athletes_view_own_published_reports ON progress_reports;

-- Coaches can view reports for athletes in their club
CREATE POLICY coaches_view_club_reports ON progress_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN athletes a ON a.club_id = c.club_id
      WHERE c.user_id = auth.uid()
      AND a.id = progress_reports.athlete_id
    )
  );

-- Coaches can manage reports for athletes in their club
CREATE POLICY coaches_manage_reports ON progress_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN athletes a ON a.club_id = c.club_id
      WHERE c.user_id = auth.uid()
      AND a.id = progress_reports.athlete_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaches c
      JOIN athletes a ON a.club_id = c.club_id
      WHERE c.user_id = auth.uid()
      AND a.id = progress_reports.athlete_id
    )
  );

-- Athletes can view their own published reports
CREATE POLICY athletes_view_own_published_reports ON progress_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes a
      WHERE a.user_id = auth.uid()
      AND a.id = progress_reports.athlete_id
    )
    AND status = 'published'
  );

-- ============================================================================
-- 6. Create helper function to calculate progress snapshot
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_progress_snapshot(
  p_athlete_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_period_type TEXT DEFAULT 'monthly'
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_total_sessions INTEGER;
  v_attended_sessions INTEGER;
  v_late_count INTEGER;
  v_excused_count INTEGER;
  v_attendance_rate DECIMAL(5, 2);
  v_performance_count INTEGER;
  v_avg_performance DECIMAL(10, 2);
  v_best_performance DECIMAL(10, 2);
  v_active_goals INTEGER;
  v_completed_goals INTEGER;
  v_avg_goal_progress DECIMAL(5, 2);
BEGIN
  -- Calculate attendance metrics
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'present') as attended,
    COUNT(*) FILTER (WHERE status = 'late') as late,
    COUNT(*) FILTER (WHERE status = 'excused') as excused
  INTO v_total_sessions, v_attended_sessions, v_late_count, v_excused_count
  FROM attendance_logs al
  JOIN training_sessions ts ON ts.id = al.training_session_id
  WHERE al.athlete_id = p_athlete_id
  AND ts.session_date BETWEEN p_period_start AND p_period_end;
  
  -- Calculate attendance rate
  IF v_total_sessions > 0 THEN
    v_attendance_rate := (v_attended_sessions::DECIMAL / v_total_sessions::DECIMAL) * 100;
  ELSE
    v_attendance_rate := 0;
  END IF;
  
  -- Calculate performance metrics
  SELECT 
    COUNT(*) as count,
    AVG(score) as avg_score,
    MAX(score) as best_score
  INTO v_performance_count, v_avg_performance, v_best_performance
  FROM performance_records
  WHERE athlete_id = p_athlete_id
  AND test_date BETWEEN p_period_start AND p_period_end;
  
  -- Calculate goal metrics
  SELECT 
    COUNT(*) FILTER (WHERE status = 'active') as active,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    AVG(progress_percentage) as avg_progress
  INTO v_active_goals, v_completed_goals, v_avg_goal_progress
  FROM athlete_goals
  WHERE athlete_id = p_athlete_id
  AND start_date <= p_period_end
  AND (completed_at IS NULL OR completed_at >= p_period_start);
  
  -- Insert or update snapshot
  INSERT INTO progress_snapshots (
    athlete_id,
    snapshot_date,
    period_type,
    period_start,
    period_end,
    total_sessions,
    attended_sessions,
    attendance_rate,
    late_count,
    excused_count,
    performance_tests_count,
    avg_performance_score,
    best_performance_score,
    active_goals_count,
    completed_goals_count,
    avg_goal_progress
  ) VALUES (
    p_athlete_id,
    CURRENT_DATE,
    p_period_type,
    p_period_start,
    p_period_end,
    COALESCE(v_total_sessions, 0),
    COALESCE(v_attended_sessions, 0),
    COALESCE(v_attendance_rate, 0),
    COALESCE(v_late_count, 0),
    COALESCE(v_excused_count, 0),
    COALESCE(v_performance_count, 0),
    v_avg_performance,
    v_best_performance,
    COALESCE(v_active_goals, 0),
    COALESCE(v_completed_goals, 0),
    COALESCE(v_avg_goal_progress, 0)
  )
  ON CONFLICT (athlete_id, period_type, period_start, period_end)
  DO UPDATE SET
    snapshot_date = CURRENT_DATE,
    total_sessions = COALESCE(v_total_sessions, 0),
    attended_sessions = COALESCE(v_attended_sessions, 0),
    attendance_rate = COALESCE(v_attendance_rate, 0),
    late_count = COALESCE(v_late_count, 0),
    excused_count = COALESCE(v_excused_count, 0),
    performance_tests_count = COALESCE(v_performance_count, 0),
    avg_performance_score = v_avg_performance,
    best_performance_score = v_best_performance,
    active_goals_count = COALESCE(v_active_goals, 0),
    completed_goals_count = COALESCE(v_completed_goals, 0),
    avg_goal_progress = COALESCE(v_avg_goal_progress, 0),
    updated_at = NOW()
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_progress_snapshot IS 'Calculate and store progress snapshot for an athlete for a given period';

-- ============================================================================
-- 7. Create view for athlete progress summary
-- ============================================================================

CREATE OR REPLACE VIEW athlete_progress_summary AS
SELECT 
  a.id as athlete_id,
  a.first_name,
  a.last_name,
  a.club_id,
  
  -- Latest snapshot data
  ps.snapshot_date as last_snapshot_date,
  ps.attendance_rate as current_attendance_rate,
  ps.avg_performance_score as current_avg_performance,
  ps.active_goals_count,
  ps.completed_goals_count,
  
  -- Historical comparison (last 3 months)
  (
    SELECT AVG(attendance_rate)
    FROM progress_snapshots ps2
    WHERE ps2.athlete_id = a.id
    AND ps2.period_type = 'monthly'
    AND ps2.period_start >= CURRENT_DATE - INTERVAL '3 months'
  ) as avg_attendance_3months,
  
  -- Latest report
  (
    SELECT pr.id
    FROM progress_reports pr
    WHERE pr.athlete_id = a.id
    AND pr.status = 'published'
    ORDER BY pr.published_at DESC
    LIMIT 1
  ) as latest_report_id,
  
  (
    SELECT pr.published_at
    FROM progress_reports pr
    WHERE pr.athlete_id = a.id
    AND pr.status = 'published'
    ORDER BY pr.published_at DESC
    LIMIT 1
  ) as latest_report_date
  
FROM athletes a
LEFT JOIN LATERAL (
  SELECT *
  FROM progress_snapshots ps
  WHERE ps.athlete_id = a.id
  ORDER BY ps.snapshot_date DESC
  LIMIT 1
) ps ON true;

COMMENT ON VIEW athlete_progress_summary IS 'Summary view of athlete progress with latest metrics';

-- Grant access
GRANT SELECT ON athlete_progress_summary TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progress_snapshots')),
    'progress_snapshots table was not created';
  
  ASSERT (SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progress_reports')),
    'progress_reports table was not created';
    
  RAISE NOTICE 'Migration 90 completed successfully!';
END $$;


-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- Uncomment and run this section to rollback the migration
-- WARNING: This will delete all progress report and snapshot data

/*

-- Revoke access
REVOKE SELECT ON athlete_progress_summary FROM authenticated;

-- Drop view
DROP VIEW IF EXISTS athlete_progress_summary;

-- Drop helper function
DROP FUNCTION IF EXISTS calculate_progress_snapshot(UUID, DATE, DATE, TEXT);

-- Drop RLS policies for progress_reports
DROP POLICY IF EXISTS "athletes_view_own_published_reports" ON progress_reports;
DROP POLICY IF EXISTS "coaches_manage_reports" ON progress_reports;
DROP POLICY IF EXISTS "coaches_view_club_reports" ON progress_reports;

-- Drop RLS policies for progress_snapshots
DROP POLICY IF EXISTS "athletes_view_own_snapshots" ON progress_snapshots;
DROP POLICY IF EXISTS "coaches_manage_snapshots" ON progress_snapshots;
DROP POLICY IF EXISTS "coaches_view_club_snapshots" ON progress_snapshots;

-- Disable RLS
ALTER TABLE progress_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE progress_snapshots DISABLE ROW LEVEL SECURITY;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_progress_reports_updated_at ON progress_reports;
DROP TRIGGER IF EXISTS trigger_progress_snapshots_updated_at ON progress_snapshots;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_progress_tables_updated_at();

-- Drop indexes for progress_reports
DROP INDEX IF EXISTS idx_progress_reports_published_at;
DROP INDEX IF EXISTS idx_progress_reports_status;
DROP INDEX IF EXISTS idx_progress_reports_period;
DROP INDEX IF EXISTS idx_progress_reports_generated_by;
DROP INDEX IF EXISTS idx_progress_reports_athlete_id;

-- Drop indexes for progress_snapshots
DROP INDEX IF EXISTS idx_progress_snapshots_date;
DROP INDEX IF EXISTS idx_progress_snapshots_period;
DROP INDEX IF EXISTS idx_progress_snapshots_athlete_id;

-- Drop tables
DROP TABLE IF EXISTS progress_reports CASCADE;
DROP TABLE IF EXISTS progress_snapshots CASCADE;

*/
