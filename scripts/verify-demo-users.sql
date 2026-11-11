-- MCP Verification: Check demo users exist
-- Correlation ID: verify-demo-users-2025-11-29

-- 1. Check auth.users
SELECT 'auth.users' as table_name, COUNT(*) as count 
FROM auth.users 
WHERE email LIKE 'demo.%@clubdee.com';

-- 2. Check profiles
SELECT id, email, full_name, role, membership_status, club_id
FROM public.profiles 
WHERE email LIKE 'demo.%@clubdee.com';

-- 3. Check clubs
SELECT id, name, description
FROM public.clubs 
WHERE name = 'ClubDee Demo';

-- 4. Check auth.identities
SELECT 'auth.identities' as table_name, COUNT(*) as count 
FROM auth.identities 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'demo.%@clubdee.com'
);
