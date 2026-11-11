-- Optional DB helpers for membership (safe to re-run).
-- App now works without these via direct queries; still useful for RPC callers.

CREATE OR REPLACE FUNCTION add_activity_log(
  p_application_id UUID,
  p_action TEXT,
  p_by_user UUID,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  v_user_role TEXT;
  v_log_entry JSONB;
BEGIN
  SELECT 'coach' INTO v_user_role FROM coaches WHERE user_id = p_by_user LIMIT 1;
  IF v_user_role IS NULL THEN
    SELECT role INTO v_user_role FROM user_roles WHERE user_id = p_by_user LIMIT 1;
  END IF;

  v_log_entry := jsonb_build_object(
    'timestamp', NOW(),
    'action', p_action,
    'by_user', p_by_user,
    'by_role', COALESCE(v_user_role, 'athlete')
  ) || COALESCE(p_details, '{}'::jsonb);

  UPDATE membership_applications
  SET activity_log = COALESCE(activity_log, '[]'::jsonb) || v_log_entry,
      updated_at = NOW()
  WHERE id = p_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_application_status(
  p_application_id UUID,
  p_new_status TEXT,
  p_reviewed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_old_status TEXT;
  v_reviewer_role TEXT;
BEGIN
  SELECT status INTO v_old_status FROM membership_applications WHERE id = p_application_id;

  SELECT 'coach' INTO v_reviewer_role FROM coaches WHERE user_id = p_reviewed_by LIMIT 1;
  IF v_reviewer_role IS NULL THEN
    SELECT role INTO v_reviewer_role FROM user_roles WHERE user_id = p_reviewed_by LIMIT 1;
  END IF;

  UPDATE membership_applications
  SET status = p_new_status,
      review_info = jsonb_build_object(
        'reviewed_by', p_reviewed_by,
        'reviewed_at', NOW(),
        'reviewer_role', COALESCE(v_reviewer_role, 'coach'),
        'notes', p_notes
      ),
      updated_at = NOW()
  WHERE id = p_application_id;

  PERFORM add_activity_log(
    p_application_id,
    'status_changed',
    p_reviewed_by,
    jsonb_build_object('from', v_old_status, 'to', p_new_status, 'notes', p_notes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_duplicate_pending_application(p_user_id UUID)
RETURNS TABLE(
  has_pending BOOLEAN,
  pending_application_id UUID,
  pending_club_id UUID,
  pending_since TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE, ma.id, ma.club_id, ma.created_at
  FROM membership_applications ma
  WHERE ma.user_id = p_user_id AND ma.status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
