-- =============================================================================
-- Fix: registration shows "No clubs available" even though clubs exist
-- Cause: RLS only allowed authenticated SELECT; empty result, no error.
-- Run once in Supabase → SQL Editor.
-- =============================================================================

DROP POLICY IF EXISTS clubs_select_all ON clubs;
CREATE POLICY clubs_select_all ON clubs FOR SELECT USING (true);

DROP POLICY IF EXISTS coaches_select_all ON coaches;
CREATE POLICY coaches_select_all ON coaches FOR SELECT USING (true);

-- Sanity check (should return your clubs)
SELECT id, name, sport_type FROM clubs ORDER BY name;
SELECT c.name AS club, co.email AS coach
FROM clubs c
LEFT JOIN coaches co ON co.club_id = c.id
ORDER BY c.name;
