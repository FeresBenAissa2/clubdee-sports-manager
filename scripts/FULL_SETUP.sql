-- =============================================================================
-- FULL_SETUP.sql — ONE script for the school project (6 modules)
-- Run in Supabase → SQL Editor (safe to re-run).
--
-- Covers: Auth roles, Clubs, Coaches, Athletes, Membership, Training sessions,
--         Attendance, Performance, Announcements, Tournaments + helper RPCs.
--
-- BEFORE running (Auth users — Dashboard → Authentication → Users → Add user):
--   1) demo.admin@clubdee.com   / Demo123456!   (Auto Confirm ON)
--   2) demo.coach@clubdee.com   / Demo123456!   (Auto Confirm ON)
-- Athlete accounts can self-register in the app.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) ENUMS
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'coach', 'athlete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE membership_status AS ENUM ('pending', 'active', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE check_in_method AS ENUM ('manual', 'qr', 'auto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE session_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1) CORE AUTH / CLUBS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  sport_type VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS sport_type VARCHAR(100);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'athlete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(30),
  date_of_birth DATE,
  avatar_url TEXT,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  membership_status membership_status,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_status membership_status;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON profiles (email);

CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT,
  device_info JSONB,
  user_agent TEXT,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2) COACHES + ATHLETES (membership approval creates athletes rows)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL DEFAULT 'Coach',
  last_name VARCHAR(100) NOT NULL DEFAULT 'User',
  phone_number VARCHAR(30) NOT NULL DEFAULT '0000000000',
  email VARCHAR(255) NOT NULL,
  certification_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, club_id)
);
DO $$ BEGIN
  ALTER TABLE coaches DROP CONSTRAINT IF EXISTS coaches_user_id_key;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  nickname VARCHAR(100),
  date_of_birth DATE,
  phone_number VARCHAR(30) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  gender VARCHAR(20),
  health_notes TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_coaches_club_id ON coaches(club_id);
CREATE INDEX IF NOT EXISTS idx_athletes_user_id ON athletes(user_id);
CREATE INDEX IF NOT EXISTS idx_athletes_club_id ON athletes(club_id);

-- ---------------------------------------------------------------------------
-- 3) MEMBERSHIP APPLICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  personal_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
  review_info JSONB,
  activity_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, club_id)
);
-- profile_id may point at athletes.id (soft FK; avoid hard FK if athletes created later)
CREATE INDEX IF NOT EXISTS idx_membership_apps_user ON membership_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_apps_club ON membership_applications(club_id);
CREATE INDEX IF NOT EXISTS idx_membership_apps_status ON membership_applications(status);

-- ---------------------------------------------------------------------------
-- 4) TRAINING + ATTENDANCE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Training',
  description TEXT,
  session_date DATE,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255) DEFAULT '',
  max_participants INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  qr_code TEXT,
  -- legacy columns kept nullable for old scripts
  team_id UUID,
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evolve existing training_sessions if created by older scripts
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS session_date DATE;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS max_participants INTEGER;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS description TEXT;

-- Drop NOT NULL on legacy team_id if present
DO $$ BEGIN
  ALTER TABLE training_sessions ALTER COLUMN team_id DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE training_sessions ALTER COLUMN scheduled_at DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE training_sessions ALTER COLUMN duration_minutes DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_club ON training_sessions(club_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON training_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_coach ON training_sessions(coach_id);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL, -- athletes.id
  status attendance_status NOT NULL DEFAULT 'absent',
  check_in_time TIMESTAMPTZ,
  check_in_method check_in_method DEFAULT 'manual',
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS training_session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_method check_in_method DEFAULT 'manual';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_training_session ON attendance(training_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_athlete ON attendance(athlete_id);

-- ---------------------------------------------------------------------------
-- 5) PERFORMANCE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS performance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  test_type VARCHAR(100) NOT NULL DEFAULT 'general',
  test_name VARCHAR(200) NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  unit VARCHAR(50) NOT NULL DEFAULT '',
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_athlete ON performance_records(athlete_id);
CREATE INDEX IF NOT EXISTS idx_perf_coach ON performance_records(coach_id);

-- ---------------------------------------------------------------------------
-- 6) ANNOUNCEMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role TEXT,
  title TEXT NOT NULL,
  message TEXT,
  content TEXT,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT NOT NULL DEFAULT 'all',
  is_pinned BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE CASCADE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'all';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_role TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (announcement_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 7) TOURNAMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  sport_type TEXT NOT NULL DEFAULT 'General',
  location TEXT,
  notes TEXT,
  max_participants INTEGER,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'selected'
    CHECK (status IN ('selected', 'waiting', 'confirmed', 'declined')),
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  coach_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, athlete_id)
);

