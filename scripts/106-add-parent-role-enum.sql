-- ============================================================================
-- Migration: 106-add-parent-role-enum.sql
-- Description: Adds 'parent' value to user_role enum for parent portal feature
-- ============================================================================

-- Add parent to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';

-- Verify the enum now includes parent
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;
