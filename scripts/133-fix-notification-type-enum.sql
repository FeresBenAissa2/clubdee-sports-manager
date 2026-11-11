-- ============================================================================
-- Fix notification_type enum to include 'new_schedule'
-- ============================================================================

-- Check current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'notification_type'::regtype
ORDER BY enumsortorder;

-- Add missing enum values if they don't exist
DO $$
BEGIN
  -- Add 'new_schedule' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'notification_type'::regtype 
    AND enumlabel = 'new_schedule'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'new_schedule';
  END IF;
  
  -- Add 'schedule_reminder' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'notification_type'::regtype 
    AND enumlabel = 'schedule_reminder'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'schedule_reminder';
  END IF;
  
  -- Add 'schedule_cancelled' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'notification_type'::regtype 
    AND enumlabel = 'schedule_cancelled'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'schedule_cancelled';
  END IF;
  
  -- Add 'schedule_updated' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'notification_type'::regtype 
    AND enumlabel = 'schedule_updated'
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'schedule_updated';
  END IF;
END $$;

-- Verify
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'notification_type'::regtype
ORDER BY enumsortorder;
