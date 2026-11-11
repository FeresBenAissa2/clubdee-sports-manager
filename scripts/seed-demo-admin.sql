-- =============================================================================
-- Create / link demo ADMIN account
--
-- BEFORE running:
--   Supabase → Authentication → Users → Add user
--   Email:    demo.admin@clubdee.com
--   Password: Demo123456!
--   Auto Confirm User: ON
-- Then run this script in SQL Editor.
-- =============================================================================

INSERT INTO profiles (id, email, full_name, membership_status, role)
SELECT u.id, u.email, 'Demo Admin', 'active'::membership_status, 'admin'
FROM auth.users u
WHERE u.email = 'demo.admin@clubdee.com'
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    membership_status = 'active'::membership_status,
    role = 'admin';

INSERT INTO user_roles (user_id, role)
SELECT u.id, 'admin'::user_role
FROM auth.users u
WHERE u.email = 'demo.admin@clubdee.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;

-- Verify
SELECT u.email, ur.role, p.full_name, p.membership_status
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email = 'demo.admin@clubdee.com';
