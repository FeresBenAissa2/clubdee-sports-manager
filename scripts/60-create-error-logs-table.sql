-- สร้างตาราง error_logs สำหรับเก็บ log ข้อผิดพลาดที่ผู้ใช้เจอ
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL, -- 'auth', 'registration', 'rate_limit', 'validation', 'database', 'unknown'
  error_code TEXT,
  error_message TEXT NOT NULL,
  error_details JSONB,
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index สำหรับค้นหา
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);

-- RLS Policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Admin สามารถดูทั้งหมด
CREATE POLICY "Admin can view all error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ผู้ใช้สามารถสร้าง error log ของตัวเอง (สำหรับ client-side logging)
CREATE POLICY "Users can create their own error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Anonymous users สามารถสร้าง error log (สำหรับ registration errors)
CREATE POLICY "Anonymous can create error logs"
  ON error_logs FOR INSERT
  TO anon
  WITH CHECK (true);

COMMENT ON TABLE error_logs IS 'เก็บ log ข้อผิดพลาดที่เกิดขึ้นในระบบ';
