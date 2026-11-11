-- ============================================
-- RLS Policies for attendance table
-- ============================================
-- This script creates Row Level Security policies for the attendance table
-- to control access based on user roles (coaches, athletes, admins)
--
-- Note: The actual schema uses 'attendance' table (serves as 'attendance_logs' in design)

-- Enable RLS on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Athletes view own attendance" ON attendance;
DROP POLICY IF EXISTS "Athletes insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Coaches manage session attendance" ON attendance;
DROP POLICY IF EXISTS "Admins manage all attendance" ON attendance;

-- ============================================
-- Policy 1: Athletes can view their own attendance
-- ============================================
-- Athletes can only SELECT (read) their own attendance records
CREATE POLICY "Athletes view own attendance"
  ON attendance
  FOR SELECT
  USING (
    athlete_id = auth.uid()
  );

-- ============================================
-- Policy 2: Athletes can insert their own attendance (check-in)
-- ============================================
-- Athletes can INSERT (create) attendance records for themselves
-- This allows self check-in functionality
CREATE POLICY "Athletes insert own attendance"
  ON attendance
  FOR INSERT
  WITH CHECK (
    athlete_id = auth.uid()
  );

-- ============================================
-- Policy 3: Coaches can manage attendance for their sessions
-- ============================================
-- Coaches can SELECT, INSERT, UPDATE, and DELETE attendance records
-- for training sessions they created or are assigned to
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

-- ============================================
-- Policy 4: Admins can do everything
-- ============================================
-- Admins have full access to all attendance records
-- regardless of session or athlete
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

-- ============================================
-- Verification queries (commented out)
-- ============================================
-- Uncomment these to verify the policies are working correctly

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'attendance';

-- List all policies on attendance
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'attendance';
