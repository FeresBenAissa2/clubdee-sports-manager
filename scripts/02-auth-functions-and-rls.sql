-- ============================================================================
-- PART 2: Helper Functions and RLS Policies
-- Run this AFTER 01-schema-only.sql in Supabase Dashboard SQL Editor
-- ============================================================================
-- 
-- Migration: 02-auth-functions-and-rls.sql
-- Description: Creates RLS helper functions and enables RLS policies on all tables
-- 
-- UP: Creates helper functions, enables RLS, and creates all policies
-- DOWN: Drops all policies, disables RLS, and drops helper functions
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- ============================================================================
-- RLS HELPER FUNCTIONS (in public schema - works everywhere)
-- ============================================================================

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is coach
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'coach'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is athlete
CREATE OR REPLACE FUNCTION public.is_athlete()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'athlete'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is coach of a specific team
CREATE OR REPLACE FUNCTION public.is_coach_of_team(team_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_uuid AND coach_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if user is member of a specific team
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_uuid AND athlete_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to get user's club_id
CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER_ROLES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CLUBS POLICIES
-- ============================================================================

CREATE POLICY "Everyone can view clubs"
  ON clubs FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert clubs"
  ON clubs FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update clubs"
  ON clubs FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete clubs"
  ON clubs FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins and coaches can view all profiles in their club"
  ON profiles FOR SELECT
  USING (
    public.is_admin() OR 
    (public.is_coach() AND club_id = public.get_user_club_id())
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- ============================================================================
-- SPORTS POLICIES
-- ============================================================================

CREATE POLICY "Everyone can view sports"
  ON sports FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sports"
  ON sports FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- TEAMS POLICIES
-- ============================================================================

CREATE POLICY "Users can view teams in their club"
  ON teams FOR SELECT
  USING (club_id = public.get_user_club_id());

CREATE POLICY "Admins can manage all teams"
  ON teams FOR ALL
  USING (public.is_admin());

CREATE POLICY "Coaches can manage their teams"
  ON teams FOR UPDATE
  USING (coach_id = auth.uid());

-- ============================================================================
-- TEAM_MEMBERS POLICIES
-- ============================================================================

CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (
    public.is_team_member(team_id) OR
    public.is_coach_of_team(team_id) OR
    public.is_admin()
  );

CREATE POLICY "Coaches can manage their team members"
  ON team_members FOR ALL
  USING (public.is_coach_of_team(team_id) OR public.is_admin());

-- ============================================================================
-- TRAINING_SESSIONS POLICIES
-- ============================================================================

CREATE POLICY "Team members can view their sessions"
  ON training_sessions FOR SELECT
  USING (
    public.is_team_member(team_id) OR
    public.is_coach_of_team(team_id) OR
    public.is_admin()
  );

CREATE POLICY "Coaches can manage their team sessions"
  ON training_sessions FOR ALL
  USING (public.is_coach_of_team(team_id) OR public.is_admin());

-- ============================================================================
-- ATTENDANCE POLICIES
-- ============================================================================

CREATE POLICY "Athletes can view their own attendance"
  ON attendance FOR SELECT
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can view attendance for their sessions"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = attendance.session_id
      AND public.is_coach_of_team(ts.team_id)
    ) OR public.is_admin()
  );

CREATE POLICY "Coaches can manage attendance for their sessions"
  ON attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = attendance.session_id
      AND public.is_coach_of_team(ts.team_id)
    ) OR public.is_admin()
  );

-- ============================================================================
-- PERFORMANCE_METRICS POLICIES
-- ============================================================================

CREATE POLICY "Athletes can view their own metrics"
  ON performance_metrics FOR SELECT
  USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can view metrics for their team members"
  ON performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.athlete_id = performance_metrics.athlete_id
      AND public.is_coach_of_team(tm.team_id)
    ) OR public.is_admin()
  );

CREATE POLICY "Coaches and admins can insert metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (public.is_coach() OR public.is_admin());

CREATE POLICY "Coaches and admins can update metrics"
  ON performance_metrics FOR UPDATE
  USING (public.is_coach() OR public.is_admin());

-- ============================================================================
-- ANNOUNCEMENTS POLICIES
-- ============================================================================

CREATE POLICY "Users can view announcements targeted to them"
  ON announcements FOR SELECT
  USING (
    (target_role IS NULL OR target_role = public.get_user_role()) AND
    (target_team_id IS NULL OR public.is_team_member(target_team_id)) AND
    (published_at IS NOT NULL AND published_at <= NOW()) AND
    (expires_at IS NULL OR expires_at > NOW())
  );

CREATE POLICY "Admins and coaches can manage announcements"
  ON announcements FOR ALL
  USING (public.is_admin() OR public.is_coach());

-- ============================================================================
-- AUDIT_LOGS POLICIES
-- ============================================================================

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);


-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- Uncomment and run this section to rollback the migration

/*

-- Drop all RLS policies
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;

DROP POLICY IF EXISTS "Admins and coaches can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Users can view announcements targeted to them" ON announcements;

DROP POLICY IF EXISTS "Coaches and admins can update metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Coaches and admins can insert metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Coaches can view metrics for their team members" ON performance_metrics;
DROP POLICY IF EXISTS "Athletes can view their own metrics" ON performance_metrics;

DROP POLICY IF EXISTS "Coaches can manage attendance for their sessions" ON attendance;
DROP POLICY IF EXISTS "Coaches can view attendance for their sessions" ON attendance;
DROP POLICY IF EXISTS "Athletes can view their own attendance" ON attendance;

DROP POLICY IF EXISTS "Coaches can manage their team sessions" ON training_sessions;
DROP POLICY IF EXISTS "Team members can view their sessions" ON training_sessions;

DROP POLICY IF EXISTS "Coaches can manage their team members" ON team_members;
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;

DROP POLICY IF EXISTS "Coaches can manage their teams" ON teams;
DROP POLICY IF EXISTS "Admins can manage all teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams in their club" ON teams;

DROP POLICY IF EXISTS "Admins can manage sports" ON sports;
DROP POLICY IF EXISTS "Everyone can view sports" ON sports;

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and coaches can view all profiles in their club" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

DROP POLICY IF EXISTS "Admins can delete clubs" ON clubs;
DROP POLICY IF EXISTS "Admins can update clubs" ON clubs;
DROP POLICY IF EXISTS "Admins can insert clubs" ON clubs;
DROP POLICY IF EXISTS "Everyone can view clubs" ON clubs;

DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;

-- Disable RLS on all tables
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE sports DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE clubs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Drop RLS helper functions
DROP FUNCTION IF EXISTS public.get_user_club_id();
DROP FUNCTION IF EXISTS public.is_team_member(UUID);
DROP FUNCTION IF EXISTS public.is_coach_of_team(UUID);
DROP FUNCTION IF EXISTS public.is_athlete();
DROP FUNCTION IF EXISTS public.is_coach();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_user_role();

*/
