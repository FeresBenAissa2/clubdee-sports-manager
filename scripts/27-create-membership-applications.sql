-- ============================================================================
-- Membership Applications System - Database Schema
-- ============================================================================
-- Description: สร้างตารางสำหรับระบบสมัครสมาชิกสโมสรกีฬา
-- Author: System
-- Created: 2024-11-22
-- ============================================================================

-- Drop existing objects if any
DROP TABLE IF EXISTS membership_applications CASCADE;
DROP FUNCTION IF EXISTS add_activity_log(UUID, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS update_application_status(UUID, TEXT, UUID, TEXT) CASCADE;

-- ============================================================================
-- Main Table: membership_applications
-- ============================================================================
CREATE TABLE membership_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  
  -- Personal Information (flexible with JSONB)
  personal_info JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "full_name": "ชื่อ-นามสกุล",
  --   "phone_number": "081-234-5678",
  --   "address": "ที่อยู่",
  --   "emergency_contact": "089-999-9999"
  -- }
  
  -- Documents (flexible array)
  documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example structure:
  -- [
  --   {
  --     "type": "id_card",
  --     "url": "path/to/file",
  --     "uploaded_at": "2024-01-01T00:00:00Z",
  --     "file_name": "id_card.jpg",
  --     "file_size": 123456
  --   }
  -- ]
  
  -- Application Status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
  
  -- Review Info
  review_info JSONB,
  -- Example structure:
  -- {
  --   "reviewed_by": "uuid",
  --   "reviewed_at": "2024-01-01T00:00:00Z",
  --   "reviewer_role": "coach",
  --   "notes": "เหตุผล/ความเห็น"
  -- }
  
  -- Activity Log (simple history)
  activity_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Example structure:
  -- [
  --   {
  --     "timestamp": "2024-01-01T00:00:00Z",
  --     "action": "submitted",
  --     "by_user": "uuid",
  --     "by_role": "athlete",
  --     "details": "สมัครเข้าร่วมกีฬา"
  --   }
  -- ]
  
  -- Profile Link (after approval)
  profile_id UUID REFERENCES profiles(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, club_id) -- One active application per user per club
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_applications_user ON membership_applications(user_id);
CREATE INDEX idx_applications_club ON membership_applications(club_id);
CREATE INDEX idx_applications_status ON membership_applications(status);
CREATE INDEX idx_applications_created ON membership_applications(created_at DESC);
CREATE INDEX idx_applications_profile ON membership_applications(profile_id);

-- GIN indexes for JSONB queries
CREATE INDEX idx_applications_personal_info ON membership_applications USING GIN (personal_info);
CREATE INDEX idx_applications_documents ON membership_applications USING GIN (documents);
CREATE INDEX idx_applications_activity_log ON membership_applications USING GIN (activity_log);

-- ============================================================================
-- Storage Bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('membership-documents', 'membership-documents', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Helper Function: Add Activity Log Entry
-- ============================================================================
CREATE OR REPLACE FUNCTION add_activity_log(
  p_application_id UUID,
  p_action TEXT,
  p_by_user UUID,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  v_user_role TEXT;
  v_log_entry JSONB;
BEGIN
  -- Get user role (check coaches, athletes, then user_roles)
  SELECT 'coach' INTO v_user_role
  FROM coaches
  WHERE user_id = p_by_user
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    SELECT 'athlete' INTO v_user_role
    FROM athletes
    WHERE user_id = p_by_user
    LIMIT 1;
  END IF;
  
  IF v_user_role IS NULL THEN
    SELECT role INTO v_user_role
    FROM user_roles
    WHERE user_id = p_by_user
    LIMIT 1;
  END IF;
  
  -- Build log entry
  v_log_entry := jsonb_build_object(
    'timestamp', NOW(),
    'action', p_action,
    'by_user', p_by_user,
    'by_role', COALESCE(v_user_role, 'athlete')
  ) || p_details;
  
  -- Append to activity_log
  UPDATE membership_applications
  SET 
    activity_log = activity_log || v_log_entry,
    updated_at = NOW()
  WHERE id = p_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper Function: Update Application Status
-- ============================================================================
CREATE OR REPLACE FUNCTION update_application_status(
  p_application_id UUID,
  p_new_status TEXT,
  p_reviewed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_old_status TEXT;
  v_reviewer_role TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM membership_applications
  WHERE id = p_application_id;
  
  -- Get reviewer role (check coaches first, then user_roles)
  SELECT 'coach' INTO v_reviewer_role
  FROM coaches
  WHERE user_id = p_reviewed_by
  LIMIT 1;
  
  IF v_reviewer_role IS NULL THEN
    SELECT role INTO v_reviewer_role
    FROM user_roles
    WHERE user_id = p_reviewed_by
    LIMIT 1;
  END IF;
  
  -- Update status
  UPDATE membership_applications
  SET 
    status = p_new_status,
    review_info = jsonb_build_object(
      'reviewed_by', p_reviewed_by,
      'reviewed_at', NOW(),
      'reviewer_role', COALESCE(v_reviewer_role, 'coach'),
      'notes', p_notes
    ),
    updated_at = NOW()
  WHERE id = p_application_id;
  
  -- Log the change
  PERFORM add_activity_log(
    p_application_id,
    'status_changed',
    p_reviewed_by,
    jsonb_build_object(
      'from', v_old_status,
      'to', p_new_status,
      'notes', p_notes
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_membership_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_membership_applications_updated_at
  BEFORE UPDATE ON membership_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_applications_updated_at();

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Membership applications schema created successfully';
  RAISE NOTICE 'Table: membership_applications';
  RAISE NOTICE 'Indexes: 8 indexes created';
  RAISE NOTICE 'Storage bucket: membership-documents';
  RAISE NOTICE 'Helper functions: add_activity_log, update_application_status';
END $$;


-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- Uncomment and run this section to rollback the migration
-- WARNING: This will delete all membership application data

/*

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_update_membership_applications_updated_at ON membership_applications;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_membership_applications_updated_at();

-- Drop helper functions
DROP FUNCTION IF EXISTS update_application_status(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS add_activity_log(UUID, TEXT, UUID, JSONB);

-- Drop indexes
DROP INDEX IF EXISTS idx_applications_activity_log;
DROP INDEX IF EXISTS idx_applications_documents;
DROP INDEX IF EXISTS idx_applications_personal_info;
DROP INDEX IF EXISTS idx_applications_profile;
DROP INDEX IF EXISTS idx_applications_created;
DROP INDEX IF EXISTS idx_applications_status;
DROP INDEX IF EXISTS idx_applications_club;
DROP INDEX IF EXISTS idx_applications_user;

-- Drop table
DROP TABLE IF EXISTS membership_applications CASCADE;

-- Note: Storage bucket 'membership-documents' is NOT automatically deleted
-- To remove it, use Supabase Dashboard or:
-- DELETE FROM storage.buckets WHERE id = 'membership-documents';

*/
