-- =============================================================================
-- Link demo.coach@clubdee.com to EVERY club (including ones you added as admin)
-- Run in Supabase → SQL Editor after creating new clubs.
-- =============================================================================

INSERT INTO coaches (user_id, club_id, first_name, last_name, phone_number, email)
SELECT u.id, c.id, 'Demo', 'Coach', '0000000000', u.email
FROM auth.users u
CROSS JOIN clubs c
WHERE u.email = 'demo.coach@clubdee.com'
ON CONFLICT (user_id, club_id) DO UPDATE
SET email = EXCLUDED.email, updated_at = NOW();

SELECT c.name AS club, co.email AS coach
FROM clubs c
LEFT JOIN coaches co ON co.club_id = c.id
ORDER BY c.name;
