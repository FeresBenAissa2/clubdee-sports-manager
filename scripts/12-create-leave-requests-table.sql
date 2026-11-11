-- Create leave_requests table
-- This table stores leave requests from athletes for training sessions

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES coaches(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT leave_requests_reason_length CHECK (char_length(reason) >= 10),
  CONSTRAINT leave_requests_unique_request UNIQUE (session_id, athlete_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_session_id ON leave_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_athlete_id ON leave_requests(athlete_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_by ON leave_requests(reviewed_by);

-- Enable Row Level Security
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_requests

-- Athletes can view their own leave requests
CREATE POLICY "Athletes view own leave requests"
  ON leave_requests FOR SELECT
  USING (athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid()));

-- Athletes can create their own leave requests
CREATE POLICY "Athletes create own leave requests"
  ON leave_requests FOR INSERT
  WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid()));

-- Athletes can update their own pending leave requests (to modify reason before approval)
CREATE POLICY "Athletes update own pending leave requests"
  ON leave_requests FOR UPDATE
  USING (
    athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
    AND status = 'pending'
  );

-- Coaches can view leave requests for their sessions
CREATE POLICY "Coaches view session leave requests"
  ON leave_requests FOR SELECT
  USING (session_id IN (
    SELECT id FROM training_sessions 
    WHERE coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  ));

-- Coaches can update leave requests for their sessions (approve/reject)
CREATE POLICY "Coaches update session leave requests"
  ON leave_requests FOR UPDATE
  USING (session_id IN (
    SELECT id FROM training_sessions 
    WHERE coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  ))
  WITH CHECK (session_id IN (
    SELECT id FROM training_sessions 
    WHERE coach_id IN (SELECT id FROM coaches WHERE user_id = auth.uid())
  ));

-- Admins can do everything with leave requests
CREATE POLICY "Admins manage all leave requests"
  ON leave_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add comment to table
COMMENT ON TABLE leave_requests IS 'Stores leave requests from athletes for training sessions';
COMMENT ON COLUMN leave_requests.reason IS 'Reason for leave request (minimum 10 characters)';
COMMENT ON COLUMN leave_requests.status IS 'Status of leave request: pending, approved, or rejected';
COMMENT ON COLUMN leave_requests.reviewed_by IS 'Coach who reviewed the leave request';
COMMENT ON COLUMN leave_requests.reviewed_at IS 'Timestamp when the leave request was reviewed';
