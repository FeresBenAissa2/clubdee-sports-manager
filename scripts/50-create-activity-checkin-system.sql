-- ============================================================================
-- Activity Check-in System with QR Code Support
-- ============================================================================
-- Features:
-- 1. Activity types (training, competition, practice, other)
-- 2. QR code generation for check-in points
-- 3. Time tracking (check-in, check-out)
-- 4. Status tracking (on-time, late, absent)
-- 5. Pre-registration system with coach approval
-- ============================================================================

-- Activity Types Enum
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('training', 'competition', 'practice', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Registration Status Enum
DO $$ BEGIN
  CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Table: activities
-- Stores activity/event information with QR code support
-- ============================================================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  
  -- Activity Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_type activity_type NOT NULL DEFAULT 'training',
  
  -- Schedule
  activity_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  
  -- Capacity Management
  max_participants INTEGER,
  requires_registration BOOLEAN DEFAULT false,
  
  -- QR Code for Check-in
  qr_code_token VARCHAR(255) UNIQUE,
  qr_code_expires_at TIMESTAMPTZ,
  
  -- Check-in Window (minutes before/after start time)
  checkin_window_before INTEGER DEFAULT 30, -- 30 minutes before
  checkin_window_after INTEGER DEFAULT 15,  -- 15 minutes after
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_checkin_windows CHECK (
    checkin_window_before >= 0 AND 
    checkin_window_after >= 0
  )
);

-- ============================================================================
-- Table: activity_registrations
-- Pre-registration system for activities
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  
  -- Registration Status
  status registration_status DEFAULT 'pending',
  
  -- Approval Info
  approved_by UUID REFERENCES coaches(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Notes
  athlete_notes TEXT, -- Why athlete wants to join
  coach_notes TEXT,   -- Coach's notes about the registration
  
  -- Metadata
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(activity_id, athlete_id) -- One registration per athlete per activity
);

