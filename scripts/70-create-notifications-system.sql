-- Create notifications system for push notifications
-- This enables real-time notifications for athletes about schedules, announcements, and test results

-- Notification types enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'new_schedule',
    'schedule_reminder',
    'announcement',
    'test_result',
    'leave_approved',
    'leave_rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Optional references for context
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  performance_id UUID REFERENCES performance_records(id) ON DELETE CASCADE,
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins manage all notifications"
  ON notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Function to create notification for new training session
CREATE OR REPLACE FUNCTION notify_new_training_session()
RETURNS TRIGGER AS $$
DECLARE
  athlete_record RECORD;
  club_name TEXT;
BEGIN
  -- Get club name
  SELECT name INTO club_name FROM clubs WHERE id = NEW.club_id;
  
  -- Notify all athletes in the club
  FOR athlete_record IN 
    SELECT a.id, a.user_id 
    FROM athletes a 
    WHERE a.club_id = NEW.club_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, session_id)
    VALUES (
      athlete_record.user_id,
      'new_schedule',
      'ตารางฝึกใหม่',
      format('มีการฝึกซ้อม "%s" วันที่ %s เวลา %s', 
        NEW.session_name,
        TO_CHAR(NEW.session_date, 'DD/MM/YYYY'),
        NEW.start_time
      ),
      format('/dashboard/athlete/schedule/%s', NEW.id),
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new training sessions
DROP TRIGGER IF EXISTS trigger_notify_new_training_session ON training_sessions;
CREATE TRIGGER trigger_notify_new_training_session
  AFTER INSERT ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_training_session();

-- Function to create notification for new announcement
CREATE OR REPLACE FUNCTION notify_new_announcement()
RETURNS TRIGGER AS $$
DECLARE
  athlete_record RECORD;
BEGIN
  -- Notify all athletes in the club
  FOR athlete_record IN 
    SELECT a.id, a.user_id 
    FROM athletes a 
    WHERE a.club_id = NEW.club_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, announcement_id)
    VALUES (
      athlete_record.user_id,
      'announcement',
      format('ประกาศใหม่: %s', NEW.title),
      NEW.message,
      '/dashboard/athlete/announcements',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new announcements
DROP TRIGGER IF EXISTS trigger_notify_new_announcement ON announcements;
CREATE TRIGGER trigger_notify_new_announcement
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_announcement();

-- Function to create notification for new performance record
CREATE OR REPLACE FUNCTION notify_new_performance_record()
RETURNS TRIGGER AS $$
DECLARE
  athlete_user_id UUID;
BEGIN
  -- Get athlete's user_id
  SELECT user_id INTO athlete_user_id 
  FROM athletes 
  WHERE id = NEW.athlete_id;
  
  -- Notify the athlete
  INSERT INTO notifications (user_id, type, title, message, link, performance_id)
  VALUES (
    athlete_user_id,
    'test_result',
    'ผลการทดสอบใหม่',
    format('คุณมีผลการทดสอบ "%s" ใหม่: %s %s', 
      NEW.test_type,
      NEW.result_value,
      NEW.result_unit
    ),
    '/dashboard/athlete/performance',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new performance records
DROP TRIGGER IF EXISTS trigger_notify_new_performance_record ON performance_records;
CREATE TRIGGER trigger_notify_new_performance_record
  AFTER INSERT ON performance_records
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_performance_record();

-- Function to create notification for leave request status
CREATE OR REPLACE FUNCTION notify_leave_request_status()
RETURNS TRIGGER AS $$
DECLARE
  athlete_user_id UUID;
  session_name TEXT;
  session_date TEXT;
BEGIN
  -- Only notify on status change to approved or rejected
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    -- Get athlete's user_id
    SELECT user_id INTO athlete_user_id 
    FROM athletes 
    WHERE id = NEW.athlete_id;
    
    -- Get session details
    SELECT 
      ts.session_name,
      TO_CHAR(ts.session_date, 'DD/MM/YYYY')
    INTO session_name, session_date
    FROM training_sessions ts
    WHERE ts.id = NEW.session_id;
    
    -- Notify the athlete
    INSERT INTO notifications (user_id, type, title, message, link, leave_request_id)
    VALUES (
      athlete_user_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'leave_approved'
        ELSE 'leave_rejected'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'คำขอลาได้รับการอนุมัติ'
        ELSE 'คำขอลาถูกปฏิเสธ'
      END,
      format('คำขอลาสำหรับ "%s" วันที่ %s %s', 
        session_name,
        session_date,
        CASE 
          WHEN NEW.status = 'approved' THEN 'ได้รับการอนุมัติแล้ว'
          ELSE 'ถูกปฏิเสธ'
        END
      ),
      format('/dashboard/athlete/schedule/%s', NEW.session_id),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for leave request status changes
DROP TRIGGER IF EXISTS trigger_notify_leave_request_status ON leave_requests;
CREATE TRIGGER trigger_notify_leave_request_status
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_leave_request_status();

-- Function to send reminder notifications (to be called by cron job)
CREATE OR REPLACE FUNCTION send_session_reminders()
RETURNS void AS $$
DECLARE
  session_record RECORD;
  athlete_record RECORD;
BEGIN
  -- Find sessions starting in 1 hour
  FOR session_record IN 
    SELECT ts.id, ts.session_name, ts.session_date, ts.start_time, ts.club_id
    FROM training_sessions ts
    WHERE ts.session_date::date = CURRENT_DATE
    AND ts.start_time::time - CURRENT_TIME BETWEEN interval '55 minutes' AND interval '65 minutes'
  LOOP
    -- Notify all athletes in the club who haven't been notified yet
    FOR athlete_record IN 
      SELECT a.id, a.user_id 
      FROM athletes a 
      WHERE a.club_id = session_record.club_id
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = a.user_id
        AND n.session_id = session_record.id
        AND n.type = 'schedule_reminder'
        AND n.created_at > NOW() - interval '2 hours'
      )
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, session_id)
      VALUES (
        athlete_record.user_id,
        'schedule_reminder',
        'เตือนความจำ: การฝึกซ้อมใกล้เข้ามาแล้ว',
        format('"%s" จะเริ่มในอีก 1 ชั่วโมง เวลา %s', 
          session_record.session_name,
          session_record.start_time
        ),
        format('/dashboard/athlete/schedule/%s', session_record.id),
        session_record.id
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE notifications IS 'Stores push notifications for users';
COMMENT ON FUNCTION send_session_reminders() IS 'Sends reminder notifications 1 hour before training sessions (should be called by cron job every 5-10 minutes)';


-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- Uncomment and run this section to rollback the migration
-- WARNING: This will delete all notification data

/*

-- Drop function
DROP FUNCTION IF EXISTS send_session_reminders();

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_notify_leave_request_status ON leave_requests;
DROP TRIGGER IF EXISTS trigger_notify_new_performance_record ON performance_records;
DROP TRIGGER IF EXISTS trigger_notify_new_announcement ON announcements;
DROP TRIGGER IF EXISTS trigger_notify_new_training_session ON training_sessions;

-- Drop trigger functions
DROP FUNCTION IF EXISTS notify_leave_request_status();
DROP FUNCTION IF EXISTS notify_new_performance_record();
DROP FUNCTION IF EXISTS notify_new_announcement();
DROP FUNCTION IF EXISTS notify_new_training_session();

-- Drop RLS policies
DROP POLICY IF EXISTS "Admins manage all notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;

-- Disable RLS
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Drop indexes
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_notifications_type;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_read;
DROP INDEX IF EXISTS idx_notifications_user_id;

-- Drop table
DROP TABLE IF EXISTS notifications CASCADE;

-- Drop enum
DROP TYPE IF EXISTS notification_type;

*/