-- ---------------------------------------------------------------------------
-- 8) HELPER FUNCTIONS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'coach'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_athlete()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'athlete'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION add_activity_log(
  p_application_id UUID,
  p_action TEXT,
  p_by_user UUID,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  v_user_role TEXT;
  v_log_entry JSONB;
BEGIN
  SELECT 'coach' INTO v_user_role FROM coaches WHERE user_id = p_by_user LIMIT 1;
  IF v_user_role IS NULL THEN
    SELECT role::text INTO v_user_role FROM user_roles WHERE user_id = p_by_user LIMIT 1;
  END IF;

  v_log_entry := jsonb_build_object(
    'timestamp', NOW(),
    'action', p_action,
    'by_user', p_by_user,
    'by_role', COALESCE(v_user_role, 'athlete')
  ) || COALESCE(p_details, '{}'::jsonb);

  UPDATE membership_applications
  SET activity_log = COALESCE(activity_log, '[]'::jsonb) || jsonb_build_array(v_log_entry),
      updated_at = NOW()
  WHERE id = p_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_application_status(
  p_application_id UUID,
  p_new_status TEXT,
  p_reviewed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_old_status TEXT;
  v_reviewer_role TEXT;
BEGIN
  SELECT status INTO v_old_status FROM membership_applications WHERE id = p_application_id;

  SELECT 'coach' INTO v_reviewer_role FROM coaches WHERE user_id = p_reviewed_by LIMIT 1;
  IF v_reviewer_role IS NULL THEN
    SELECT role::text INTO v_reviewer_role FROM user_roles WHERE user_id = p_reviewed_by LIMIT 1;
  END IF;

  UPDATE membership_applications
  SET status = p_new_status,
      review_info = jsonb_build_object(
        'reviewed_by', p_reviewed_by,
        'reviewed_at', NOW(),
        'reviewer_role', COALESCE(v_reviewer_role, 'coach'),
        'notes', p_notes
      ),
      updated_at = NOW()
  WHERE id = p_application_id;

  PERFORM add_activity_log(
    p_application_id,
    'status_changed',
    p_reviewed_by,
    jsonb_build_object('from', v_old_status, 'to', p_new_status, 'notes', p_notes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION check_duplicate_pending_application(p_user_id UUID)
RETURNS TABLE(
  has_pending BOOLEAN,
  pending_application_id UUID,
  pending_club_id UUID,
  pending_since TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE, ma.id, ma.club_id, ma.created_at
  FROM membership_applications ma
  WHERE ma.user_id = p_user_id AND ma.status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 9) RLS — school-friendly authenticated access
-- ---------------------------------------------------------------------------
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- Drop + recreate key policies (idempotent)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'clubs','user_roles','profiles','coaches','athletes','membership_applications',
        'training_sessions','attendance','performance_records','announcements',
        'announcement_reads','tournaments','tournament_participants','login_sessions'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- clubs (public read so registration can list sports even before/without a session)
CREATE POLICY clubs_select_all ON clubs FOR SELECT USING (true);
CREATE POLICY clubs_admin_write ON clubs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- user_roles
CREATE POLICY user_roles_select_own ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY user_roles_insert_own ON user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY user_roles_admin_all ON user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- profiles
CREATE POLICY profiles_select_authenticated ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin() OR public.is_coach())
  WITH CHECK (id = auth.uid() OR public.is_admin() OR public.is_coach());

-- coaches (public read so registration can see which clubs have a coach)
CREATE POLICY coaches_select_all ON coaches FOR SELECT USING (true);
CREATE POLICY coaches_insert_admin ON coaches FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR user_id = auth.uid());
CREATE POLICY coaches_update_own ON coaches FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- athletes
CREATE POLICY athletes_select_all ON athletes FOR SELECT TO authenticated USING (true);
CREATE POLICY athletes_insert_auth ON athletes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_coach() OR user_id = auth.uid());
CREATE POLICY athletes_update_auth ON athletes FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_coach() OR user_id = auth.uid());

-- membership_applications
CREATE POLICY apps_select ON membership_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_coach());
CREATE POLICY apps_insert_own ON membership_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY apps_update_staff ON membership_applications FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_coach() OR user_id = auth.uid());

-- training_sessions
CREATE POLICY sessions_select ON training_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY sessions_write_coach ON training_sessions FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_coach())
  WITH CHECK (public.is_admin() OR public.is_coach());

-- attendance
CREATE POLICY attendance_select ON attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY attendance_write ON attendance FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_coach())
  WITH CHECK (public.is_admin() OR public.is_coach());