-- ============================================================================
-- Table: activity_checkins
-- Check-in/out records for activities
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  
  -- Check-in/out Times
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) NOT NULL CHECK (status IN ('on_time', 'late', 'absent')),
  
  -- Check-in Method
  checkin_method VARCHAR(50) DEFAULT 'qr' CHECK (checkin_method IN ('qr', 'manual', 'auto')),
  
  -- QR Code Verification
  qr_token_used VARCHAR(255),
  
  -- Manual Override (if coach marks manually)
  marked_by UUID REFERENCES coaches(id) ON DELETE SET NULL,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(activity_id, athlete_id), -- One check-in per athlete per activity
  CONSTRAINT valid_checkout_time CHECK (
    checked_out_at IS NULL OR checked_out_at > checked_in_at
  )
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_club_date 
  ON activities(club_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_activities_coach 
  ON activities(coach_id) WHERE coach_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_qr_token 
  ON activities(qr_code_token) WHERE qr_code_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_status_date 
  ON activities(status, activity_date) WHERE status != 'cancelled';

-- Registrations indexes
CREATE INDEX IF NOT EXISTS idx_registrations_activity 
  ON activity_registrations(activity_id, status);

CREATE INDEX IF NOT EXISTS idx_registrations_athlete 
  ON activity_registrations(athlete_id, status);

CREATE INDEX IF NOT EXISTS idx_registrations_pending 
  ON activity_registrations(activity_id) WHERE status = 'pending';

-- Check-ins indexes
CREATE INDEX IF NOT EXISTS idx_checkins_activity 
  ON activity_checkins(activity_id, status);

CREATE INDEX IF NOT EXISTS idx_checkins_athlete 
  ON activity_checkins(athlete_id, checked_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkins_date 
  ON activity_checkins(checked_in_at DESC);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_registrations_updated_at ON activity_registrations;
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON activity_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checkins_updated_at ON activity_checkins;
CREATE TRIGGER update_checkins_updated_at
  BEFORE UPDATE ON activity_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Generate QR code token for activity
CREATE OR REPLACE FUNCTION generate_activity_qr_token(p_activity_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_token VARCHAR(255);
BEGIN
  -- Generate unique token: activity_id + timestamp + random
  v_token := encode(
    digest(
      p_activity_id::text || NOW()::text || random()::text,
      'sha256'
    ),
    'hex'
  );
  
  -- Update activity with token (expires in 24 hours)
  UPDATE activities
  SET 
    qr_code_token = v_token,
    qr_code_expires_at = NOW() + INTERVAL '24 hours',
    updated_at = NOW()
  WHERE id = p_activity_id;
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate check-in time window
CREATE OR REPLACE FUNCTION is_checkin_window_valid(
  p_activity_id UUID,
  p_checkin_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_activity RECORD;
  v_start_datetime TIMESTAMPTZ;
  v_earliest_checkin TIMESTAMPTZ;
  v_latest_checkin TIMESTAMPTZ;
BEGIN
  -- Get activity details
  SELECT 
    activity_date,
    start_time,
    checkin_window_before,
    checkin_window_after
  INTO v_activity
  FROM activities
  WHERE id = p_activity_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Calculate start datetime
  v_start_datetime := v_activity.activity_date + v_activity.start_time;
  
  -- Calculate check-in window
  v_earliest_checkin := v_start_datetime - (v_activity.checkin_window_before || ' minutes')::INTERVAL;
  v_latest_checkin := v_start_datetime + (v_activity.checkin_window_after || ' minutes')::INTERVAL;
  
  -- Check if current time is within window
  RETURN p_checkin_time BETWEEN v_earliest_checkin AND v_latest_checkin;
END;
$$ LANGUAGE plpgsql;

-- Determine check-in status (on_time or late)
CREATE OR REPLACE FUNCTION determine_checkin_status(
  p_activity_id UUID,
  p_checkin_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VARCHAR AS $$
DECLARE
  v_activity RECORD;
  v_start_datetime TIMESTAMPTZ;
BEGIN
  -- Get activity details
  SELECT activity_date, start_time
  INTO v_activity
  FROM activities
  WHERE id = p_activity_id;
  
  IF NOT FOUND THEN
    RETURN 'absent';
  END IF;
  
  -- Calculate start datetime
  v_start_datetime := v_activity.activity_date + v_activity.start_time;
  
  -- Determine status
  IF p_checkin_time <= v_start_datetime THEN
    RETURN 'on_time';
  ELSE
    RETURN 'late';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Get registration count for activity
CREATE OR REPLACE FUNCTION get_activity_registration_count(p_activity_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM activity_registrations
    WHERE activity_id = p_activity_id
      AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql;

-- Check if activity is full
CREATE OR REPLACE FUNCTION is_activity_full(p_activity_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_participants INTEGER;
  v_current_count INTEGER;
BEGIN
  SELECT max_participants INTO v_max_participants
  FROM activities
  WHERE id = p_activity_id;
  
  -- If no limit, never full
  IF v_max_participants IS NULL THEN
    RETURN false;
  END IF;
  
  v_current_count := get_activity_registration_count(p_activity_id);
  
  RETURN v_current_count >= v_max_participants;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE activities IS 'Activities/events with QR code check-in support';
COMMENT ON TABLE activity_registrations IS 'Pre-registration system for activities requiring approval';
COMMENT ON TABLE activity_checkins IS 'Check-in/out records with time tracking';

COMMENT ON FUNCTION generate_activity_qr_token IS 'Generate unique QR code token for activity check-in';
COMMENT ON FUNCTION is_checkin_window_valid IS 'Validate if current time is within check-in window';
COMMENT ON FUNCTION determine_checkin_status IS 'Determine if check-in is on-time or late';
COMMENT ON FUNCTION get_activity_registration_count IS 'Get approved registration count for activity';
COMMENT ON FUNCTION is_activity_full IS 'Check if activity has reached max participants';


-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- Uncomment and run this section to rollback the migration
-- WARNING: This will delete all activity check-in data

/*

-- Drop helper functions
DROP FUNCTION IF EXISTS is_activity_full(UUID);
DROP FUNCTION IF EXISTS get_activity_registration_count(UUID);
DROP FUNCTION IF EXISTS determine_checkin_status(UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS is_checkin_window_valid(UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS generate_activity_qr_token(UUID);

-- Drop triggers
DROP TRIGGER IF EXISTS update_checkins_updated_at ON activity_checkins;
DROP TRIGGER IF EXISTS update_registrations_updated_at ON activity_registrations;
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;

-- Note: update_updated_at_column() function is shared, don't drop it

-- Drop indexes
DROP INDEX IF EXISTS idx_checkins_date;
DROP INDEX IF EXISTS idx_checkins_athlete;
DROP INDEX IF EXISTS idx_checkins_activity;
DROP INDEX IF EXISTS idx_registrations_pending;
DROP INDEX IF EXISTS idx_registrations_athlete;
DROP INDEX IF EXISTS idx_registrations_activity;
DROP INDEX IF EXISTS idx_activities_status_date;
DROP INDEX IF EXISTS idx_activities_qr_token;
DROP INDEX IF EXISTS idx_activities_coach;
DROP INDEX IF EXISTS idx_activities_club_date;

-- Drop tables
DROP TABLE IF EXISTS activity_checkins CASCADE;
DROP TABLE IF EXISTS activity_registrations CASCADE;
DROP TABLE IF EXISTS activities CASCADE;

-- Drop enums
DROP TYPE IF EXISTS registration_status;
DROP TYPE IF EXISTS activity_type;

*/
