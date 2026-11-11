-- Create login_sessions table for device tracking
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_info JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_device_id ON login_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_created_at ON login_sessions(created_at DESC);

-- Enable RLS
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all login sessions
CREATE POLICY "Admins can view all login sessions"
  ON login_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Users can view their own login sessions
CREATE POLICY "Users can view own login sessions"
  ON login_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert login sessions (for auth actions)
CREATE POLICY "Service can insert login sessions"
  ON login_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
