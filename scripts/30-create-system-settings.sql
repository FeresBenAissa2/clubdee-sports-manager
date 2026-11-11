-- Create System Settings Table
-- This table stores system-wide configuration that admins can modify

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on setting_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('require_email_verification', 'false', 'ต้องการยืนยันอีเมลหรือไม่ (true/false)'),
  ('allow_self_registration', 'true', 'อนุญาตให้สมัครสมาชิกเองได้หรือไม่ (true/false)'),
  ('require_coach_approval', 'true', 'ต้องการให้โค้ชอนุมัติก่อนเข้าใช้งานหรือไม่ (true/false)')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all settings
CREATE POLICY "Admins can view all settings"
ON system_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can update settings
CREATE POLICY "Admins can update settings"
ON system_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can insert new settings
CREATE POLICY "Admins can insert settings"
ON system_settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Function to get a setting value
CREATE OR REPLACE FUNCTION get_system_setting(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT setting_value INTO v_value
  FROM system_settings
  WHERE setting_key = p_key;
  
  RETURN COALESCE(v_value, 'null'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a setting
CREATE OR REPLACE FUNCTION update_system_setting(
  p_key TEXT,
  p_value JSONB,
  p_updated_by UUID
)
RETURNS void AS $$
BEGIN
  UPDATE system_settings
  SET 
    setting_value = p_value,
    updated_by = p_updated_by,
    updated_at = NOW()
  WHERE setting_key = p_key;
  
  IF NOT FOUND THEN
    INSERT INTO system_settings (setting_key, setting_value, updated_by)
    VALUES (p_key, p_value, p_updated_by);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS system_settings_updated_at ON system_settings;
CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_system_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_system_setting(TEXT, JSONB, UUID) TO authenticated;

COMMENT ON TABLE system_settings IS 'System-wide configuration settings that can be modified by admins';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN system_settings.setting_value IS 'JSONB value of the setting (flexible type)';
COMMENT ON COLUMN system_settings.description IS 'Human-readable description of what this setting does';
