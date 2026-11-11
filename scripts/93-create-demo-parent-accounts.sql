-- สร้างบัญชี Demo สำหรับผู้ปกครอง
-- Migration: 93-create-demo-parent-accounts.sql

-- Password: demo1234 (hashed with bcrypt)
-- Hash: $2b$10$VQyaMC.dls2Ix0yKw0xW8OLJXFVmlQ/1Pbk/DNR5WwnnR4ohS6L1C

DO $$
DECLARE
  v_parent_user_id UUID;
  v_athlete_id UUID;
  v_club_id UUID;
BEGIN
  -- ดึง club_id แรก
  SELECT id INTO v_club_id FROM clubs LIMIT 1;
  
  IF v_club_id IS NULL THEN
    RAISE NOTICE 'ไม่พบสโมสร กรุณาสร้างสโมสรก่อน';
    RETURN;
  END IF;
  
  -- ดึง athlete_id แรก
  SELECT id INTO v_athlete_id FROM athletes WHERE club_id = v_club_id LIMIT 1;
  
  IF v_athlete_id IS NULL THEN
    RAISE NOTICE 'ไม่พบนักกีฬา กรุณาสร้างนักกีฬาก่อน';
    RETURN;
  END IF;
  
  -- ===================================
  -- 1. ลบข้อมูลเก่าทั้งหมด
  -- ===================================
  
  -- ลบ parent_connections ก่อน (เพราะมี foreign key)
  DELETE FROM parent_connections WHERE parent_email = 'parent.demo@example.com';
  
  -- ลบ parent_users
  DELETE FROM parent_users WHERE email = 'parent.demo@example.com';
  
  -- ===================================
  -- 2. สร้าง Parent User Demo
  -- ===================================
  
  -- สร้าง parent_user ใหม่
  INSERT INTO parent_users (
    email,
    password_hash,
    is_active
  ) VALUES (
    'parent.demo@example.com',
    '$2b$10$VQyaMC.dls2Ix0yKw0xW8OLJXFVmlQ/1Pbk/DNR5WwnnR4ohS6L1C', -- demo1234
    TRUE
  )
  RETURNING id INTO v_parent_user_id;
  
  RAISE NOTICE 'สร้าง parent_user: %', v_parent_user_id;
  
  -- ===================================
  -- 3. เชื่อมต่อกับนักกีฬา
  -- ===================================
  
  INSERT INTO parent_connections (
    athlete_id,
    parent_user_id,
    parent_email,
    parent_name,
    relationship,
    phone_number,
    is_verified,
    verified_at,
    is_active
  ) VALUES (
    v_athlete_id,
    v_parent_user_id,
    'parent.demo@example.com',
    'คุณพ่อ Demo',
    'father',
    '081-234-5678',
    TRUE,
    NOW(),
    TRUE
  );
  
  RAISE NOTICE 'เชื่อมต่อกับนักกีฬา: %', v_athlete_id;
  
  -- ===================================
  -- 4. สร้างการแจ้งเตือนตัวอย่าง
  -- ===================================
  
  INSERT INTO parent_notifications (
    parent_connection_id,
    athlete_id,
    type,
    title,
    message,
    data,
    delivery_status
  )
  SELECT 
    pc.id,
    v_athlete_id,
    'attendance',
    'บุตรหลานเข้าฝึกซ้อม',
    'บุตรหลานของคุณเข้าฝึกซ้อมวันนี้เรียบร้อยแล้ว',
    '{"session_date": "2024-01-15"}'::jsonb,
    'sent'
  FROM parent_connections pc
  WHERE pc.parent_user_id = v_parent_user_id
  LIMIT 1;
  
  INSERT INTO parent_notifications (
    parent_connection_id,
    athlete_id,
    type,
    title,
    message,
    data,
    delivery_status
  )
  SELECT 
    pc.id,
    v_athlete_id,
    'performance',
    'มีผลการทดสอบใหม่',
    'บุตรหลานของคุณมีผลการทดสอบวิ่ง 100 เมตร: 12.5 วินาที',
    '{"test_type": "วิ่ง 100 เมตร", "result": "12.5 วินาที"}'::jsonb,
    'sent'
  FROM parent_connections pc
  WHERE pc.parent_user_id = v_parent_user_id
  LIMIT 1;
  
  RAISE NOTICE 'สร้างการแจ้งเตือนตัวอย่างเรียบร้อย';
  
END $$;

-- ===================================
-- สรุป
-- ===================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ สร้างบัญชี Demo ผู้ปกครองสำเร็จ!';
  RAISE NOTICE '';
  RAISE NOTICE '📧 อีเมล: parent.demo@example.com';
  RAISE NOTICE '🔐 รหัสผ่าน: demo1234';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 เข้าสู่ระบบที่: /parent/login';
  RAISE NOTICE '';
END $$;
