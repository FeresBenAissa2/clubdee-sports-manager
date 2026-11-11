-- ============================================
-- Cleanup duplicate attendance RLS policies
-- ============================================
-- Remove old/duplicate policies and keep only the correct ones

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Athletes view own attendance" ON attendance;
DROP POLICY IF EXISTS "Athletes can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Athletes insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Coaches manage session attendance" ON attendance;
DROP POLICY IF EXISTS "Coaches can manage attendance for their sessions" ON attendance;
DROP POLICY IF EXISTS "Coaches can view attendance for their sessions" ON attendance;
DROP POLICY IF EXISTS "Admins manage all attendance" ON attendance;

-- ============================================
-- Recreate clean policies
-- ============================================

-- Policy 1: Athletes can view their own attendance
CREATE POLICY "Athletes view own attendance"
  ON attendance
  FOR SELECT
  USING (
    athlete_id = auth.uid()
  );

-- Policy 2: Athletes can insert their own attendance (check-in)
CREATE POLICY "Athletes insert own attendance"
  ON attendance
  FOR INSERT
  WITH CHECK (
    athlete_id = auth.uid()
  );

-- Policy 3: Coaches can manage attendance for their sessions
CREATE POLICY "Coaches manage session attendance"
  ON attendance
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM training_sessions 
      WHERE created_by = auth.uid() OR coach_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM training_sessions 
      WHERE created_by = auth.uid() OR coach_id = auth.uid()
    )
  );

-- Policy 4: Admins can do everything
CREATE POLICY "Admins manage all attendance"
  ON attendance
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