-- performance
CREATE POLICY perf_select ON performance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY perf_write ON performance_records FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_coach())
  WITH CHECK (public.is_admin() OR public.is_coach());

-- announcements
CREATE POLICY ann_select ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY ann_write ON announcements FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_coach())
  WITH CHECK (public.is_admin() OR public.is_coach());
CREATE POLICY ann_reads_select ON announcement_reads FOR SELECT TO authenticated USING (true);
CREATE POLICY ann_reads_write ON announcement_reads FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_coach())
  WITH CHECK (user_id = auth.uid() OR public.is_admin() OR public.is_coach());

-- tournaments
CREATE POLICY tournaments_select ON tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY tournaments_write ON tournaments FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_coach())
  WITH CHECK (public.is_admin() OR public.is_coach());
CREATE POLICY tp_select ON tournament_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY tp_write ON tournament_participants FOR ALL TO authenticated
  USING (public.is_admin() OR public.is_coach() OR athlete_id = auth.uid())
  WITH CHECK (public.is_admin() OR public.is_coach() OR athlete_id = auth.uid());

-- login_sessions
CREATE POLICY login_sessions_own ON login_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 10) SEED DEMO CLUBS
-- ---------------------------------------------------------------------------
INSERT INTO clubs (id, name, description, sport_type)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Sports Club', 'Default school demo club', 'Football'),
  ('00000000-0000-0000-0000-000000000002', 'Basketball Academy', 'Demo basketball club', 'Basketball'),
  ('00000000-0000-0000-0000-000000000003', 'Swim Stars', 'Demo swimming club', 'Swimming')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    sport_type = EXCLUDED.sport_type;

UPDATE clubs SET sport_type = COALESCE(sport_type, 'General') WHERE sport_type IS NULL;

-- ---------------------------------------------------------------------------
-- 11) LINK DEMO AUTH USERS (must already exist in Authentication)
-- ---------------------------------------------------------------------------
-- Admin
INSERT INTO profiles (id, email, full_name, membership_status, role)
SELECT u.id, u.email, 'Demo Admin', 'active'::membership_status, 'admin'
FROM auth.users u WHERE u.email = 'demo.admin@clubdee.com'
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name, membership_status = 'active'::membership_status, role = 'admin';

INSERT INTO user_roles (user_id, role)
SELECT u.id, 'admin'::user_role FROM auth.users u WHERE u.email = 'demo.admin@clubdee.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;

-- Coach → all 3 clubs
INSERT INTO profiles (id, email, full_name, membership_status, role, club_id)
SELECT u.id, u.email, 'Demo Coach', 'active'::membership_status, 'coach',
       '00000000-0000-0000-0000-000000000001'
FROM auth.users u WHERE u.email = 'demo.coach@clubdee.com'
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name, membership_status = 'active'::membership_status, role = 'coach';

INSERT INTO user_roles (user_id, role)
SELECT u.id, 'coach'::user_role FROM auth.users u WHERE u.email = 'demo.coach@clubdee.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'coach'::user_role;

INSERT INTO coaches (user_id, club_id, first_name, last_name, phone_number, email)
SELECT u.id, c.id, 'Demo', 'Coach', '0000000000', u.email
FROM auth.users u
CROSS JOIN clubs c
WHERE u.email = 'demo.coach@clubdee.com'
  AND c.id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
  )
ON CONFLICT (user_id, club_id) DO UPDATE
SET email = EXCLUDED.email, updated_at = NOW();

-- Backfill any existing auth users missing profile/role (as athletes)
INSERT INTO profiles (id, email, full_name, membership_status)
SELECT u.id, COALESCE(u.email, u.id::text || '@local.dev'),
       COALESCE(split_part(u.email, '@', 1), 'User'), NULL
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT u.id, 'athlete'::user_role FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12) VERIFY
-- ---------------------------------------------------------------------------
SELECT 'clubs' AS entity, count(*)::text AS n FROM clubs
UNION ALL SELECT 'coaches', count(*)::text FROM coaches
UNION ALL SELECT 'athletes', count(*)::text FROM athletes
UNION ALL SELECT 'membership_applications', count(*)::text FROM membership_applications
UNION ALL SELECT 'user_roles', count(*)::text FROM user_roles
UNION ALL SELECT 'profiles', count(*)::text FROM profiles;

SELECT c.name AS club, co.email AS coach
FROM clubs c
LEFT JOIN coaches co ON co.club_id = c.id
ORDER BY c.name;

-- Done. Next: restart Next.js, login as demo.coach@clubdee.com, approve pending apps.
