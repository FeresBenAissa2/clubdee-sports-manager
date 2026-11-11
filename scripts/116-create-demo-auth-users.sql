-- Create demo auth users directly in auth.users table
-- This requires service_role key access

BEGIN;

-- 1. Create demo club first
INSERT INTO public.clubs (
  id,
  name,
  description,
  created_at,
  updated_at
) VALUES
(
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  'ClubDee Demo',
  'Demo club for testing',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- 2. Create demo admin user in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'demo.admin@clubdee.com',
  crypt('Demo123456!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Demo Admin"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 3. Create demo coach user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  '00000000-0000-0000-0000-000000000000',
  'demo.coach@clubdee.com',
  crypt('Demo123456!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Demo Coach"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 4. Create demo athlete user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  '00000000-0000-0000-0000-000000000000',
  'demo.athlete@clubdee.com',
  crypt('Demo123456!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Demo Athlete"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 5. Create identities for each user
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
) VALUES 
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '{"sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "email": "demo.admin@clubdee.com"}',
  'email',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  NOW(),
  NOW()
),
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  '{"sub": "b2c3d4e5-f6a7-8901-bcde-f12345678901", "email": "demo.coach@clubdee.com"}',
  'email',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  NOW(),
  NOW()
),
(
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  '{"sub": "c3d4e5f6-a7b8-9012-cdef-123456789012", "email": "demo.athlete@clubdee.com"}',
  'email',
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 6. Create profiles for demo users with club_id
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  membership_status,
  club_id,
  created_at
) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'demo.admin@clubdee.com',
  'Demo Admin',
  'admin',
  'active',
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  NOW()
),
(
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'demo.coach@clubdee.com',
  'Demo Coach',
  'coach',
  'active',
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  NOW()
),
(
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'demo.athlete@clubdee.com',
  'Demo Athlete',
  'athlete',
  'active',
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  club_id = EXCLUDED.club_id;

-- 7. Create user_roles for demo users (required for middleware routing)
INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin', NOW(), NOW()),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'coach', NOW(), NOW()),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'athlete', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET 
  role = EXCLUDED.role,
  updated_at = NOW();

-- 8. Create coach record for demo coach (required for coach dashboard)
INSERT INTO public.coaches (
  id, user_id, club_id, first_name, last_name, email, created_at, updated_at
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  'Demo', 'Coach', 'demo.coach@clubdee.com', NOW(), NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  club_id = EXCLUDED.club_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

-- 9. Create athlete record for demo athlete (required for athlete dashboard)
INSERT INTO public.athletes (
  id, user_id, club_id, first_name, last_name, nickname, email, created_at, updated_at
) VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  'Demo', 'Athlete', 'นักกีฬาทดสอบ', 'demo.athlete@clubdee.com', NOW(), NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  club_id = EXCLUDED.club_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();

COMMIT;

SELECT 'Demo users created!' as status;
SELECT p.id, p.email, p.full_name, p.role as profile_role, ur.role as user_role 
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.email LIKE 'demo.%@clubdee.com';
