-- ============================================================================
-- Migration 41: Create Membership Documents Storage Bucket
-- ============================================================================
-- Description: Creates storage bucket for membership application documents
--              with proper RLS policies for secure file uploads
-- Created: 2024-01-23
-- ============================================================================

-- Create storage bucket for membership documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'membership-documents',
  'membership-documents',
  true, -- Public bucket for easier access
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- ============================================================================
-- RLS Policies for Storage
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Coaches can view documents in their club" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can upload their own documents
-- Path format: {userId}/{documentType}_{timestamp}.{ext}
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'membership-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'membership-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'membership-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'membership-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Coaches can view documents from applications in their club
CREATE POLICY "Coaches can view documents in their club"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'membership-documents' AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'coach'
    AND EXISTS (
      SELECT 1 FROM membership_applications ma
      WHERE ma.athlete_id::text = (storage.foldername(name))[1]
      AND ma.club_id = p.club_id
    )
  )
);

-- Policy 6: Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'membership-documents' AND
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify bucket creation
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'membership-documents';

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%documents%'
ORDER BY policyname;

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 41 completed successfully!';
  RAISE NOTICE '📦 Storage bucket "membership-documents" created';
  RAISE NOTICE '🔒 RLS policies configured for secure file access';
  RAISE NOTICE '📝 Users can now upload documents during registration';
END $$;
