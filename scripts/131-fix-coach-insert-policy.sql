-- ============================================================================
-- Fix RLS Policy to allow coaches to INSERT training sessions
-- ============================================================================

-- Drop and recreate policies
DROP POLICY IF EXISTS "Coaches manage own sessions" ON training_sessions;
DROP POLICY IF EXISTS "Athletes view club sessions" ON training_sessions;
DROP POLICY IF EXISTS "Admins manage all sessions" ON training_sessions;

-- ============================================================================
-- Policy 1: Coaches can INSERT sessions in their club
-- ============================================================================
CREATE POLICY "Coaches insert sessions"
  ON training_sessions
  FOR INSERT
  WITH CHECK (
    -- Coach must be inserting into their own club
    club_id IN (SELECT club_id FROM coaches WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Policy 2: Coaches can SELECT/UPDATE/DELETE their own sessions
-- ============================================================================
CREATE POLICY "Coaches manage own sessions"
  ON training_sessions
  FOR ALL
  USING (
    coach_id = auth.uid()
    OR created_by = auth.uid()
    OR club_id IN (SELECT club_id FROM coaches WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Policy 3: Athletes can view sessions in their club
-- ============================================================================
CREATE POLICY "Athletes view club sessions"
  ON training_sessions
  FOR SELECT
  USING (
    club_id IN (SELECT club_id FROM athletes WHERE user_id = auth.uid())
    OR team_id IN (SELECT club_id FROM athletes WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Policy 4: Admins can do everything
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
