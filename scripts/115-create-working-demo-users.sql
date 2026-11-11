-- Create working demo users for testing
-- This script creates demo accounts with proper setup

BEGIN;

-- 1. Create demo users in auth.users (via Supabase API)
-- Note: These need to be created via Supabase dashboard or API
-- Email: demo.admin@example.com, Password: Demo123456!
-- Email: demo.coach@example.com, Password: Demo123456!
-- Email: demo.athlete@example.com, Password: Demo123456!
-- Email: demo.parent@example.com, Password: Demo123456!

-- 2. Create profiles for demo users
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  phone_number,
  date_of_birth,
  gender,
  profile_picture_url,
  bio,
  membership_status,
  created_at,
  updated_at
) VALUES
-- Admin profile
(
  'demo-admin-id-12345',
  'demo.admin@example.com',
  'Demo Admin',
  '+66812345678',
  '1990-01-15',
  'M',
  NULL,
  'Demo administrator account',
  'active',
  NOW(),
  NOW()
),
-- Coach profile
(
  'demo-coach-id-12345',
  'demo.coach@example.com',
  'Demo Coach',
  '+66812345679',
  '1985-03-20',
  'M',
  NULL,
  'Demo coach account',
  'active',
  NOW(),
  NOW()
),
-- Athlete profile
(
  'demo-athlete-id-1234',
  'demo.athlete@example.com',
  'Demo Athlete',
  '+66812345680',
  '2000-05-10',
  'M',
  NULL,
  'Demo athlete account',
  'active',
  NOW(),
  NOW()
),
-- Parent profile
(
  'demo-parent-id-12345',
  'demo.parent@example.com',
  'Demo Parent',
  '+66812345681',
  '1970-07-25',
  'F',
  NULL,
  'Demo parent account',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- 3. Create user roles
INSERT INTO public.user_roles (
  user_id,
  role,
  created_at
) VALUES
-- Admin role
(
  'demo-admin-id-12345',
  'admin',
  NOW()
),
-- Coach role
(
  'demo-coach-id-12345',
  'coach',
  NOW()
),
-- Athlete role
(
  'demo-athlete-id-1234',
  'athlete',
  NOW()
),
-- Parent role
(
  'demo-parent-id-12345',
  'parent',
  NOW()
)
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Create a demo club
INSERT INTO public.clubs (
  id,
  name,
  description,
  location,
  sport_type,
  created_at,
  updated_at
) VALUES
(
  'demo-club-id-123456',
  'Demo Sports Club',
  'Demo club for testing',
  'Bangkok, Thailand',
  'Badminton',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- 5. Assign coach to club
INSERT INTO public.club_coaches (
  club_id,
  coach_id,
  created_at
) VALUES
(
  'demo-club-id-123456',
  'demo-coach-id-12345',
  NOW()
)
ON CONFLICT (club_id, coach_id) DO NOTHING;

-- 6. Create demo training session
INSERT INTO public.training_sessions (
  id,
  club_id,
  coach_id,
  name,
  description,
  session_date,
  start_time,
  end_time,
  location,
  max_participants,
  created_at,
  updated_at
) VALUES
(
  'demo-session-id-123456',
  'demo-club-id-123456',
  'demo-coach-id-12345',
  'Demo Training Session',
  'This is a demo training session for testing',
  CURRENT_DATE + INTERVAL '1 day',
  '10:00:00',
  '11:30:00',
  'Demo Court',
  20,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- 7. Create demo announcements
INSERT INTO public.announcements (
  id,
  club_id,
  coach_id,
  title,
  content,
  created_at,
  updated_at
) VALUES
(
  'demo-announce-id-123456',
  'demo-club-id-123456',
  'demo-coach-id-12345',
  'Welcome to Demo Club',
  'This is a demo announcement for testing the system',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

COMMIT;

-- Print summary
SELECT 'Demo users created successfully!' as status;
SELECT COUNT(*) as profile_count FROM public.profiles WHERE email LIKE 'demo.%@example.com';
SELECT COUNT(*) as role_count FROM public.user_roles WHERE user_id LIKE 'demo-%';
