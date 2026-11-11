-- ============================================================================
-- Migration 137: Seed Demo Membership Application Data
-- ============================================================================
-- Description: เพิ่มข้อมูลใบสมัครตัวอย่างสำหรับ demo athlete
-- ============================================================================

-- Get demo athlete user_id and club_id
DO $$
DECLARE
  v_athlete_user_id UUID;
  v_club_id UUID;
  v_existing_app UUID;
BEGIN
  -- Find demo athlete
  SELECT user_id, club_id INTO v_athlete_user_id, v_club_id
  FROM athletes
  WHERE email LIKE '%demo%' OR email LIKE '%test%'
  LIMIT 1;

  IF v_athlete_user_id IS NULL THEN
    -- Try to find any athlete
    SELECT user_id, club_id INTO v_athlete_user_id, v_club_id
    FROM athletes
    LIMIT 1;
  END IF;

  IF v_athlete_user_id IS NOT NULL AND v_club_id IS NOT NULL THEN
    -- Check if application already exists
    SELECT id INTO v_existing_app
    FROM membership_applications
    WHERE user_id = v_athlete_user_id AND club_id = v_club_id;

    IF v_existing_app IS NULL THEN
      -- Insert demo membership application
      INSERT INTO membership_applications (
        user_id,
        club_id,
        personal_info,
        documents,
        status,
        review_info,
        activity_log,
        created_at
      ) VALUES (
        v_athlete_user_id,
        v_club_id,
        jsonb_build_object(
          'full_name', 'นายทดสอบ ตัวอย่าง',
          'phone_number', '081-234-5678',
          'address', '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
          'emergency_contact', '089-999-8888',
          'date_of_birth', '2010-01-15',
          'gender', 'male',
          'school', 'โรงเรียนตัวอย่างวิทยา',
          'blood_type', 'O',
          'allergies', 'ไม่มี',
          'medical_conditions', 'ไม่มี'
        ),
        jsonb_build_array(
          jsonb_build_object(
            'type', 'id_card',
            'url', '/demo/id_card_demo.svg',
            'file_name', 'บัตรประชาชน.jpg',
            'uploaded_at', NOW()
          ),
          jsonb_build_object(
            'type', 'house_registration',
            'url', '/demo/house_reg_demo.svg',
            'file_name', 'ทะเบียนบ้าน.jpg',
            'uploaded_at', NOW()
          ),
          jsonb_build_object(
            'type', 'medical_certificate',
            'url', '/demo/medical_cert_demo.svg',
            'file_name', 'ใบรับรองแพทย์.pdf',
            'uploaded_at', NOW()
          ),
          jsonb_build_object(
            'type', 'photo',
            'url', '/demo/photo_demo.svg',
            'file_name', 'รูปถ่าย_2นิ้ว.jpg',
            'uploaded_at', NOW()
          ),
          jsonb_build_object(
            'type', 'parent_consent',
            'url', '/demo/parent_consent_demo.svg',
            'file_name', 'หนังสือยินยอมผู้ปกครอง.pdf',
            'uploaded_at', NOW()
          )
        ),
        'approved',
        jsonb_build_object(
          'reviewed_at', NOW(),
          'notes', 'เอกสารครบถ้วน อนุมัติเข้าร่วมสโมสร'
        ),
        jsonb_build_array(
          jsonb_build_object(
            'timestamp', NOW() - INTERVAL '7 days',
            'action', 'submitted',
            'by_role', 'athlete',
            'details', 'ส่งใบสมัครเข้าร่วมสโมสร'
          ),
          jsonb_build_object(
            'timestamp', NOW() - INTERVAL '5 days',
            'action', 'status_changed',
            'by_role', 'coach',
            'details', 'อนุมัติใบสมัคร'
          )
        ),
        NOW() - INTERVAL '7 days'
      );
      
      RAISE NOTICE 'Demo membership application created successfully';
    ELSE
      RAISE NOTICE 'Demo membership application already exists';
    END IF;
  ELSE
    RAISE NOTICE 'No athlete found to create demo application';
  END IF;
END $$;
