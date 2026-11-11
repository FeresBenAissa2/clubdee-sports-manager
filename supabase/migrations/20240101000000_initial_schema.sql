-- Initial Database Schema for Sports Club Management System
-- This migration creates all tables, enums, indexes, and triggers

-- Create custom enum types
CREATE TYPE user_role AS ENUM ('admin', 'coach', 'athlete');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE check_in_method AS ENUM ('manual', 'qr', 'auto');
CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- ============================================================================
-- USER ROLES TABLE
-- ============================================================================
-- This table stores the role mapping for users
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'athlete',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CLUBS TABLE
-- ============================================================================
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sport_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT clubs_name_unique UNIQUE (name)
);

-- ============================================================================
-- ATHLETES TABLE
-- ============================================================================
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(100),
  date_of_birth DATE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  health_notes TEXT,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT athletes_user_id_unique UNIQUE (user_id),
  CONSTRAINT athletes_email_unique UNIQUE (email),
  CONSTRAINT athletes_date_of_birth_check CHECK (date_of_birth <= CURRENT_DATE)
);

-- ============================================================================
-- COACHES TABLE
-- ============================================================================
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  certification_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT coaches_user_id_unique UNIQUE (user_id),
  CONSTRAINT coaches_email_unique UNIQUE (email)
);

-- ============================================================================
-- TRAINING SESSIONS TABLE
-- ============================================================================
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  qr_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT training_sessions_time_check CHECK (end_time > start_time)
);

-- ============================================================================
-- ATTENDANCE LOGS TABLE
-- ============================================================================
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_in_method check_in_method NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT attendance_logs_unique UNIQUE (training_session_id, athlete_id)
);

-- ============================================================================
-- PERFORMANCE RECORDS TABLE
-- ============================================================================
CREATE TABLE performance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE RESTRICT,
  test_type VARCHAR(100) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  score DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  test_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE, -- NULL for system-wide
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  author_role user_role NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority announcement_priority NOT NULL DEFAULT 'normal',
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT announcements_expiry_check CHECK (expires_at IS NULL OR expires_at > published_at)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User roles indexes
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Athletes indexes
CREATE INDEX idx_athletes_club_id ON athletes(club_id);
CREATE INDEX idx_athletes_user_id ON athletes(user_id);
CREATE INDEX idx_athletes_email ON athletes(email);

-- Coaches indexes
CREATE INDEX idx_coaches_club_id ON coaches(club_id);
CREATE INDEX idx_coaches_user_id ON coaches(user_id);
CREATE INDEX idx_coaches_email ON coaches(email);

-- Training sessions indexes
CREATE INDEX idx_training_sessions_club_id ON training_sessions(club_id);
CREATE INDEX idx_training_sessions_coach_id ON training_sessions(coach_id);
CREATE INDEX idx_training_sessions_date ON training_sessions(session_date);
CREATE INDEX idx_training_sessions_club_date ON training_sessions(club_id, session_date);

-- Attendance logs indexes
CREATE INDEX idx_attendance_logs_session_id ON attendance_logs(training_session_id);
CREATE INDEX idx_attendance_logs_athlete_id ON attendance_logs(athlete_id);
CREATE INDEX idx_attendance_logs_status ON attendance_logs(status);

-- Performance records indexes
CREATE INDEX idx_performance_records_athlete_id ON performance_records(athlete_id);
CREATE INDEX idx_performance_records_coach_id ON performance_records(coach_id);
CREATE INDEX idx_performance_records_test_type ON performance_records(test_type);
CREATE INDEX idx_performance_records_test_date ON performance_records(test_date);
CREATE INDEX idx_performance_records_athlete_test ON performance_records(athlete_id, test_type, test_date);

-- Announcements indexes
CREATE INDEX idx_announcements_club_id ON announcements(club_id);
CREATE INDEX idx_announcements_author_id ON announcements(author_id);
CREATE INDEX idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_club_published ON announcements(club_id, published_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at 
  BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_athletes_updated_at 
  BEFORE UPDATE ON athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at 
  BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_sessions_updated_at 
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_records_updated_at 
  BEFORE UPDATE ON performance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at 
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE user_roles IS 'Stores user role assignments (admin, coach, athlete)';
COMMENT ON TABLE clubs IS 'Sports clubs in the system';
COMMENT ON TABLE athletes IS 'Athlete profiles and information';
COMMENT ON TABLE coaches IS 'Coach profiles and information';
COMMENT ON TABLE training_sessions IS 'Scheduled training sessions for clubs';
COMMENT ON TABLE attendance_logs IS 'Attendance records for training sessions';
COMMENT ON TABLE performance_records IS 'Performance test results for athletes';
COMMENT ON TABLE announcements IS 'Announcements for clubs or system-wide';
