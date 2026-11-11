-- ============================================================================
-- Fix RLS Policies for training_sessions table (v2)
-- ============================================================================
-- Schema: coach_id references auth.users(id), NOT coaches(id)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Coaches manage own sessions" ON training_sessions;
DROP POLICY IF EXISTS "Athletes view team sessions" ON training_sessions;
DROP POLICY IF EXISTS "Athletes view club sessions" ON training_sessions;
DROP POLICY IF EXISTS "Admins manage all sessions" ON training_sessions;

-- ============================================================================
-- Policy 1: Coaches can CRUD sessions they own or created
-- ============================================================================
-- coach_id references auth.users(id) directly
CREATE POLICY "Coaches manage own sessions"
  ON training_sessions
  FOR ALL
  USING (
    -- Coach owns this session (coach_id = auth.uid())
    coach_id = auth.uid()
    OR
    -- Coach created this session
    created_by = auth.uid()
    OR
    -- Session is in coach's club
    club_id IN (SELECT club_id FROM coaches WHERE user_id = auth.uid())
  )
  WITH CHECK (
    -- Coach owns this session
    coach_id = auth.uid()
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
CREATE POLICY "Athletes view club sessions"
  ON training_sessions
  FOR SELECT
  USING (
    -- Session is in athlete's club (via club_id)
    club_id IN (SELECT club_id FROM athletes WHERE user_id = auth.uid())
    OR
    -- Session is in athlete's team (legacy via team_id)
    team_id IN (SELECT club_id FROM athletes WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Policy 3: Admins can do everything
-- ============================================================================
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

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'training_sessions';
