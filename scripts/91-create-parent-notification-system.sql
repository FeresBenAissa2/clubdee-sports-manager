-- ระบบแจ้งเตือนผู้ปกครอง (Parent Notification System)
-- Migration: 91-create-parent-notification-system.sql

-- ===================================
-- 1. ตาราง parent_connections
-- ===================================

CREATE TABLE IF NOT EXISTS parent_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  
  -- Parent information
  parent_email TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian')),
  phone_number TEXT,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT UNIQUE,
  verification_sent_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  
  -- Notification preferences
  notify_attendance BOOLEAN DEFAULT TRUE,
  notify_performance BOOLEAN DEFAULT TRUE,
  notify_leave_requests BOOLEAN DEFAULT TRUE,
  notify_announcements BOOLEAN DEFAULT TRUE,
  notify_goals BOOLEAN DEFAULT TRUE,
  notification_frequency TEXT DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(athlete_id, parent_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parent_connections_athlete ON parent_connections(athlete_id);
CREATE INDEX IF NOT EXISTS idx_parent_connections_email ON parent_connections(parent_email);
CREATE INDEX IF NOT EXISTS idx_parent_connections_verified ON parent_connections(is_verified, is_active);
CREATE INDEX IF NOT EXISTS idx_parent_connections_token ON parent_connections(verification_token) WHERE verification_token IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_parent_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_connections_updated_at
BEFORE UPDATE ON parent_connections
FOR EACH ROW
EXECUTE FUNCTION update_parent_connections_updated_at();

-- ===================================
-- 2. ตาราง parent_notifications
-- ===================================

CREATE TABLE IF NOT EXISTS parent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_connection_id UUID NOT NULL REFERENCES parent_connections(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN ('attendance', 'performance', 'leave', 'announcement', 'goal', 'report')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  
  -- Delivery
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'sms', 'line')),
  error_message TEXT,
  
  -- Tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parent_notifications_connection ON parent_notifications(parent_connection_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_athlete ON parent_notifications(athlete_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_status ON parent_notifications(delivery_status, sent_at);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_type ON parent_notifications(type, sent_at);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_created ON parent_notifications(created_at DESC);

-- ===================================
-- 3. ตาราง parent_reports
-- ===================================

CREATE TABLE IF NOT EXISTS parent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_connection_id UUID NOT NULL REFERENCES parent_connections(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  
  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Statistics
  total_sessions INTEGER DEFAULT 0,
  attended_sessions INTEGER DEFAULT 0,
  attendance_rate DECIMAL(5,2),
  absent_sessions INTEGER DEFAULT 0,
  leave_requests INTEGER DEFAULT 0,
  
  -- Performance
  performance_tests INTEGER DEFAULT 0,
  performance_improvements INTEGER DEFAULT 0,
  
  -- Goals
  active_goals INTEGER DEFAULT 0,
  completed_goals INTEGER DEFAULT 0,
  
  -- Coach feedback
  coach_feedback TEXT,
  
  -- Report data (JSON)
  report_data JSONB,
  
  -- Delivery
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parent_reports_connection ON parent_reports(parent_connection_id);
CREATE INDEX IF NOT EXISTS idx_parent_reports_athlete ON parent_reports(athlete_id);
CREATE INDEX IF NOT EXISTS idx_parent_reports_period ON parent_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_parent_reports_type ON parent_reports(report_type, created_at DESC);

-- ===================================
-- 4. Triggers สำหรับการแจ้งเตือนอัตโนมัติ
-- ===================================

-- 4.1 แจ้งเตือนเมื่อขาดฝึก
CREATE OR REPLACE FUNCTION notify_parent_absence()
RETURNS TRIGGER AS $$
BEGIN
  -- ถ้าขาดฝึกโดยไม่แจ้งลา
  IF NEW.status = 'absent' THEN
    INSERT INTO parent_notifications (
      parent_connection_id,
      athlete_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      pc.id,
      NEW.athlete_id,
      'attendance',
      'บุตรหลานขาดฝึก',
      'บุตรหลานของคุณขาดการฝึกซ้อมในวันที่ ' || TO_CHAR(NEW.session_date, 'DD/MM/YYYY'),
      jsonb_build_object(
        'attendance_log_id', NEW.id,
        'session_id', NEW.session_id,
        'session_date', NEW.session_date,
        'status', NEW.status
      )
    FROM parent_connections pc
    WHERE pc.athlete_id = NEW.athlete_id
      AND pc.is_verified = TRUE
      AND pc.is_active = TRUE
      AND pc.notify_attendance = TRUE
      AND pc.notification_frequency = 'immediate';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_parent_absence ON attendance_logs;
CREATE TRIGGER trigger_notify_parent_absence
AFTER INSERT OR UPDATE ON attendance_logs
FOR EACH ROW
EXECUTE FUNCTION notify_parent_absence();

-- 4.2 แจ้งเตือนผลการทดสอบใหม่
CREATE OR REPLACE FUNCTION notify_parent_performance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO parent_notifications (
    parent_connection_id,
    athlete_id,
    type,
    title,
    message,
    data
  )
  SELECT 
    pc.id,
    NEW.athlete_id,
    'performance',
    'มีผลการทดสอบใหม่',
    'บุตรหลานของคุณมีผลการทดสอบ ' || NEW.test_type || ' ใหม่: ' || NEW.result_value || ' ' || COALESCE(NEW.result_unit, ''),
    jsonb_build_object(
      'performance_id', NEW.id,
      'test_type', NEW.test_type,
      'result_value', NEW.result_value,
      'result_unit', NEW.result_unit,
      'test_date', NEW.test_date,
      'coach_notes', NEW.coach_notes
    )
  FROM parent_connections pc
  WHERE pc.athlete_id = NEW.athlete_id
    AND pc.is_verified = TRUE
    AND pc.is_active = TRUE
    AND pc.notify_performance = TRUE
    AND pc.notification_frequency = 'immediate';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_parent_performance ON performance_records;
CREATE TRIGGER trigger_notify_parent_performance
AFTER INSERT ON performance_records
FOR EACH ROW
EXECUTE FUNCTION notify_parent_performance();

-- 4.3 แจ้งเตือนคำขอลา
CREATE OR REPLACE FUNCTION notify_parent_leave_request()
RETURNS TRIGGER AS $$
BEGIN
  -- เมื่อยื่นคำขอลา
  IF TG_OP = 'INSERT' THEN
    INSERT INTO parent_notifications (
      parent_connection_id,
      athlete_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      pc.id,
      NEW.athlete_id,
      'leave',
      'บุตรหลานยื่นคำขอลา',
      'บุตรหลานของคุณยื่นคำขอลาฝึกซ้อม เหตุผล: ' || NEW.reason,
      jsonb_build_object(
        'leave_request_id', NEW.id,
        'session_id', NEW.session_id,
        'reason', NEW.reason,
        'status', NEW.status,
        'requested_at', NEW.requested_at
      )
    FROM parent_connections pc
    WHERE pc.athlete_id = NEW.athlete_id
      AND pc.is_verified = TRUE
      AND pc.is_active = TRUE
      AND pc.notify_leave_requests = TRUE
      AND pc.notification_frequency = 'immediate';
  
  -- เมื่ออนุมัติ/ปฏิเสธ
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO parent_notifications (
      parent_connection_id,
      athlete_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      pc.id,
      NEW.athlete_id,
      'leave',
      CASE 
        WHEN NEW.status = 'approved' THEN 'คำขอลาได้รับอนุมัติ'
        WHEN NEW.status = 'rejected' THEN 'คำขอลาถูกปฏิเสธ'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'คำขอลาของบุตรหลานได้รับอนุมัติแล้ว'
        WHEN NEW.status = 'rejected' THEN 'คำขอลาของบุตรหลานถูกปฏิเสธ' || 
          CASE WHEN NEW.review_notes IS NOT NULL THEN ' เหตุผล: ' || NEW.review_notes ELSE '' END
      END,
      jsonb_build_object(
        'leave_request_id', NEW.id,
        'session_id', NEW.session_id,
        'status', NEW.status,
        'review_notes', NEW.review_notes,
        'reviewed_at', NEW.reviewed_at
      )
    FROM parent_connections pc
    WHERE pc.athlete_id = NEW.athlete_id
      AND pc.is_verified = TRUE
      AND pc.is_active = TRUE
      AND pc.notify_leave_requests = TRUE
      AND pc.notification_frequency = 'immediate';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_parent_leave_request ON leave_requests;
CREATE TRIGGER trigger_notify_parent_leave_request
AFTER INSERT OR UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION notify_parent_leave_request();

-- 4.4 แจ้งเตือนเป้าหมายใหม่
CREATE OR REPLACE FUNCTION notify_parent_goal()
RETURNS TRIGGER AS $$
BEGIN
  -- เมื่อสร้างเป้าหมายใหม่
  IF TG_OP = 'INSERT' THEN
    INSERT INTO parent_notifications (
      parent_connection_id,
      athlete_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      pc.id,
      NEW.athlete_id,
      'goal',
      'โค้ชตั้งเป้าหมายใหม่',
      'โค้ชได้ตั้งเป้าหมายใหม่ให้บุตรหลาน: ' || NEW.title,
      jsonb_build_object(
        'goal_id', NEW.id,
        'title', NEW.title,
        'description', NEW.description,
        'category', NEW.category,
        'target_date', NEW.target_date,
        'priority', NEW.priority
      )
    FROM parent_connections pc
    WHERE pc.athlete_id = NEW.athlete_id
      AND pc.is_verified = TRUE
      AND pc.is_active = TRUE
      AND pc.notify_goals = TRUE
      AND pc.notification_frequency = 'immediate';
  
  -- เมื่อบรรลุเป้าหมาย
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    INSERT INTO parent_notifications (
      parent_connection_id,
      athlete_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      pc.id,
      NEW.athlete_id,
      'goal',
      'บรรลุเป้าหมาย! 🎉',
      'ยินดีด้วย! บุตรหลานของคุณบรรลุเป้าหมาย: ' || NEW.title,
      jsonb_build_object(
        'goal_id', NEW.id,
        'title', NEW.title,
        'completed_at', NEW.completed_at,
        'progress_percentage', NEW.progress_percentage
      )
    FROM parent_connections pc
    WHERE pc.athlete_id = NEW.athlete_id
      AND pc.is_verified = TRUE
      AND pc.is_active = TRUE
      AND pc.notify_goals = TRUE
      AND pc.notification_frequency = 'immediate';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_parent_goal ON athlete_goals;
CREATE TRIGGER trigger_notify_parent_goal
AFTER INSERT OR UPDATE ON athlete_goals
FOR EACH ROW
EXECUTE FUNCTION notify_parent_goal();

-- 4.5 แจ้งเตือนประกาศสำคัญ
CREATE OR REPLACE FUNCTION notify_parent_announcement()
RETURNS TRIGGER AS $$
BEGIN
  -- เฉพาะประกาศที่มีความสำคัญสูงหรือเร่งด่วน
  IF NEW.priority IN ('high', 'urgent') THEN
    INSERT INTO parent_notifications (
      parent_connection_id,
      athlete_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      pc.id,
      a.id,
      'announcement',
      CASE 
        WHEN NEW.priority = 'urgent' THEN '⚠️ ประกาศเร่งด่วน'
        ELSE '📢 ประกาศสำคัญ'
      END,
      NEW.title || ': ' || LEFT(NEW.message, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'announcement_id', NEW.id,
        'title', NEW.title,
        'priority', NEW.priority,
        'created_at', NEW.created_at
      )
    FROM parent_connections pc
    JOIN athletes a ON a.id = pc.athlete_id
    WHERE a.club_id = NEW.club_id
      AND pc.is_verified = TRUE
      AND pc.is_active = TRUE
      AND pc.notify_announcements = TRUE
      AND pc.notification_frequency = 'immediate';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_parent_announcement ON announcements;
CREATE TRIGGER trigger_notify_parent_announcement
AFTER INSERT ON announcements
FOR EACH ROW
EXECUTE FUNCTION notify_parent_announcement();

-- ===================================
-- 5. RLS Policies
-- ===================================

-- parent_connections
ALTER TABLE parent_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes can view their parent connections" ON parent_connections;
CREATE POLICY "Athletes can view their parent connections"
ON parent_connections FOR SELECT
TO authenticated
USING (
  athlete_id IN (
    SELECT id FROM athletes WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Athletes can add parent connections" ON parent_connections;
CREATE POLICY "Athletes can add parent connections"
ON parent_connections FOR INSERT
TO authenticated
WITH CHECK (
  athlete_id IN (
    SELECT id FROM athletes WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Athletes can update their parent connections" ON parent_connections;
CREATE POLICY "Athletes can update their parent connections"
ON parent_connections FOR UPDATE
TO authenticated
USING (
  athlete_id IN (
    SELECT id FROM athletes WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Athletes can delete their parent connections" ON parent_connections;
CREATE POLICY "Athletes can delete their parent connections"
ON parent_connections FOR DELETE
TO authenticated
USING (
  athlete_id IN (
    SELECT id FROM athletes WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Coaches can view parent connections in their club" ON parent_connections;
CREATE POLICY "Coaches can view parent connections in their club"
ON parent_connections FOR SELECT
TO authenticated
USING (
  athlete_id IN (
    SELECT a.id FROM athletes a
    JOIN coaches c ON c.club_id = a.club_id
    WHERE c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage all parent connections" ON parent_connections;
CREATE POLICY "Admins can manage all parent connections"
ON parent_connections FOR ALL
TO authenticated
USING (public.is_admin());

-- parent_notifications
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all parent notifications" ON parent_notifications;
CREATE POLICY "Admins can view all parent notifications"
ON parent_notifications FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Coaches can view parent notifications in their club" ON parent_notifications;
CREATE POLICY "Coaches can view parent notifications in their club"
ON parent_notifications FOR SELECT
TO authenticated
USING (
  athlete_id IN (
    SELECT a.id FROM athletes a
    JOIN coaches c ON c.club_id = a.club_id
    WHERE c.user_id = auth.uid()
  )
);

-- parent_reports
ALTER TABLE parent_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all parent reports" ON parent_reports;
CREATE POLICY "Admins can manage all parent reports"
ON parent_reports FOR ALL
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Coaches can view parent reports in their club" ON parent_reports;
CREATE POLICY "Coaches can view parent reports in their club"
ON parent_reports FOR SELECT
TO authenticated
USING (
  athlete_id IN (
    SELECT a.id FROM athletes a
    JOIN coaches c ON c.club_id = a.club_id
    WHERE c.user_id = auth.uid()
  )
);

-- ===================================
-- 6. Helper Functions
-- ===================================

-- ฟังก์ชันสร้างรายงานรายสัปดาห์
CREATE OR REPLACE FUNCTION generate_weekly_parent_report(
  p_athlete_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
  v_total_sessions INTEGER;
  v_attended_sessions INTEGER;
  v_absent_sessions INTEGER;
  v_leave_requests INTEGER;
  v_performance_tests INTEGER;
  v_active_goals INTEGER;
  v_completed_goals INTEGER;
  v_attendance_rate DECIMAL(5,2);
BEGIN
  -- คำนวณสถิติ
  SELECT COUNT(*) INTO v_total_sessions
  FROM attendance_logs
  WHERE athlete_id = p_athlete_id
    AND session_date BETWEEN p_period_start AND p_period_end;
  
  SELECT COUNT(*) INTO v_attended_sessions
  FROM attendance_logs
  WHERE athlete_id = p_athlete_id
    AND session_date BETWEEN p_period_start AND p_period_end
    AND status = 'present';
  
  SELECT COUNT(*) INTO v_absent_sessions
  FROM attendance_logs
  WHERE athlete_id = p_athlete_id
    AND session_date BETWEEN p_period_start AND p_period_end
    AND status = 'absent';
  
  SELECT COUNT(*) INTO v_leave_requests
  FROM leave_requests
  WHERE athlete_id = p_athlete_id
    AND requested_at::DATE BETWEEN p_period_start AND p_period_end;
  
  SELECT COUNT(*) INTO v_performance_tests
  FROM performance_records
  WHERE athlete_id = p_athlete_id
    AND test_date BETWEEN p_period_start AND p_period_end;
  
  SELECT COUNT(*) INTO v_active_goals
  FROM athlete_goals
  WHERE athlete_id = p_athlete_id
    AND status = 'active';
  
  SELECT COUNT(*) INTO v_completed_goals
  FROM athlete_goals
  WHERE athlete_id = p_athlete_id
    AND completed_at::DATE BETWEEN p_period_start AND p_period_end;
  
  -- คำนวณอัตราการเข้าฝึก
  IF v_total_sessions > 0 THEN
    v_attendance_rate := (v_attended_sessions::DECIMAL / v_total_sessions) * 100;
  ELSE
    v_attendance_rate := 0;
  END IF;
  
  -- สร้างรายงานสำหรับผู้ปกครองทุกคน
  INSERT INTO parent_reports (
    parent_connection_id,
    athlete_id,
    report_type,
    period_start,
    period_end,
    total_sessions,
    attended_sessions,
    attendance_rate,
    absent_sessions,
    leave_requests,
    performance_tests,
    active_goals,
    completed_goals
  )
  SELECT 
    pc.id,
    p_athlete_id,
    'weekly',
    p_period_start,
    p_period_end,
    v_total_sessions,
    v_attended_sessions,
    v_attendance_rate,
    v_absent_sessions,
    v_leave_requests,
    v_performance_tests,
    v_active_goals,
    v_completed_goals
  FROM parent_connections pc
  WHERE pc.athlete_id = p_athlete_id
    AND pc.is_verified = TRUE
    AND pc.is_active = TRUE
  RETURNING id INTO v_report_id;
  
  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 7. Comments
-- ===================================

COMMENT ON TABLE parent_connections IS 'เก็บข้อมูลการเชื่อมต่อระหว่างนักกีฬาและผู้ปกครอง';
COMMENT ON TABLE parent_notifications IS 'เก็บประวัติการแจ้งเตือนที่ส่งให้ผู้ปกครอง';
COMMENT ON TABLE parent_reports IS 'เก็บรายงานความก้าวหน้าที่ส่งให้ผู้ปกครอง';

-- ===================================
-- สรุป
-- ===================================

DO $$
BEGIN
  RAISE NOTICE '✅ Parent Notification System created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - parent_connections';
  RAISE NOTICE '  - parent_notifications';
  RAISE NOTICE '  - parent_reports';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created:';
  RAISE NOTICE '  - notify_parent_absence';
  RAISE NOTICE '  - notify_parent_performance';
  RAISE NOTICE '  - notify_parent_leave_request';
  RAISE NOTICE '  - notify_parent_goal';
  RAISE NOTICE '  - notify_parent_announcement';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies: ✅ Enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create UI components for parent management';
  RAISE NOTICE '  2. Implement email sending service';
  RAISE NOTICE '  3. Test notification triggers';
END $$;
