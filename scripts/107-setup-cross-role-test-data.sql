-- ============================================================================
-- Migration: 107-setup-cross-role-test-data.sql
-- Description: Creates test data for all roles (admin, coach, athlete, parent)
-- for cross-role integration testing
-- Requires: 106-add-parent-role-enum.sql
-- ============================================================================

-- ============================================================================
-- CREATE DEFAULT CLUB IF NOT EXISTS
-- ============================================================================

INSERT INTO clubs (id, name, description, logo_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Sports Club',
  'Default test club for development',
  NULL
)
ON CONFLICT (id) DO UPDATE SET name = 'Test Sports Club';

-- ============================================================================
-- CHECK AND CREATE USER ROLES FOR ALL TEST USERS
-- ============================================================================

-- Ensure admin role exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::user_role
FROM auth.users
WHERE email = 'admin@test.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;

-- Ensure coach role exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'coach'::user_role
FROM auth.users
WHERE email = 'coach@test.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'coach'::user_role;

-- Ensure athlete role exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'athlete'::user_role
FROM auth.users
WHERE email = 'athlete@test.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'athlete'::user_role;

-- Ensure parent role exists
INSERT INTO user_roles (user_id, role)
SELECT id, 'parent'::user_role
FROM auth.users
WHERE email = 'parent@test.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'parent'::user_role;

-- ============================================================================
-- CREATE PROFILES FOR TEST USERS (matching production schema)
-- ============================================================================

-- Admin profile
INSERT INTO profiles (id, email, full_name, role, club_id, membership_status)
SELECT 
  u.id,
  u.email,
  'Admin User',
  'admin',
  '00000000-0000-0000-0000-000000000001',
  'active'
FROM auth.users u
WHERE u.email = 'admin@test.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Admin User',
  role = 'admin',
  club_id = '00000000-0000-0000-0000-000000000001',
  membership_status = 'active';

-- Coach profile
INSERT INTO profiles (id, email, full_name, role, club_id, membership_status)
SELECT 
  u.id,
  u.email,
  'Coach User',
  'coach',
  '00000000-0000-0000-0000-000000000001',
  'active'
FROM auth.users u
WHERE u.email = 'coach@test.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Coach User',
  role = 'coach',
  club_id = '00000000-0000-0000-0000-000000000001',
  membership_status = 'active';

-- Athlete profile
INSERT INTO profiles (id, email, full_name, role, club_id, membership_status, coach_id)
SELECT 
  u.id,
  u.email,
  'Athlete User',
  'athlete',
  '00000000-0000-0000-0000-000000000001',
  'active',
  (SELECT id FROM auth.users WHERE email = 'coach@test.com')
FROM auth.users u
WHERE u.email = 'athlete@test.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Athlete User',
  role = 'athlete',
  club_id = '00000000-0000-0000-0000-000000000001',
  membership_status = 'active',
  coach_id = (SELECT id FROM auth.users WHERE email = 'coach@test.com');

-- Parent profile
INSERT INTO profiles (id, email, full_name, role, club_id, membership_status)
SELECT 
  u.id,
  u.email,
  'Parent User',
  'parent',
  NULL,
  'active'
FROM auth.users u
WHERE u.email = 'parent@test.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = 'Parent User',
  role = 'parent',
  membership_status = 'active';

-- ============================================================================
-- CREATE PARENT CONNECTION TO ATHLETE
-- ============================================================================

INSERT INTO parent_connections (athlete_id, parent_email, parent_name, relationship, parent_user_id, is_verified, is_active)
SELECT 
  a.id,
  'parent@test.com',
  'Parent User',
  'parent',
  p.id,
  true,
  true
FROM auth.users a, auth.users p
WHERE a.email = 'athlete@test.com'
AND p.email = 'parent@test.com'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

SELECT 
  'Test Users Setup' as category,
  u.email,
  ur.role as user_role,
  p.full_name,
  p.role as profile_role,
  p.membership_status,
  c.name as club_name
FROM auth.users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN clubs c ON c.id = p.club_id
WHERE u.email IN ('admin@test.com', 'coach@test.com', 'athlete@test.com', 'parent@test.com')
ORDER BY ur.role;
