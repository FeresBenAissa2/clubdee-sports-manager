-- Seed test announcements for testing
-- This script creates sample announcements from existing coaches

-- Insert test announcements for each coach
INSERT INTO public.announcements (coach_id, title, message, priority, is_pinned)
SELECT 
  c.id,
  'ประกาศทดสอบ: การฝึกซ้อมสัปดาห์นี้',
  'เรียนนักกีฬาทุกคน' || E'\n\n' ||
  'ขอแจ้งตารางการฝึกซ้อมในสัปดาห์นี้ดังนี้:' || E'\n' ||
  '- วันจันทร์: ฝึกพื้นฐาน 16:00-18:00' || E'\n' ||
  '- วันพุธ: ฝึกเทคนิค 16:00-18:00' || E'\n' ||
  '- วันศุกร์: ฝึกแข่งขัน 16:00-18:00' || E'\n\n' ||
  'กรุณามาให้ตรงเวลา และเตรียมอุปกรณ์ให้พร้อม',
  'normal',
  false
FROM public.coaches c
WHERE NOT EXISTS (
  SELECT 1 FROM public.announcements a 
  WHERE a.coach_id = c.id 
  AND a.title = 'ประกาศทดสอบ: การฝึกซ้อมสัปดาห์นี้'
)
LIMIT 1;

-- Insert urgent announcement
INSERT INTO public.announcements (coach_id, title, message, priority, is_pinned)
SELECT 
  c.id,
  'เร่งด่วน: เปลี่ยนสถานที่ฝึกซ้อมวันนี้',
  'แจ้งนักกีฬาทุกคนทราบ' || E'\n\n' ||
  'เนื่องจากสนามหลักมีการซ่อมแซม วันนี้จะย้ายไปฝึกที่สนาม 2 แทน' || E'\n\n' ||
  'เวลาเดิม: 16:00 น.' || E'\n' ||
  'สถานที่: สนามกีฬา 2 (ด้านหลังอาคาร A)',
  'urgent',
  true
FROM public.coaches c
WHERE NOT EXISTS (
  SELECT 1 FROM public.announcements a 
  WHERE a.coach_id = c.id 
  AND a.title = 'เร่งด่วน: เปลี่ยนสถานที่ฝึกซ้อมวันนี้'
)
LIMIT 1;

-- Insert high priority announcement
INSERT INTO public.announcements (coach_id, title, message, priority, is_pinned)
SELECT 
  c.id,
  'สำคัญ: การแข่งขันเดือนหน้า',
  'เรียนนักกีฬาที่สนใจเข้าร่วมการแข่งขัน' || E'\n\n' ||
  'จะมีการแข่งขันระดับจังหวัดในเดือนหน้า' || E'\n' ||
  'ผู้ที่สนใจกรุณาแจ้งความประสงค์ภายในวันศุกร์นี้' || E'\n\n' ||
  'รายละเอียด:' || E'\n' ||
  '- วันที่: 15-17 ธันวาคม 2567' || E'\n' ||
  '- สถานที่: สนามกีฬากลางจังหวัด' || E'\n' ||
  '- ค่าใช้จ่าย: 500 บาท (รวมค่าเดินทาง)',
  'high',
  true
FROM public.coaches c
WHERE NOT EXISTS (
  SELECT 1 FROM public.announcements a 
  WHERE a.coach_id = c.id 
  AND a.title = 'สำคัญ: การแข่งขันเดือนหน้า'
)
LIMIT 1;

-- Insert low priority announcement
INSERT INTO public.announcements (coach_id, title, message, priority, is_pinned)
SELECT 
  c.id,
  'แจ้งเตือน: อุปกรณ์การฝึก',
  'เรียนนักกีฬาทุกคน' || E'\n\n' ||
  'ขอให้ตรวจสอบอุปกรณ์การฝึกของตัวเอง' || E'\n' ||
  'หากมีอุปกรณ์ชำรุดหรือต้องการเปลี่ยน กรุณาแจ้งโค้ช' || E'\n\n' ||
  'ขอบคุณครับ',
  'low',
  false
FROM public.coaches c
WHERE NOT EXISTS (
  SELECT 1 FROM public.announcements a 
  WHERE a.coach_id = c.id 
  AND a.title = 'แจ้งเตือน: อุปกรณ์การฝึก'
)
LIMIT 1;

-- Verify the data
SELECT 
  a.id,
  a.title,
  a.priority,
  a.is_pinned,
  c.first_name || ' ' || c.last_name as coach_name,
  c.club_id
FROM public.announcements a
JOIN public.coaches c ON c.id = a.coach_id
ORDER BY a.created_at DESC
LIMIT 10;
