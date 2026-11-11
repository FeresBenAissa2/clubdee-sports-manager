-- ระบบ Dashboard สำหรับผู้ปกครอง
-- Migration: 92-create-parent-dashboard-system.sql

-- ===================================
-- 1. ตาราง parent_users
-- ===================================

CREATE TABLE IF NOT EXISTS parent_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  
  -- Session management
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  
  -- Security
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parent_users_email ON parent_users(email);
CREATE INDEX IF NOT EXISTS idx_parent_users_active ON parent_users(is_active);
CREATE INDEX IF NOT EXISTS idx_parent_users_locked ON parent_users(locked_until) WHERE locked_until IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_parent_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_parent_users_updated_at ON parent_users;
CREATE TRIGGER trigger_update_parent_users_updated_at
BEFORE UPDATE ON parent_users
FOR EACH ROW
EXECUTE FUNCTION update_parent_users_updated_at();

-- ===================================
-- 2. ตาราง parent_sessions
-- ===================================

CREATE TABLE IF NOT EXISTS parent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES parent_users(id) ON DELETE CASCADE,
  
  -- Session data
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Device info
  user_agent TEXT,
  ip_address TEXT,
  device_fingerprint TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parent_sessions_token ON parent_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_parent_sessions_user ON parent_sessions(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_sessions_expires ON parent_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_parent_sessions_active ON parent_sessions(is_active, expires_at);

-- ===================================
-- 3. อัพเดท parent_connections
-- ===================================

-- เพิ่ม column parent_user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parent_connections' 
    AND column_name = 'parent_user_id'
  ) THEN
    ALTER TABLE parent_connections 
    ADD COLUMN parent_user_id UUID REFERENCES parent_users(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_parent_connections_user ON parent_connections(parent_user_id);
  END IF;
END $$;

-- ===================================
-- 4. ตาราง parent_password_resets
-- ===================================

CREATE TABLE IF NOT EXISTS parent_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES parent_users(id) ON DELETE CASCADE,
  
  -- Reset token
  reset_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Status
  used_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_token ON parent_password_resets(reset_token);
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_user ON parent_password_resets(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_password_resets_expires ON parent_password_resets(expires_at);

-- ===================================
-- 5. Helper Functions
-- ===================================

-- ฟังก์ชันตรวจสอบว่า parent_user มีสิทธิ์เข้าถึงข้อมูลนักกีฬาหรือไม่
CREATE OR REPLACE FUNCTION parent_can_access_athlete(
  p_parent_user_id UUID,
  p_athlete_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM parent_connections pc
    WHERE pc.parent_user_id = p_parent_user_id
      AND pc.athlete_id = p_athlete_id
      AND pc.is_verified = TRUE
      AND pc.is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ฟังก์ชันดึงรายการนักกีฬาของผู้ปกครอง
CREATE OR REPLACE FUNCTION get_parent_athletes(p_parent_user_id UUID)
RETURNS TABLE (
  athlete_id UUID,
  athlete_name TEXT,
  club_name TEXT,
  relationship TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.first_name || ' ' || a.last_name,
    c.name,
    pc.relationship
  FROM parent_connections pc
  JOIN athletes a ON a.id = pc.athlete_id
  LEFT JOIN clubs c ON c.id = a.club_id
  WHERE pc.parent_user_id = p_parent_user_id
    AND pc.is_verified = TRUE
    AND pc.is_active = TRUE
  ORDER BY a.first_name, a.last_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ฟังก์ชันทำความสะอาด sessions หมดอายุ
CREATE OR REPLACE FUNCTION cleanup_expired_parent_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM parent_sessions
  WHERE expires_at < NOW()
    OR (is_active = TRUE AND last_activity_at < NOW() - INTERVAL '30 minutes');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ฟังก์ชันจำกัดจำนวน sessions ต่อ user
CREATE OR REPLACE FUNCTION limit_parent_sessions()
RETURNS TRIGGER AS $$
DECLARE
  session_count INTEGER;
  max_sessions INTEGER := 3;
BEGIN
  -- นับจำนวน active sessions
  SELECT COUNT(*) INTO session_count
  FROM parent_sessions
  WHERE parent_user_id = NEW.parent_user_id
    AND is_active = TRUE
    AND expires_at > NOW();
  
  -- ถ้าเกิน max_sessions ให้ลบ session เก่าสุด
  IF session_count >= max_sessions THEN
    DELETE FROM parent_sessions
    WHERE id IN (
      SELECT id FROM parent_sessions
      WHERE parent_user_id = NEW.parent_user_id
        AND is_active = TRUE
      ORDER BY last_activity_at ASC
      LIMIT (session_count - max_sessions + 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_limit_parent_sessions ON parent_sessions;
CREATE TRIGGER trigger_limit_parent_sessions
BEFORE INSERT ON parent_sessions
FOR EACH ROW
EXECUTE FUNCTION limit_parent_sessions();

-- ===================================
-- 6. RLS Policies
-- ===================================

-- parent_users
ALTER TABLE parent_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parent users can view their own data" ON parent_users;
CREATE POLICY "Parent users can view their own data"
ON parent_users FOR SELECT
TO authenticated
USING (id = (current_setting('app.parent_user_id', true))::UUID);

DROP POLICY IF EXISTS "Parent users can update their own data" ON parent_users;
CREATE POLICY "Parent users can update their own data"
ON parent_users FOR UPDATE
TO authenticated
USING (id = (current_setting('app.parent_user_id', true))::UUID);

DROP POLICY IF EXISTS "Admins can manage all parent users" ON parent_users;
CREATE POLICY "Admins can manage all parent users"
ON parent_users FOR ALL
TO authenticated
USING (public.is_admin());

-- parent_sessions
ALTER TABLE parent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parent users can view their own sessions" ON parent_sessions;
CREATE POLICY "Parent users can view their own sessions"
ON parent_sessions FOR SELECT
TO authenticated
USING (parent_user_id = (current_setting('app.parent_user_id', true))::UUID);

DROP POLICY IF EXISTS "Admins can view all parent sessions" ON parent_sessions;
CREATE POLICY "Admins can view all parent sessions"
ON parent_sessions FOR SELECT
TO authenticated
USING (public.is_admin());

-- parent_password_resets
ALTER TABLE parent_password_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create password reset" ON parent_password_resets;
CREATE POLICY "Anyone can create password reset"
ON parent_password_resets FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all password resets" ON parent_password_resets;
CREATE POLICY "Admins can view all password resets"
ON parent_password_resets FOR SELECT
TO authenticated
USING (public.is_admin());

-- ===================================
-- 7. Views สำหรับ Parent Dashboard
-- ===================================

-- View: parent_athlete_summary
CREATE OR REPLACE VIEW parent_athlete_summary AS
SELECT 
  pc.parent_user_id,
  a.id as athlete_id,
  a.first_name,
  a.last_name,
  a.nickname,
  a.profile_picture_url,
  c.id as club_id,
  c.name as club_name,
  pc.relationship,
  
  -- Attendance stats (last 30 days)
  (
    SELECT COUNT(*) 
    FROM attendance_logs al
    WHERE al.athlete_id = a.id
      AND al.session_date >= CURRENT_DATE - INTERVAL '30 days'
      AND al.status = 'present'
  ) as attendance_count_30d,
  
  (
    SELECT COUNT(*) 
    FROM attendance_logs al
    WHERE al.athlete_id = a.id
      AND al.session_date >= CURRENT_DATE - INTERVAL '30 days'
  ) as total_sessions_30d,
  
  -- Performance records count
  (
    SELECT COUNT(*) 
    FROM performance_records pr
    WHERE pr.athlete_id = a.id
  ) as performance_records_count,
  
  -- Active goals count
  (
    SELECT COUNT(*) 
    FROM athlete_goals ag
    WHERE ag.athlete_id = a.id
      AND ag.status = 'active'
  ) as active_goals_count,
  
  -- Unread notifications count
  (
    SELECT COUNT(*) 
    FROM parent_notifications pn
    WHERE pn.parent_connection_id = pc.id
      AND pn.opened_at IS NULL
  ) as unread_notifications_count

FROM parent_connections pc
JOIN athletes a ON a.id = pc.athlete_id
LEFT JOIN clubs c ON c.id = a.club_id
WHERE pc.is_verified = TRUE
  AND pc.is_active = TRUE;

-- ===================================
-- 8. Comments
-- ===================================

COMMENT ON TABLE parent_users IS 'บัญชีผู้ใช้สำหรับผู้ปกครอง (แยกจากระบบหลัก)';
COMMENT ON TABLE parent_sessions IS 'Session management สำหรับผู้ปกครอง';
COMMENT ON TABLE parent_password_resets IS 'Token สำหรับรีเซ็ตรหัสผ่าน';
COMMENT ON VIEW parent_athlete_summary IS 'สรุปข้อมูลนักกีฬาสำหรับผู้ปกครอง';

-- ===================================
-- สรุป
-- ===================================

DO $$
BEGIN
  RAISE NOTICE '✅ Parent Dashboard System created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - parent_users';
  RAISE NOTICE '  - parent_sessions';
  RAISE NOTICE '  - parent_password_resets';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - parent_athlete_summary';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - parent_can_access_athlete()';
  RAISE NOTICE '  - get_parent_athletes()';
  RAISE NOTICE '  - cleanup_expired_parent_sessions()';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies: ✅ Enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create parent authentication API';
  RAISE NOTICE '  2. Create parent dashboard pages';
  RAISE NOTICE '  3. Implement email verification flow';
  RAISE NOTICE '  4. Test parent login/logout';
END $$;
