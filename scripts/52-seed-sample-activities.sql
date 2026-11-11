-- ============================================================================
-- Seed Sample Activities Data
-- ============================================================================
-- This script creates sample activities for testing the activity check-in system
-- ============================================================================

-- Get the first club and coach IDs
DO $$
DECLARE
  v_club_id UUID;
  v_coach_id UUID;
  v_athlete_id UUID;
  v_activity_id UUID;
  v_qr_token VARCHAR(255);
BEGIN
  -- Get first club
  SELECT id INTO v_club_id FROM clubs LIMIT 1;
  
  -- Get first coach
  SELECT id INTO v_coach_id FROM coaches LIMIT 1;
  
  -- Get first athlete
  SELECT id INTO v_athlete_id FROM athletes LIMIT 1;
  
  IF v_club_id IS NULL OR v_coach_id IS NULL THEN
    RAISE NOTICE 'No club or coach found. Please run test data setup first.';
    RETURN;
  END IF;

  -- Delete existing sample activities (optional - for clean slate)
  DELETE FROM activity_checkins WHERE activity_id IN (
    SELECT id FROM activities WHERE title LIKE 'ตัวอย่าง:%'
  );
  DELETE FROM activity_registrations WHERE activity_id IN (
    SELECT id FROM activities WHERE title LIKE 'ตัวอย่าง:%'
  );
  DELETE FROM activities WHERE title LIKE 'ตัวอย่าง:%';

  -- ============================================================================
  -- Upcoming Activities (กิจกรรมที่กำลังจะมาถึง)
  -- ============================================================================

  -- Activity 1: Training session tomorrow
  INSERT INTO activities (
    club_id, coach_id, title, description, activity_type,
    activity_date, start_time, end_time, location,
    max_participants, requires_registration,
    checkin_window_before, checkin_window_after, status
  ) VALUES (
    v_club_id, v_coach_id,
    'ตัวอย่าง: ฝึกซ้อมประจำสัปดาห์',
    'ฝึกซ้อมทักษะพื้นฐานและเทคนิคการเล่น',
    'training',
    CURRENT_DATE + INTERVAL '1 day',
    '16:00:00', '18:00:00',
    'สนามกีฬาหลัก',
    NULL, false,
    30, 15, 'scheduled'
  ) RETURNING id INTO v_activity_id;

  -- Generate QR code for this activity
  SELECT generate_activity_qr_token(v_activity_id) INTO v_qr_token;

  -- Activity 2: Competition next week (requires registration)
  INSERT INTO activities (
    club_id, coach_id, title, description, activity_type,
    activity_date, start_time, end_time, location,
    max_participants, requires_registration,
    checkin_window_before, checkin_window_after, status
  ) VALUES (
    v_club_id, v_coach_id,
    'ตัวอย่าง: การแข่งขันระดับจังหวัด',
    'การแข่งขันกีฬาระดับจังหวัด ต้องลงทะเบียนล่วงหน้า',
    'competition',
    CURRENT_DATE + INTERVAL '7 days',
    '09:00:00', '17:00:00',
    'สนามกีฬากลาง',
    20, true,
    60, 30, 'scheduled'
  ) RETURNING id INTO v_activity_id;

  -- Generate QR code
  SELECT generate_activity_qr_token(v_activity_id) INTO v_qr_token;

  -- Add a pending registration for this activity (if athlete exists)
  IF v_athlete_id IS NOT NULL THEN
    INSERT INTO activity_registrations (
      activity_id, athlete_id, status, athlete_notes
    ) VALUES (
      v_activity_id, v_athlete_id, 'pending',
      'ต้องการเข้าร่วมการแข่งขันครั้งนี้'
    );
  END IF;

  -- Activity 3: Practice session in 3 days
  INSERT INTO activities (
    club_id, coach_id, title, description, activity_type,
    activity_date, start_time, end_time, location,
    max_participants, requires_registration,
    checkin_window_before, checkin_window_after, status
  ) VALUES (
    v_club_id, v_coach_id,
    'ตัวอย่าง: ทดสอบสมรรถภาพ',
    'ทดสอบความแข็งแรงและความอดทน',
    'practice',
    CURRENT_DATE + INTERVAL '3 days',
    '14:00:00', '16:00:00',
    'ห้องฟิตเนส',
    15, true,
    30, 15, 'scheduled'
  ) RETURNING id INTO v_activity_id;

  -- Generate QR code
  SELECT generate_activity_qr_token(v_activity_id) INTO v_qr_token;

  -- Add an approved registration
  IF v_athlete_id IS NOT NULL THEN
    INSERT INTO activity_registrations (
      activity_id, athlete_id, status, 
      approved_by, approved_at, athlete_notes
    ) VALUES (
      v_activity_id, v_athlete_id, 'approved',
      v_coach_id, NOW(), 'พร้อมเข้าร่วมการทดสอบ'
    );
  END IF;

  -- Activity 4: Other activity in 5 days
  INSERT INTO activities (
    club_id, coach_id, title, description, activity_type,
    activity_date, start_time, end_time, location,
    max_participants, requires_registration,
    checkin_window_before, checkin_window_after, status
  ) VALUES (
    v_club_id, v_coach_id,
    'ตัวอย่าง: กิจกรรมสร้างทีม',
    'กิจกรรมสันทนาการและสร้างความสามัคคี',
    'other',
    CURRENT_DATE + INTERVAL '5 days',
    '10:00:00', '15:00:00',
    'ลานกิจกรรม',
    30, false,
    30, 15, 'scheduled'
  );

  -- ============================================================================
  -- Past Activities (กิจกรรมที่ผ่านมา)
  -- ============================================================================

  -- Activity 5: Past training with check-in (on time)
  INSERT INTO activities (
    club_id, coach_id, title, description, activity_type,
    activity_date, start_time, end_time, location,
    max_participants, requires_registration,
    checkin_window_before, checkin_window_after, status
  ) VALUES (
    v_club_id, v_coach_id,
    'ตัวอย่าง: ฝึกซ้อมเมื่อสัปดาห์ที่แล้ว',
    'ฝึกซ้อมทักษะขั้นสูง',
    'training',
    CURRENT_DATE - INTERVAL '7 days',
    '16:00:00', '18:00:00',
    'สนามกีฬาหลัก',
    NULL, false,
    30, 15, 'completed'
  ) RETURNING id INTO v_activity_id;

  -- Add check-in record (on time)
  IF v_athlete_id IS NOT NULL THEN
    INSERT INTO activity_checkins (
      activity_id, athlete_id, status, checkin_method,
      checked_in_at, checked_out_at
    ) VALUES (
      v_activity_id, v_athlete_id, 'on_time', 'qr',
      (CURRENT_DATE - INTERVAL '7 days')::timestamp + TIME '15:45:00',
      (CURRENT_DATE - INTERVAL '7 days')::timestamp + TIME '18:05:00'
    );
  END IF;

  -- Activity 6: Past training with check-in (late)
  INSERT INTO activities (
    club_id, coach_id, title, description, activity_type,
    activity_date, start_time, end_time, location,
    max_participants, requires_registration,
    checkin_window_before, checkin_window_after, status
  ) VALUES (
    v_club_id, v_coach_id,
    'ตัวอย่าง: ฝึกซ้อมเมื่อ 3 วันที่แล้ว',
    'ฝึกซ้อมเทคนิคพิเศษ',
    'training',
    CURRENT_DATE - INTERVAL '3 days',
    '16:00:00', '18:00:00',
    'สนามกีฬาหลัก',
    NULL, false,
    30, 15, 'completed'
  ) RETURNING id INTO v_activity_id;

  -- Add check-in record (late)
  IF v_athlete_id IS NOT NULL THEN
    INSERT INTO activity_checkins (
      activity_id, athlete_id, status, checkin_method,
      checked_in_at, checked_out_at
    ) VALUES (
      v_activity_id, v_athlete_id, 'late', 'qr',
      (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '16:10:00',
      (CURRENT_DATE - INTERVAL '3 days')::timestamp + TIME '18:00:00'
    );
  END IF;

  -- Activity 7: Past competition
  INSERT INTO activities (
    club_id, coach_id, title, description, activity_type,
    activity_date, start_time, end_time, location,
    max_participants, requires_registration,
    checkin_window_before, checkin_window_after, status
  ) VALUES (
    v_club_id, v_coach_id,
    'ตัวอย่าง: การแข่งขันเมื่อเดือนที่แล้ว',
    'การแข่งขันระดับภาค',
    'competition',
    CURRENT_DATE - INTERVAL '30 days',
    '09:00:00', '17:00:00',
    'สนามกีฬากลาง',
    20, true,
    60, 30, 'completed'
  ) RETURNING id INTO v_activity_id;

  -- Add check-in record
  IF v_athlete_id IS NOT NULL THEN
    INSERT INTO activity_checkins (
      activity_id, athlete_id, status, checkin_method,
      checked_in_at, checked_out_at
    ) VALUES (
      v_activity_id, v_athlete_id, 'on_time', 'qr',
      (CURRENT_DATE - INTERVAL '30 days')::timestamp + TIME '08:30:00',
      (CURRENT_DATE - INTERVAL '30 days')::timestamp + TIME '17:15:00'
    );
  END IF;

  -- Activity 8: Past practice
  INSERT INTO activities (
    club_id, coach_id, title, description, activity_type,
    activity_date, start_time, end_time, location,
    max_participants, requires_registration,
    checkin_window_before, checkin_window_after, status
  ) VALUES (
    v_club_id, v_coach_id,
    'ตัวอย่าง: ทดสอบสมรรถภาพเมื่อ 2 สัปดาห์ที่แล้ว',
    'ทดสอบความเร็วและความแข็งแรง',
    'practice',
    CURRENT_DATE - INTERVAL '14 days',
    '14:00:00', '16:00:00',
    'ห้องฟิตเนส',
    15, true,
    30, 15, 'completed'
  ) RETURNING id INTO v_activity_id;

  -- Add check-in record
  IF v_athlete_id IS NOT NULL THEN
    INSERT INTO activity_checkins (
      activity_id, athlete_id, status, checkin_method,
      checked_in_at, checked_out_at
    ) VALUES (
      v_activity_id, v_athlete_id, 'on_time', 'manual',
      (CURRENT_DATE - INTERVAL '14 days')::timestamp + TIME '13:55:00',
      (CURRENT_DATE - INTERVAL '14 days')::timestamp + TIME '16:10:00'
    );
  END IF;

  RAISE NOTICE 'Sample activities created successfully!';
  RAISE NOTICE 'Club ID: %', v_club_id;
  RAISE NOTICE 'Coach ID: %', v_coach_id;
  RAISE NOTICE 'Athlete ID: %', v_athlete_id;

END $$;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Show created activities
SELECT 
  a.title,
  a.activity_type,
  a.activity_date,
  a.start_time,
  a.status,
  a.requires_registration,
  CASE 
    WHEN a.qr_code_token IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_qr_code,
  COUNT(DISTINCT ar.id) as registration_count,
  COUNT(DISTINCT ac.id) as checkin_count
FROM activities a
LEFT JOIN activity_registrations ar ON ar.activity_id = a.id
LEFT JOIN activity_checkins ac ON ac.activity_id = a.id
WHERE a.title LIKE 'ตัวอย่าง:%'
GROUP BY a.id, a.title, a.activity_type, a.activity_date, a.start_time, a.status, a.requires_registration, a.qr_code_token
ORDER BY a.activity_date DESC;
