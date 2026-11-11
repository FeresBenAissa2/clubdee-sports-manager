-- ============================================================================
-- Membership Applications - RLS Policies
-- ============================================================================
-- Description: Row Level Security policies สำหรับระบบสมัครสมาชิก
-- Author: System
-- Created: 2024-11-22
-- ============================================================================

-- ============================================================================
-- Enable RLS
-- ============================================================================
ALTER TABLE membership_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Drop existing policies if any
-- ============================================================================
DROP POLICY IF EXISTS "Athletes can create applications" ON membership_applications;
DROP POLICY IF EXISTS "Athletes can view own applications" ON membership_applications;
DROP POLICY IF EXISTS "Coaches can view club applications" ON membership_applications;
DROP POLICY IF EXISTS "Coaches can review club applications" ON membership_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON membership_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON membership_applications;

-- ============================================================================
-- Athlete Policies
-- ============================================================================

-- Athletes can insert their own applications
CREATE POLICY "Athletes can create applications"
ON membership_applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Athletes can view their own applications
CREATE POLICY "Athletes can view own applications"
ON membership_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- Coach Policies
-- ============================================================================

-- Coaches can view applications for their clubs
CREATE POLICY "Coaches can view club applications"
ON membership_applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM coaches
    WHERE coaches.user_id = auth.uid()
    AND coaches.club_id = membership_applications.club_id
  )
);

-- Coaches can update applications for their clubs
CREATE POLICY "Coaches can review club applications"
ON membership_applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM coaches
    WHERE coaches.user_id = auth.uid()
    AND coaches.club_id = membership_applications.club_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM coaches
    WHERE coaches.user_id = auth.uid()
    AND coaches.club_id = membership_applications.club_id
  )
);

-- ============================================================================
-- Admin Policies
-- ============================================================================

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON membership_applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can update all applications
CREATE POLICY "Admins can update all applications"
ON membership_applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- ============================================================================
-- Storage Policies
-- ============================================================================

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can view club applicant documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;

-- Users can upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'membership-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'membership-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Coaches can view documents of applicants to their clubs
CREATE POLICY "Coaches can view club applicant documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'membership-documents'
  AND EXISTS (
    SELECT 1 FROM membership_applications ma
    JOIN coaches c ON c.user_id = auth.uid()
    WHERE ma.user_id::text = (storage.foldername(name))[1]
    AND ma.club_id = c.club_id
  )
);

-- Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'membership-documents'
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
  storage_policy_count INTEGER;
BEGIN
  -- Count table policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'membership_applications';
  
  -- Count storage policies
  SELECT COUNT(*) INTO storage_policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
  AND policyname LIKE '%documents%';
  
  RAISE NOTICE 'RLS policies created successfully';
  RAISE NOTICE 'Table policies: %', policy_count;
  RAISE NOTICE 'Storage policies: %', storage_policy_count;
  
  IF policy_count < 6 THEN
    RAISE WARNING 'Expected 6 table policies, found %', policy_count;
  END IF;
  
  IF storage_policy_count < 4 THEN
    RAISE WARNING 'Expected 4 storage policies, found %', storage_policy_count;
  END IF;
END $$;
