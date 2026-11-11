-- =============================================================================
-- Attach demo.coach@clubdee.com to all 3 demo clubs (so athletes can apply)
--
-- BEFORE running:
--   Supabase → Authentication → Users → Add user
--   Email: demo.coach@clubdee.com
--   Password: Demo123456!
--   Auto Confirm User: ON
-- Then run this script in SQL Editor.
-- =============================================================================

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

-- If an older coaches table had UNIQUE(user_id) only, relax it:
DO $$ BEGIN
  ALTER TABLE coaches DROP CONSTRAINT IF EXISTS coaches_user_id_key;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

INSERT INTO profiles (id, email, full_name, membership_status)
SELECT u.id, u.email, 'Demo Coach', 'active'::membership_status
FROM auth.users u
WHERE u.email = 'demo.coach@clubdee.com'
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    membership_status = 'active'::membership_status;

INSERT INTO user_roles (user_id, role)
SELECT u.id, 'coach'::user_role
FROM auth.users u
WHERE u.email = 'demo.coach@clubdee.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'coach'::user_role;

-- Link this coach to all three demo clubs
-- (dashboard code supports multi-club coaches)
INSERT INTO coaches (user_id, club_id, first_name, last_name, phone_number, email)
SELECT
  u.id,
  c.id,
  'Demo',
  'Coach',
  '0000000000',
  u.email
FROM auth.users u
CROSS JOIN clubs c
WHERE u.email = 'demo.coach@clubdee.com'
  AND c.id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
  )
ON CONFLICT (user_id, club_id) DO UPDATE
SET email = EXCLUDED.email,
    updated_at = NOW();

-- Verify: each club should show a coach_email
SELECT c.name AS club, co.email AS coach_email
FROM clubs c
LEFT JOIN coaches co ON co.club_id = c.id
ORDER BY c.name;
