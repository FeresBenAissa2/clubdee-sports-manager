-- Create function to update feature flags
CREATE OR REPLACE FUNCTION update_feature_flag(
  flag_name TEXT,
  flag_enabled BOOLEAN DEFAULT NULL,
  flag_rollout INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Update the feature flag
  UPDATE feature_flags
  SET
    enabled = COALESCE(flag_enabled, enabled),
    rollout_percentage = COALESCE(flag_rollout, rollout_percentage),
    updated_at = NOW()
  WHERE name = flag_name
  RETURNING json_build_object(
    'id', id,
    'name', name,
    'enabled', enabled,
    'rollout_percentage', rollout_percentage,
    'updated_at', updated_at
  ) INTO result;
  
  RETURN result;
END;
$$;
