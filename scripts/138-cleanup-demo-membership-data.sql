-- ============================================================================
-- Migration 138: Cleanup Demo Membership Data
-- ============================================================================
-- Description: ลบข้อมูล demo membership application 
-- เพื่อให้ระบบทำงานตาม logic จริง - แต่ละ user มีใบสมัครของตัวเอง
-- ============================================================================

-- ลบ demo membership applications ที่มี demo documents
DELETE FROM membership_applications 
WHERE documents::text LIKE '%/demo/%';

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Demo membership applications cleaned up';
END $$;
