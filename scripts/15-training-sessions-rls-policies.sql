-- ============================================
-- RLS Policies for training_sessions table
-- ============================================
-- This script creates Row Level Security policies for the training_sessions table
-- to control access based on user roles (coaches, athletes, admins)
--
-- Note: The actual schema uses:
-- - team_id (not club_id)
-- - created_by (references auth.users)
-- - coach_id (added field, references auth.users)

-- Enable RLS on training_sessions table
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Coaches manage own sessions" ON training_sessions;
DROP POLICY IF EXISTS "Athletes view team sessions" ON training_sessions;
DROP POLICY IF EXISTS "Admins manage all sessions" ON training_sessions;

-- ============================================
-- Policy 1: Coaches can CRUD their own sessions
-- ============================================
-- Coaches can create, read, update, and delete training sessions
-- that they created (created_by) or are assigned to (coach_id)
CREATE POLICY "Coaches manage own sessions"
  ON training_sessions
  FOR ALL
  USING (
    created_by = auth.uid() OR coach_id = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid() OR coach_id = auth.uid()
  );

-- ============================================
-- Policy 2: Athletes can view sessions in their team
-- ============================================
-- Athletes can only SELECT (read) training sessions
-- that belong to their team
CREATE POLICY "Athletes view team sessions"
  ON training_sessions
  FOR SELECT
  USING (
    team_id IN (
      SELECT club_id FROM athletes WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Policy 3: Admins can do everything
-- ============================================
-- Admins have full access to all training sessions
-- regardless of team or coach assignment
CREATE POLICY "Admins manage all sessions"
  ON training_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- Verification queries (commented out)
-- ============================================
-- Uncomment these to verify the policies are working correctly

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'training_sessions';

-- List all policies on training_sessions
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'training_sessions';
