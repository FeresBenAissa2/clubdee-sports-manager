-- ============================================================================
-- Create indexes for Training Attendance System
-- ============================================================================
-- This script creates all necessary indexes for optimal query performance
-- in the training attendance system
-- ============================================================================
-- Note: training_sessions table uses 'scheduled_at' for datetime
--       and doesn't have a separate 'club_id' (uses team_id -> teams -> club_id)
-- ============================================================================

-- ============================================================================
-- TRAINING SESSIONS INDEXES
-- ============================================================================

-- Index for coach_id (already created in script 10, but ensure it exists)
-- Used for: Coach viewing their own sessions
CREATE INDEX IF NOT EXISTS idx_training_sessions_coach_id ON training_sessions(coach_id);

-- Index for status (already created in script 10, but ensure it exists)
-- Used for: Filtering sessions by status (scheduled, ongoing, completed, cancelled)
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);

-- Composite index for team_id and scheduled_at
-- Used for: Viewing sessions for a specific team, filtering by date
CREATE INDEX IF NOT EXISTS idx_training_sessions_team_scheduled 
  ON training_sessions(team_id, scheduled_at);

-- Composite index for coach_id and status
-- Used for: Coach viewing their sessions filtered by status
CREATE INDEX IF NOT EXISTS idx_training_sessions_coach_status 
  ON training_sessions(coach_id, status);

-- Composite index for scheduled_at and status
-- Used for: Finding upcoming/past sessions efficiently
CREATE INDEX IF NOT EXISTS idx_training_sessions_scheduled_status 
  ON training_sessions(scheduled_at, status);

-- Composite index for coach_id and scheduled_at
-- Used for: Coach viewing their sessions in chronological order
CREATE INDEX IF NOT EXISTS idx_training_sessions_coach_scheduled 
  ON training_sessions(coach_id, scheduled_at);

-- ============================================================================
-- ATTENDANCE (ATTENDANCE_LOGS) INDEXES
-- ============================================================================

-- Index for check_in_time (already created in script 11, but ensure it exists)
-- Used for: Querying attendance by check-in time
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance(check_in_time);

-- Index for marked_by (already created in script 11, but ensure it exists)
-- Used for: Tracking who marked attendance
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);

-- Composite index for athlete_id and check_in_time
-- Used for: Athlete viewing their own attendance history in chronological order
CREATE INDEX IF NOT EXISTS idx_attendance_athlete_checkin 
  ON attendance(athlete_id, check_in_time);

-- Composite index for session_id and status
-- Used for: Coach viewing attendance status for a session
CREATE INDEX IF NOT EXISTS idx_attendance_session_status 
  ON attendance(session_id, status);

-- Composite index for athlete_id and status
-- Used for: Calculating athlete attendance statistics
CREATE INDEX IF NOT EXISTS idx_attendance_athlete_status 
  ON attendance(athlete_id, status);

-- Composite index for athlete_id and created_at
-- Used for: Athlete viewing attendance history sorted by date
CREATE INDEX IF NOT EXISTS idx_attendance_athlete_created 
  ON attendance(athlete_id, created_at);

-- ============================================================================
-- LEAVE REQUESTS INDEXES
-- ============================================================================

-- Index for session_id (already created in script 12, but ensure it exists)
-- Used for: Finding leave requests for a specific session
CREATE INDEX IF NOT EXISTS idx_leave_requests_session_id ON leave_requests(session_id);

-- Index for athlete_id (already created in script 12, but ensure it exists)
-- Used for: Athlete viewing their own leave requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_athlete_id ON leave_requests(athlete_id);

-- Index for status (already created in script 12, but ensure it exists)
-- Used for: Filtering leave requests by status (pending, approved, rejected)
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Index for reviewed_by (already created in script 12, but ensure it exists)
-- Used for: Tracking which coach reviewed leave requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_by ON leave_requests(reviewed_by);

-- Composite index for athlete_id and status
-- Used for: Athlete viewing their pending/approved/rejected leave requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_athlete_status 
  ON leave_requests(athlete_id, status);

-- Composite index for session_id and status
-- Used for: Coach viewing pending leave requests for their sessions
CREATE INDEX IF NOT EXISTS idx_leave_requests_session_status 
  ON leave_requests(session_id, status);

-- Index for requested_at (for sorting by request time)
-- Used for: Displaying leave requests in chronological order
CREATE INDEX IF NOT EXISTS idx_leave_requests_requested_at 
  ON leave_requests(requested_at DESC);

-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for training_sessions: team_id, status, scheduled_at
-- Used for: Complex queries filtering by team, status, and date
CREATE INDEX IF NOT EXISTS idx_training_sessions_team_status_scheduled 
  ON training_sessions(team_id, status, scheduled_at);

-- Partial index for scheduled sessions
-- Used for: Quickly finding scheduled sessions (filter by date in query)
CREATE INDEX IF NOT EXISTS idx_training_sessions_scheduled 
  ON training_sessions(scheduled_at, team_id) 
  WHERE status = 'scheduled';

-- Partial index for pending leave requests
-- Used for: Coach viewing pending leave requests that need review
CREATE INDEX IF NOT EXISTS idx_leave_requests_pending 
  ON leave_requests(session_id, athlete_id, requested_at) 
  WHERE status = 'pending';

-- Composite index for attendance with check_in_time for reporting
-- Used for: Generating attendance reports with check-in times
CREATE INDEX IF NOT EXISTS idx_attendance_session_checkin 
  ON attendance(session_id, check_in_time) 
  WHERE check_in_time IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Query to verify all indexes were created successfully
-- Run this separately to confirm:
-- SELECT tablename, COUNT(*) as index_count 
-- FROM pg_indexes 
-- WHERE tablename IN ('training_sessions', 'attendance', 'leave_requests')
-- GROUP BY tablename;
