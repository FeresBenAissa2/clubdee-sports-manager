-- =============================================================================
-- SCHOOL BOOTSTRAP — run this ONCE in Supabase SQL Editor
-- Fixes missing columns / RLS / seed data after the early 01/02/03 scripts.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- =============================================================================

-- 1) membership_status enum + profile columns the app expects
DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('pending', 'active', 'rejected', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_status membership_status DEFAULT NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- club_id may already exist from 01-schema
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_membership_status ON profiles(membership_status);
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON profiles(coach_id);

-- 2) clubs.sport_type used by sport selection UI
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS sport_type VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_clubs_sport_type ON clubs(sport_type);

-- 3) Allow a newly signed-up user to create THEIR OWN role row
--    (02-auth only allowed admins to INSERT into user_roles)
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
CREATE POLICY "Users can insert their own role"
  ON user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Keep existing profile insert policy (id = auth.uid()) — signup must send id

-- 4) Membership applications table (if not created yet)
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
  profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, club_id)
);

ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own applications" ON membership_applications;
CREATE POLICY "Users can view own applications"
  ON membership_applications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_coach());

DROP POLICY IF EXISTS "Users can insert own applications" ON membership_applications;
CREATE POLICY "Users can insert own applications"
  ON membership_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Coaches and admins can update applications" ON membership_applications;
CREATE POLICY "Coaches and admins can update applications"
  ON membership_applications FOR UPDATE
  USING (public.is_admin() OR public.is_coach());

-- 5) coaches table (membership require ≥1 coach per club before apply)
-- One coach may cover several clubs → UNIQUE(user_id, club_id)
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

CREATE INDEX IF NOT EXISTS idx_coaches_club_id ON coaches(club_id);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view coaches" ON coaches;
CREATE POLICY "Everyone can view coaches"
  ON coaches FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage coaches" ON coaches;
CREATE POLICY "Admins manage coaches"
  ON coaches FOR ALL USING (public.is_admin());

-- 5b) Seed demo clubs with sport_type (needed for registration)
INSERT INTO clubs (id, name, description, sport_type)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Sports Club', 'Default school demo club', 'Football'),
  ('00000000-0000-0000-0000-000000000002', 'Basketball Academy', 'Demo basketball club', 'Basketball'),
  ('00000000-0000-0000-0000-000000000003', 'Swim Stars', 'Demo swimming club', 'Swimming')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sport_type = EXCLUDED.sport_type;

UPDATE clubs
SET sport_type = COALESCE(sport_type, 'General')
WHERE sport_type IS NULL;

-- 6) Backfill profile + athlete role for ANY auth user missing them
INSERT INTO profiles (id, email, full_name, membership_status)
SELECT
  u.id,
  COALESCE(u.email, u.id::text || '@local.dev'),
  COALESCE(split_part(u.email, '@', 1), 'Athlete'),
  NULL
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT u.id, 'athlete'::user_role
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- Done. Verify:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles' AND column_name = 'membership_status';
-- SELECT id, name, sport_type FROM clubs;
-- SELECT id, email, membership_status FROM profiles;
