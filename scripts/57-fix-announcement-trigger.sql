-- Fix notify_parent_announcement trigger to work without club_id in announcements table

DROP TRIGGER IF EXISTS trigger_notify_parent_announcement ON announcements;
DROP FUNCTION IF EXISTS notify_parent_announcement();

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
    JOIN coaches c ON c.club_id = a.club_id
    WHERE c.id = NEW.coach_id  -- Join through coach instead of using NEW.club_id
      AND pc.is_verified = TRUE
      AND pc.is_active = TRUE
      AND pc.notify_announcements = TRUE
      AND pc.notification_frequency = 'immediate';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_parent_announcement
AFTER INSERT ON announcements
FOR EACH ROW
EXECUTE FUNCTION notify_parent_announcement();
