-- ============================================================================
-- PART 3: Setup Test Data (Clubs, User Roles, Profiles)
-- Run this AFTER creating test users
-- ============================================================================
-- 
-- Migration: 03-setup-test-data.sql
-- Description: Creates test data including clubs, user roles, profiles, sports, and teams
-- 
-- UP: Inserts test data for development and testing
-- DOWN: Deletes all test data
-- 
-- WARNING: DOWN migration will delete test users' data. Use with caution.
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- ============================================================================
-- CREATE DEFAULT CLUB
-- ============================================================================

INSERT INTO clubs (id, name, description, logo_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Sports Club',
  'Default test club for development',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CREATE USER ROLES FOR TEST USERS
-- ============================================================================

-- Admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::user_role
FROM auth.users
WHERE email = 'admin@test.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;

-- Coach role
INSERT INTO user_roles (user_id, role)
SELECT id, 'coach'::user_role
FROM auth.users
WHERE email = 'coach@test.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'coach'::user_role;

-- Athlete role
INSERT INTO user_roles (user_id, role)
SELECT id, 'athlete'::user_role
FROM auth.users
WHERE email = 'athlete@test.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'athlete'::user_role;

-- ============================================================================
-- CREATE PROFILES FOR TEST USERS
-- ============================================================================

-- Admin profile
INSERT INTO profiles (id, email, full_name, phone, club_id)
SELECT 
  u.id,
  u.email,
  'Admin User',
  '0812345678',
  '00000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE u.email = 'admin@test.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Admin User',
  phone = '0812345678',
  club_id = '00000000-0000-0000-0000-000000000001';

-- Coach profile
INSERT INTO profiles (id, email, full_name, phone, club_id)
SELECT 
  u.id,
  u.email,
  'Coach User',
  '0823456789',
  '00000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE u.email = 'coach@test.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Coach User',
  phone = '0823456789',
  club_id = '00000000-0000-0000-0000-000000000001';

-- Athlete profile
INSERT INTO profiles (id, email, full_name, phone, date_of_birth, club_id)
SELECT 
  u.id,
  u.email,
  'Athlete User',
  '0834567890',
  '2000-01-01',
  '00000000-0000-0000-0000-000000000001'
FROM auth.users u
WHERE u.email = 'athlete@test.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Athlete User',
  phone = '0834567890',
  date_of_birth = '2000-01-01',
  club_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- CREATE SAMPLE SPORTS
-- ============================================================================

INSERT INTO sports (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Football', 'Association football'),
  ('00000000-0000-0000-0000-000000000002', 'Basketball', 'Indoor basketball'),
  ('00000000-0000-0000-0000-000000000003', 'Volleyball', 'Indoor volleyball')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- CREATE SAMPLE TEAM
-- ============================================================================

INSERT INTO teams (id, name, sport_id, club_id, coach_id, description)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'Test Football Team',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  u.id,
  'Default test team for development'
FROM auth.users u
WHERE u.email = 'coach@test.com'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADD ATHLETE TO TEAM
-- ============================================================================

INSERT INTO team_members (team_id, athlete_id)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  u.id
FROM auth.users u
WHERE u.email = 'athlete@test.com'
ON CONFLICT (team_id, athlete_id) DO NOTHING;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

-- Show created data
SELECT 
  'Test Users' as category,
  u.email,
  ur.role,
  p.full_name,
  c.name as club_name
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN clubs c ON c.id = p.club_id
WHERE u.email IN ('admin@test.com', 'coach@test.com', 'athlete@test.com')
ORDER BY ur.role;


-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- Uncomment and run this section to rollback the migration
-- WARNING: This will delete test data. Use with caution.

/*

-- Remove athlete from team
DELETE FROM team_members 
WHERE team_id = '00000000-0000-0000-0000-000000000001'
AND athlete_id IN (
  SELECT id FROM auth.users WHERE email = 'athlete@test.com'
);

-- Delete sample team
DELETE FROM teams WHERE id = '00000000-0000-0000-0000-000000000001';

-- Delete sample sports
DELETE FROM sports WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- Delete test user profiles
DELETE FROM profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN (
    'admin@test.com',
    'coach@test.com',
    'athlete@test.com'
  )
);

-- Delete test user roles
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'admin@test.com',
    'coach@test.com',
    'athlete@test.com'
  )
);

-- Delete default club
DELETE FROM clubs WHERE id = '00000000-0000-0000-0000-000000000001';

-- Note: This does NOT delete the auth.users records themselves
-- To fully remove test users, you must delete them from Supabase Auth dashboard
-- or use the Supabase Admin API

*/
