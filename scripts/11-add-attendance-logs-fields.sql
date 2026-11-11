-- ============================================================================
-- Add fields to attendance table for Training Attendance System
-- Note: The 'attendance' table serves as 'attendance_logs' in the design
-- ============================================================================

-- Add check_in_time field (already exists in schema, but ensure it's there)
-- This field stores the exact timestamp when athlete checked in
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;

-- Add marked_by field (already exists in schema, but ensure it's there)
-- This field stores who marked the attendance (coach or system)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for check_in_time for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance(check_in_time);

-- Add index for marked_by for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendance(marked_by);

-- Add comment to document the fields
COMMENT ON COLUMN attendance.check_in_time IS 'Timestamp when athlete checked in to the session';
COMMENT ON COLUMN attendance.marked_by IS 'User who marked this attendance (coach or system for self check-in)';
