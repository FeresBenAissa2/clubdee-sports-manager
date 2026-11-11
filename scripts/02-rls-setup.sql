-- Part 2: RLS Setup (Helper Functions and Policies)
-- Run this AFTER Part 1 in Supabase Dashboard > SQL Editor

-- Enable RLS on all tables
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

-- Helper functions in public schema (not auth schema)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'coach'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_athlete()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'athlete'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coach_of_team(team_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_uuid AND coach_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_uuid AND athlete_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- USER_ROLES POLICIES
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE
  USING (public.is_admin());

-- CLUBS POLICIES
DROP POLICY IF EXISTS "Everyone can view clubs" ON clubs;
CREATE POLICY "Everyone can view clubs"
  ON clubs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert clubs" ON clubs;
CREATE POLICY "Admins can insert clubs"
  ON clubs FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update clubs" ON clubs;
CREATE POLICY "Admins can update clubs"
  ON clubs FOR UPDATE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete clubs" ON clubs;
CREATE POLICY "Admins can delete clubs"
  ON clubs FOR DELETE
  USING (public.is_admin());

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins and coaches can view all profiles in their club" ON profiles;
CREATE POLICY "Admins and coaches can view all profiles in their club"
  ON profiles FOR SELECT
  USING (
    public.is_admin() OR 
    (public.is_coach() AND club_id = public.get_user_club_id())
  );

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- SPORTS POLICIES
DROP POLICY IF EXISTS "Everyone can view sports" ON sports;
CREATE POLICY "Everyone can view sports"
  ON sports FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage sports" ON sports;
CREATE POLICY "Admins can manage sports"
  ON sports FOR ALL
  USING (public.is_admin());

-- TEAMS POLICIES
DROP POLICY IF EXISTS "Users can view teams in their club" ON teams;
CREATE POLICY "Users can view teams in their club"
  ON teams FOR SELECT
  USING (club_id = public.get_user_club_id());

DROP POLICY IF EXISTS "Admins can manage all teams" ON teams;
CREATE POLICY "Admins can manage all teams"
  ON teams FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Coaches can manage their teams" ON teams;
CREATE POLICY "Coaches can manage their teams"
  ON teams FOR UPDATE
  USING (coach_id = auth.uid());

-- TEAM_MEMBERS POLICIES
DROP POLICY IF EXISTS "Users can view team members of their teams" ON team_members;
CREATE POLICY "Users can view team members of their teams"
  ON team_members FOR SELECT
  USING (
    public.is_team_member(team_id) OR
    public.is_coach_of_team(team_id) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Coaches can manage their team members" ON team_members;
CREATE POLICY "Coaches can manage their team members"
  ON team_members FOR ALL
  USING (public.is_coach_of_team(team_id) OR public.is_admin());

-- TRAINING_SESSIONS POLICIES
DROP POLICY IF EXISTS "Team members can view their sessions" ON training_sessions;
CREATE POLICY "Team members can view their sessions"
  ON training_sessions FOR SELECT
  USING (
    public.is_team_member(team_id) OR
    public.is_coach_of_team(team_id) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Coaches can manage their team sessions" ON training_sessions;
CREATE POLICY "Coaches can manage their team sessions"
  ON training_sessions FOR ALL
  USING (public.is_coach_of_team(team_id) OR public.is_admin());

-- ATTENDANCE POLICIES
DROP POLICY IF EXISTS "Athletes can view their own attendance" ON attendance;
CREATE POLICY "Athletes can view their own attendance"
  ON attendance FOR SELECT
  USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can view attendance for their sessions" ON attendance;
CREATE POLICY "Coaches can view attendance for their sessions"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = attendance.session_id
      AND public.is_coach_of_team(ts.team_id)
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Coaches can manage attendance for their sessions" ON attendance;
CREATE POLICY "Coaches can manage attendance for their sessions"
  ON attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions ts
      WHERE ts.id = attendance.session_id
      AND public.is_coach_of_team(ts.team_id)
    ) OR public.is_admin()
  );

-- PERFORMANCE_METRICS POLICIES
DROP POLICY IF EXISTS "Athletes can view their own metrics" ON performance_metrics;
CREATE POLICY "Athletes can view their own metrics"
  ON performance_metrics FOR SELECT
  USING (athlete_id = auth.uid());

DROP POLICY IF EXISTS "Coaches can view metrics for their team members" ON performance_metrics;
CREATE POLICY "Coaches can view metrics for their team members"
  ON performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.athlete_id = performance_metrics.athlete_id
      AND public.is_coach_of_team(tm.team_id)
    ) OR public.is_admin()
  );

DROP POLICY IF EXISTS "Coaches and admins can insert metrics" ON performance_metrics;
CREATE POLICY "Coaches and admins can insert metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (public.is_coach() OR public.is_admin());

DROP POLICY IF EXISTS "Coaches and admins can update metrics" ON performance_metrics;
CREATE POLICY "Coaches and admins can update metrics"
  ON performance_metrics FOR UPDATE
  USING (public.is_coach() OR public.is_admin());

-- ANNOUNCEMENTS POLICIES
DROP POLICY IF EXISTS "Users can view announcements targeted to them" ON announcements;
CREATE POLICY "Users can view announcements targeted to them"
  ON announcements FOR SELECT
  USING (
    (target_role IS NULL OR target_role = public.get_user_role()) AND
    (target_team_id IS NULL OR public.is_team_member(target_team_id)) AND
    (published_at IS NOT NULL AND published_at <= NOW()) AND
    (expires_at IS NULL OR expires_at > NOW())
  );

DROP POLICY IF EXISTS "Admins and coaches can manage announcements" ON announcements;
CREATE POLICY "Admins and coaches can manage announcements"
  ON announcements FOR ALL
  USING (public.is_admin() OR public.is_coach());

-- AUDIT_LOGS POLICIES
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
