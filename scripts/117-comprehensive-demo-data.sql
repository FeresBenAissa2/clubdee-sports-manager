-- ============================================================================
-- Migration 117: Comprehensive Demo Data for All Features
-- ============================================================================
-- Description: Creates complete demo data enabling testing of all features
-- across different user roles (Admin, Coach, Athlete, Parent)
-- 
-- Prerequisites: Run 116-create-demo-auth-users.sql first
-- ============================================================================

-- ============================================================================
-- Demo User IDs (from auth.users)
-- ============================================================================
-- Club:         d1e2f3a4-b5c6-7890-abcd-ef1234567890
-- Admin User:   a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- Coach User:   b2c3d4e5-f6a7-8901-bcde-f12345678901
-- Athlete User: c3d4e5f6-a7b8-9012-cdef-123456789012

-- ============================================================================
-- 1. Ensure Demo Club Exists
-- ============================================================================
INSERT INTO public.clubs (
  id, name, description, created_at, updated_at
) VALUES (
  'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  'ClubDee Demo',
  'สโมสรสาธิตสำหรับทดสอบระบบ - Demo club for testing all features',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- 2. Create Demo Parent User
-- ============================================================================
-- Password: Demo123456! (same as other demo users)
INSERT INTO public.parent_users (
  id,
  email,
  password_hash,
  is_active,
  created_at,
  updated_at
) VALUES (
  'd4e5f6a7-b8c9-0123-def0-234567890123',
  'demo.parent@clubdee.com',
  '$2b$10$aHwiH7HrA8ZLf3W2xUotQO3umyO8GZvkMagjPlwF13VK.cEgaudAi',
  TRUE,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = TRUE,
  updated_at = NOW();

-- ============================================================================
-- 3. Disable ALL notification triggers temporarily (to avoid enum issues)
-- ============================================================================
DO $$
BEGIN
  -- Disable training session trigger
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_new_training_session') THEN
    ALTER TABLE training_sessions DISABLE TRIGGER trigger_notify_new_training_session;
  END IF;
  -- Disable announcement trigger
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_new_announcement') THEN
    ALTER TABLE announcements DISABLE TRIGGER trigger_notify_new_announcement;
  END IF;
  -- Disable performance record trigger
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_new_performance_record') THEN
    ALTER TABLE performance_records DISABLE TRIGGER trigger_notify_new_performance_record;
  END IF;
  -- Disable parent notification triggers
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_parent_performance') THEN
    ALTER TABLE performance_records DISABLE TRIGGER trigger_notify_parent_performance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_parent_goal') THEN
    ALTER TABLE athlete_goals DISABLE TRIGGER trigger_notify_parent_goal;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_parent_absence') THEN
    ALTER TABLE attendance_logs DISABLE TRIGGER trigger_notify_parent_absence;
  END IF;
END $$;

-- ============================================================================
-- 4. Create All Demo Data Using DO Block (to get actual IDs)
-- ============================================================================
DO $$
DECLARE
  v_athlete_id UUID;
  v_coach_id UUID;
  v_club_id UUID := 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';
  v_parent_user_id UUID := 'd4e5f6a7-b8c9-0123-def0-234567890123';
  v_parent_connection_id UUID;
  v_session_id_1 UUID;
  v_session_id_2 UUID;
  v_session_id_3 UUID;
BEGIN
  -- Get actual athlete ID from athletes table
  SELECT id INTO v_athlete_id FROM public.athletes 
  WHERE user_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  
  -- Get actual coach ID from coaches table
  SELECT id INTO v_coach_id FROM public.coaches 
  WHERE user_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  
  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'Demo athlete not found. Run 116-create-demo-auth-users.sql first.';
  END IF;
  
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Demo coach not found. Run 116-create-demo-auth-users.sql first.';
  END IF;
  
  RAISE NOTICE 'Using athlete_id: %, coach_id: %', v_athlete_id, v_coach_id;

  -- ========================================================================
  -- 3.1 Create Parent-Athlete Connection
  -- ========================================================================
  v_parent_connection_id := 'e5f6a7b8-c9d0-1234-ef01-345678901234';
  
  INSERT INTO public.parent_connections (
    id, athlete_id, parent_user_id, parent_email, parent_name,
    relationship, phone_number, is_verified, verified_at, is_active,
    notify_attendance, notify_performance, notify_leave_requests,
    notify_announcements, notify_goals, notification_frequency,
    created_at, updated_at
  ) VALUES (
    v_parent_connection_id, v_athlete_id, v_parent_user_id,
    'demo.parent@clubdee.com', 'คุณพ่อ Demo', 'father', '081-234-5678',
    TRUE, NOW(), TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'immediate', NOW(), NOW()
  ) ON CONFLICT (athlete_id, parent_email) DO UPDATE SET
    parent_user_id = EXCLUDED.parent_user_id,
    parent_name = EXCLUDED.parent_name,
    is_verified = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  -- ========================================================================
  -- 3.2 Create Training Sessions
  -- ========================================================================
  v_session_id_1 := 'f6a7b8c9-d0e1-2345-f012-456789012345';
  v_session_id_2 := 'a7b8c9d0-e1f2-3456-0123-567890123456';
  v_session_id_3 := 'b8c9d0e1-f2a3-4567-1234-678901234567';

  -- Past Session 1 (7 days ago)
  INSERT INTO public.training_sessions (
    id, club_id, coach_id, title, description, session_date,
    start_time, end_time, location, max_participants, status,
    created_by, created_at, updated_at
  ) VALUES (
    v_session_id_1, v_club_id, 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'ฝึกซ้อมพื้นฐาน - Basic Training', 'ฝึกซ้อมทักษะพื้นฐานแบดมินตัน',
    CURRENT_DATE - INTERVAL '7 days', '09:00:00', '11:00:00',
    'สนามแบดมินตัน A', 20, 'completed',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901', NOW() - INTERVAL '14 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET status = 'completed', updated_at = NOW();

  -- Past Session 2 (3 days ago)
  INSERT INTO public.training_sessions (
    id, club_id, coach_id, title, description, session_date,
    start_time, end_time, location, max_participants, status,
    created_by, created_at, updated_at
  ) VALUES (
    v_session_id_2, v_club_id, 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'ฝึกซ้อมเทคนิค - Technique Training', 'ฝึกซ้อมเทคนิคการตีลูก',
    CURRENT_DATE - INTERVAL '3 days', '14:00:00', '16:00:00',
    'สนามแบดมินตัน B', 15, 'completed',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901', NOW() - INTERVAL '10 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET status = 'completed', updated_at = NOW();

  -- Today's Session
  INSERT INTO public.training_sessions (
    id, club_id, coach_id, title, description, session_date,
    start_time, end_time, location, max_participants, status,
    created_by, created_at, updated_at
  ) VALUES (
    v_session_id_3, v_club_id, 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'ฝึกซ้อมวันนี้ - Today Training', 'ฝึกซ้อมประจำวัน',
    CURRENT_DATE, '10:00:00', '12:00:00',
    'สนามแบดมินตัน A', 20, 'scheduled',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901', NOW() - INTERVAL '7 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET session_date = CURRENT_DATE, status = 'scheduled', updated_at = NOW();

  -- Future Session 1 (3 days from now)
  INSERT INTO public.training_sessions (
    id, club_id, coach_id, title, description, session_date,
    start_time, end_time, location, max_participants, status,
    created_by, created_at, updated_at
  ) VALUES (
    'c9d0e1f2-a3b4-5678-2345-789012345678', v_club_id, 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'ฝึกซ้อมแข่งขัน - Competition Training', 'เตรียมความพร้อมสำหรับการแข่งขัน',
    CURRENT_DATE + INTERVAL '3 days', '09:00:00', '12:00:00',
    'สนามแบดมินตัน A', 15, 'scheduled',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901', NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET session_date = CURRENT_DATE + INTERVAL '3 days', updated_at = NOW();

  -- Future Session 2 (7 days from now)
  INSERT INTO public.training_sessions (
    id, club_id, coach_id, title, description, session_date,
    start_time, end_time, location, max_participants, status,
    created_by, created_at, updated_at
  ) VALUES (
    'd0e1f2a3-b4c5-6789-3456-890123456789', v_club_id, 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'ฝึกซ้อมพิเศษ - Special Training', 'ฝึกซ้อมพิเศษสำหรับนักกีฬาตัวแทน',
    CURRENT_DATE + INTERVAL '7 days', '14:00:00', '17:00:00',
    'สนามแบดมินตัน B', 10, 'scheduled',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901', NOW(), NOW()
  ) ON CONFLICT (id) DO UPDATE SET session_date = CURRENT_DATE + INTERVAL '7 days', updated_at = NOW();


  -- ========================================================================
  -- 3.3 Create Announcements from Demo Coach
  -- ========================================================================
  INSERT INTO public.announcements (
    id, coach_id, title, message, priority, target_audience, is_pinned,
    created_at, updated_at
  ) VALUES (
    'e1f2a3b4-c5d6-7890-4567-901234567890', v_coach_id,
    'ยินดีต้อนรับสู่ ClubDee Demo',
    'ยินดีต้อนรับนักกีฬาทุกคนสู่สโมสร ClubDee Demo! นี่คือประกาศตัวอย่างสำหรับทดสอบระบบ',
    'normal', 'all', TRUE, NOW() - INTERVAL '7 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW();

  INSERT INTO public.announcements (
    id, coach_id, title, message, priority, target_audience, is_pinned,
    created_at, updated_at
  ) VALUES (
    'f2a3b4c5-d6e7-8901-5678-012345678901', v_coach_id,
    'ตารางฝึกซ้อมประจำสัปดาห์',
    'แจ้งตารางฝึกซ้อมประจำสัปดาห์นี้: จันทร์-พุธ-ศุกร์ 09:00-11:00 ฝึกพื้นฐาน',
    'high', 'athletes', FALSE, NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, priority = 'high', updated_at = NOW();

  INSERT INTO public.announcements (
    id, coach_id, title, message, priority, target_audience, is_pinned,
    created_at, updated_at
  ) VALUES (
    'a3b4c5d6-e7f8-9012-6789-123456789012', v_coach_id,
    'การแข่งขันรายการสำคัญ',
    'แจ้งนักกีฬาที่สนใจเข้าร่วมการแข่งขันรายการ Demo Tournament ในเดือนหน้า',
    'urgent', 'athletes', TRUE, NOW() - INTERVAL '1 day', NOW()
  ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, priority = 'urgent', updated_at = NOW();

  -- ========================================================================
  -- 3.4 Create Attendance Records for Demo Athlete
  -- ========================================================================
  INSERT INTO public.attendance (
    id, session_id, athlete_id, status, check_in_time, check_in_method,
    notes, marked_by, created_at, updated_at
  ) VALUES (
    'b4c5d6e7-f8a9-0123-7890-234567890123', v_session_id_1,
    'c3d4e5f6-a7b8-9012-cdef-123456789012', 'present',
    (CURRENT_DATE - INTERVAL '7 days')::timestamp + TIME '09:05:00',
    'manual', 'มาตรงเวลา ฝึกซ้อมดี',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901', NOW() - INTERVAL '7 days', NOW()
  ) ON CONFLICT (session_id, athlete_id) DO UPDATE SET status = 'present', updated_at = NOW();

  INSERT INTO public.attendance (
    id, session_id, athlete_id, status, check_in_time, check_in_method,
    notes, marked_by, created_at, updated_at
  ) VALUES (
    'c5d6e7f8-a9b0-1234-8901-345678901234', v_session_id_2,
    'c3d4e5f6-a7b8-9012-cdef-123456789012', 'late',
    (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '14:20:00',
    'manual', 'มาสาย 20 นาที แต่ฝึกซ้อมเต็มที่',
    'b2c3d4e5-f6a7-8901-bcde-f12345678901', NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT (session_id, athlete_id) DO UPDATE SET status = 'late', updated_at = NOW();

  -- ========================================================================
  -- 3.5 Create Performance Records for Demo Athlete
  -- ========================================================================
  INSERT INTO public.performance_records (
    id, athlete_id, coach_id, test_date, test_type, result_value, result_unit,
    notes, coach_notes, created_at, updated_at
  ) VALUES (
    'd6e7f8a9-b0c1-2345-9012-456789012345', v_athlete_id, v_coach_id,
    CURRENT_DATE - INTERVAL '14 days', 'วิ่ง 100 เมตร', 13.50, 'วินาที',
    'ทดสอบความเร็วพื้นฐาน', 'ผลดี มีพัฒนาการจากครั้งก่อน',
    NOW() - INTERVAL '14 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET result_value = EXCLUDED.result_value, updated_at = NOW();

  INSERT INTO public.performance_records (
    id, athlete_id, coach_id, test_date, test_type, result_value, result_unit,
    notes, coach_notes, created_at, updated_at
  ) VALUES (
    'e7f8a9b0-c1d2-3456-0123-567890123456', v_athlete_id, v_coach_id,
    CURRENT_DATE - INTERVAL '7 days', 'วิ่ง 100 เมตร', 13.20, 'วินาที',
    'ทดสอบความเร็วครั้งที่ 2', 'พัฒนาขึ้น 0.3 วินาที ดีมาก!',
    NOW() - INTERVAL '7 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET result_value = EXCLUDED.result_value, updated_at = NOW();

  INSERT INTO public.performance_records (
    id, athlete_id, coach_id, test_date, test_type, result_value, result_unit,
    notes, coach_notes, created_at, updated_at
  ) VALUES (
    'f8a9b0c1-d2e3-4567-1234-678901234567', v_athlete_id, v_coach_id,
    CURRENT_DATE - INTERVAL '5 days', 'ทดสอบความคล่องตัว (Shuttle Run)', 11.80, 'วินาที',
    'ทดสอบความคล่องตัวในการเคลื่อนที่', 'ความคล่องตัวดี เหมาะกับการเล่นแบดมินตัน',
    NOW() - INTERVAL '5 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET result_value = EXCLUDED.result_value, updated_at = NOW();

  INSERT INTO public.performance_records (
    id, athlete_id, coach_id, test_date, test_type, result_value, result_unit,
    notes, coach_notes, created_at, updated_at
  ) VALUES (
    'a9b0c1d2-e3f4-5678-2345-789012345678', v_athlete_id, v_coach_id,
    CURRENT_DATE - INTERVAL '3 days', 'วิ่ง 1.5 กม.', 7.30, 'นาที',
    'ทดสอบความอดทน', 'ความอดทนอยู่ในเกณฑ์ดี ควรเพิ่มการฝึกคาร์ดิโอ',
    NOW() - INTERVAL '3 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET result_value = EXCLUDED.result_value, updated_at = NOW();


  -- ========================================================================
  -- 3.6 Create Athlete Goals for Demo Athlete
  -- ========================================================================
  INSERT INTO public.athlete_goals (
    id, athlete_id, coach_id, title, description, category,
    target_value, target_unit, current_value, progress_percentage,
    status, priority, start_date, target_date, created_at, updated_at
  ) VALUES (
    'b0c1d2e3-f4a5-6789-3456-890123456789', v_athlete_id, v_coach_id,
    'พัฒนาความเร็ว 100 เมตร', 'ลดเวลาวิ่ง 100 เมตรให้ต่ำกว่า 13 วินาที',
    'performance', 13.00, 'วินาที', 13.20, 60, 'active', 'high',
    CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '30 days',
    NOW() - INTERVAL '14 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET current_value = EXCLUDED.current_value, updated_at = NOW();

  INSERT INTO public.athlete_goals (
    id, athlete_id, coach_id, title, description, category,
    target_value, target_unit, current_value, progress_percentage,
    status, priority, start_date, target_date, created_at, updated_at
  ) VALUES (
    'c1d2e3f4-a5b6-7890-4567-901234567890', v_athlete_id, v_coach_id,
    'เข้าฝึกซ้อมครบ 90%', 'เข้าร่วมการฝึกซ้อมอย่างน้อย 90% ของทั้งหมด',
    'attendance', 90.00, 'เปอร์เซ็นต์', 75.00, 83, 'active', 'medium',
    CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days',
    NOW() - INTERVAL '30 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET current_value = EXCLUDED.current_value, updated_at = NOW();

  INSERT INTO public.athlete_goals (
    id, athlete_id, coach_id, title, description, category,
    target_value, target_unit, current_value, progress_percentage,
    status, priority, start_date, target_date, completed_at, created_at, updated_at
  ) VALUES (
    'd2e3f4a5-b6c7-8901-5678-012345678901', v_athlete_id, v_coach_id,
    'เรียนรู้เทคนิคสแมช', 'ฝึกเทคนิคการตีสแมชให้ถูกต้องและมีพลัง',
    'skill', 100.00, 'เปอร์เซ็นต์', 100.00, 100, 'completed', 'high',
    CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '7 days',
    NOW() - INTERVAL '7 days', NOW() - INTERVAL '60 days', NOW()
  ) ON CONFLICT (id) DO UPDATE SET status = 'completed', progress_percentage = 100, updated_at = NOW();

  -- ========================================================================
  -- 3.7 Create Parent Notifications (Sample)
  -- ========================================================================
  INSERT INTO public.parent_notifications (
    id, parent_connection_id, athlete_id, type, title, message,
    data, delivery_status, sent_at, created_at
  ) VALUES (
    'e3f4a5b6-c7d8-9012-6789-123456789012', v_parent_connection_id, v_athlete_id,
    'attendance', 'บุตรหลานเข้าฝึกซ้อม', 'บุตรหลานของคุณเข้าฝึกซ้อมวันนี้เรียบร้อยแล้ว',
    '{"session_date": "2024-01-15", "status": "present"}'::jsonb,
    'sent', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.parent_notifications (
    id, parent_connection_id, athlete_id, type, title, message,
    data, delivery_status, sent_at, created_at
  ) VALUES (
    'f4a5b6c7-d8e9-0123-7890-234567890123', v_parent_connection_id, v_athlete_id,
    'performance', 'มีผลการทดสอบใหม่', 'บุตรหลานของคุณมีผลการทดสอบวิ่ง 100 เมตร: 13.20 วินาที',
    '{"test_type": "วิ่ง 100 เมตร", "result": "13.20 วินาที"}'::jsonb,
    'sent', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.parent_notifications (
    id, parent_connection_id, athlete_id, type, title, message,
    data, delivery_status, sent_at, created_at
  ) VALUES (
    'a5b6c7d8-e9f0-1234-8901-345678901234', v_parent_connection_id, v_athlete_id,
    'goal', 'บรรลุเป้าหมาย! 🎉', 'ยินดีด้วย! บุตรหลานของคุณบรรลุเป้าหมาย: เรียนรู้เทคนิคสแมช',
    '{"goal_title": "เรียนรู้เทคนิคสแมช"}'::jsonb,
    'sent', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
  ) ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Demo data created successfully!';
END $$;

-- ============================================================================
-- 5. Re-enable ALL notification triggers
-- ============================================================================
DO $$
BEGIN
  -- Re-enable training session trigger
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_new_training_session') THEN
    ALTER TABLE training_sessions ENABLE TRIGGER trigger_notify_new_training_session;
  END IF;
  -- Re-enable announcement trigger
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_new_announcement') THEN
    ALTER TABLE announcements ENABLE TRIGGER trigger_notify_new_announcement;
  END IF;
  -- Re-enable performance record trigger
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_new_performance_record') THEN
    ALTER TABLE performance_records ENABLE TRIGGER trigger_notify_new_performance_record;
  END IF;
  -- Re-enable parent notification triggers
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_parent_performance') THEN
    ALTER TABLE performance_records ENABLE TRIGGER trigger_notify_parent_performance;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_parent_goal') THEN
    ALTER TABLE athlete_goals ENABLE TRIGGER trigger_notify_parent_goal;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_parent_absence') THEN
    ALTER TABLE attendance_logs ENABLE TRIGGER trigger_notify_parent_absence;
  END IF;
END $$;

-- ============================================================================
-- 6. Verification Queries
-- ============================================================================
SELECT '=== Demo Data Verification ===' as section;

SELECT 'Club' as entity, COUNT(*) as count 
FROM public.clubs WHERE id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

SELECT 'Coach' as entity, COUNT(*) as count 
FROM public.coaches WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

SELECT 'Athlete' as entity, COUNT(*) as count 
FROM public.athletes WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

SELECT 'Training Sessions' as entity, COUNT(*) as count 
FROM public.training_sessions WHERE club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

SELECT 'Announcements' as entity, COUNT(*) as count 
FROM public.announcements a
JOIN public.coaches c ON a.coach_id = c.id
WHERE c.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

SELECT 'Performance Records' as entity, COUNT(*) as count 
FROM public.performance_records pr
JOIN public.athletes a ON pr.athlete_id = a.id
WHERE a.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

SELECT 'Athlete Goals' as entity, COUNT(*) as count 
FROM public.athlete_goals ag
JOIN public.athletes a ON ag.athlete_id = a.id
WHERE a.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

SELECT 'Parent User' as entity, COUNT(*) as count 
FROM public.parent_users WHERE email = 'demo.parent@clubdee.com';

SELECT 'Parent Connection' as entity, COUNT(*) as count 
FROM public.parent_connections pc
JOIN public.athletes a ON pc.athlete_id = a.id
WHERE a.club_id = 'd1e2f3a4-b5c6-7890-abcd-ef1234567890';

-- Summary
SELECT '=== Demo Login Credentials ===' as section;
SELECT 
  'Admin: demo.admin@clubdee.com / Demo123456!' as admin,
  'Coach: demo.coach@clubdee.com / Demo123456!' as coach,
  'Athlete: demo.athlete@clubdee.com / Demo123456!' as athlete,
  'Parent: demo.parent@clubdee.com / Demo123456!' as parent;
