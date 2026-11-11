-- ============================================================================
-- Fix RLS Policies for training_sessions table
-- ============================================================================
-- Problem: Current RLS policies use coach_id referencing auth.users
-- but the application stores coach_id from coaches table
-- Also: policies use team_id but app uses club_id
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Coaches manage own sessions" ON training_sessions;
DROP POLICY IF EXISTS "Athletes view team sessions" ON training_sessions;
DROP POLICY IF EXISTS "Athletes view club sessions" ON training_sessions;
DROP POLICY IF EXISTS "Admins manage all sessions" ON training_sessions;

-- ============================================================================
-- Policy 1: Coaches can CRUD sessions in their club
-- ============================================================================
-- Coaches can create, read, update, and delete training sessions
-- where the coach_id matches their coach record OR they created it
CREATE POLICY "Coaches manage own sessions"
  ON training_sessions
  FOR ALL
  USING (
    -- Coach owns this session (coach_id references coaches.id)
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
    OR
    -- Coach created this session (created_by references auth.users)
    created_by = auth.uid()
    OR
    -- Session is in coach's club
    club_id IN (SELECT club_id FROM coaches WHERE user_id = auth.uid())
  )
  WITH CHECK (
    -- Coach owns this session
    coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
    OR
    -- Coach created this session
    created_by = auth.uid()
    OR
    -- Session is in coach's club
    club_id IN (SELECT club_id FROM coaches WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Policy 2: Athletes can view sessions in their club
-- ============================================================================
-- Athletes can only SELECT (read) training sessions
-- that belong to their club (via club_id) or team (via team_id)
CREATE POLICY "Athletes view club sessions"
  ON training_sessions
  FOR SELECT
  USING (
    -- Session is in athlete's club (new schema)
    club_id IN (SELECT club_id FROM athletes WHERE user_id = auth.uid())
    OR
    -- Session is in athlete's team (legacy schema)
    team_id IN (SELECT club_id FROM athletes WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Policy 3: Admins can do everything
-- ============================================================================
-- Admins have full access to all training sessions
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

-- ============================================================================
-- Verification
-- ============================================================================
-- List all policies on training_sessions
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'training_sessions';
