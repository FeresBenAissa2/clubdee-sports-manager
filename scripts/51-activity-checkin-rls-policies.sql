-- ============================================================================
-- RLS Policies for Activity Check-in System
-- ============================================================================

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_checkins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Activities Policies
-- ============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all activities"
  ON activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Coaches: Manage activities in their club
CREATE POLICY "Coaches can manage activities in their club"
  ON activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      WHERE coaches.user_id = auth.uid()
        AND coaches.club_id = activities.club_id
    )
  );

-- Athletes: View activities in their club
CREATE POLICY "Athletes can view activities in their club"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.user_id = auth.uid()
        AND athletes.club_id = activities.club_id
    )
  );

-- ============================================================================
-- Activity Registrations Policies
-- ============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all registrations"
  ON activity_registrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Coaches: View and approve registrations for their club's activities
CREATE POLICY "Coaches can manage registrations for their activities"
  ON activity_registrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      JOIN activities ON activities.club_id = coaches.club_id
      WHERE coaches.user_id = auth.uid()
        AND activities.id = activity_registrations.activity_id
    )
  );

-- Athletes: Register for activities and view own registrations
CREATE POLICY "Athletes can register for activities"
  ON activity_registrations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athletes
      JOIN activities ON activities.club_id = athletes.club_id
      WHERE athletes.user_id = auth.uid()
        AND athletes.id = activity_registrations.athlete_id
        AND activities.id = activity_registrations.activity_id
    )
  );

CREATE POLICY "Athletes can view own registrations"
  ON activity_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.user_id = auth.uid()
        AND athletes.id = activity_registrations.athlete_id
    )
  );

CREATE POLICY "Athletes can cancel own pending registrations"
  ON activity_registrations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.user_id = auth.uid()
        AND athletes.id = activity_registrations.athlete_id
        AND activity_registrations.status = 'pending'
    )
  )
  WITH CHECK (
    status = 'cancelled'
  );

-- ============================================================================
-- Activity Check-ins Policies
-- ============================================================================

-- Admins: Full access
CREATE POLICY "Admins can manage all checkins"
  ON activity_checkins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Coaches: View and manage check-ins for their club's activities
CREATE POLICY "Coaches can manage checkins for their activities"
  ON activity_checkins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaches
      JOIN activities ON activities.club_id = coaches.club_id
      WHERE coaches.user_id = auth.uid()
        AND activities.id = activity_checkins.activity_id
    )
  );

-- Athletes: Check-in to activities and view own check-ins
CREATE POLICY "Athletes can check-in to activities"
  ON activity_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM athletes
      JOIN activities ON activities.club_id = athletes.club_id
      WHERE athletes.user_id = auth.uid()
        AND athletes.id = activity_checkins.athlete_id
        AND activities.id = activity_checkins.activity_id
        -- Must be within check-in window
        AND is_checkin_window_valid(activity_checkins.activity_id, NOW())
    )
  );

CREATE POLICY "Athletes can view own checkins"
  ON activity_checkins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.user_id = auth.uid()
        AND athletes.id = activity_checkins.athlete_id
    )
  );

CREATE POLICY "Athletes can update own checkout time"
  ON activity_checkins FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM athletes
      WHERE athletes.user_id = auth.uid()
        AND athletes.id = activity_checkins.athlete_id
    )
  )
  WITH CHECK (
    -- Can only update checkout time, not other fields
    checked_in_at = (SELECT checked_in_at FROM activity_checkins WHERE id = activity_checkins.id)
    AND status = (SELECT status FROM activity_checkins WHERE id = activity_checkins.id)
  );

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_checkins TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Admins can manage all activities" ON activities IS 
  'Admins have full access to all activities';

COMMENT ON POLICY "Coaches can manage activities in their club" ON activities IS 
  'Coaches can create and manage activities for their club';

COMMENT ON POLICY "Athletes can view activities in their club" ON activities IS 
  'Athletes can view activities in their club';

COMMENT ON POLICY "Athletes can check-in to activities" ON activity_checkins IS 
  'Athletes can check-in only within the valid time window';
