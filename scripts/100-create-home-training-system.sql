-- ============================================================================
-- Home Training Check-in System
-- ============================================================================
-- Purpose: Allow athletes to log home training sessions with video uploads
--          and enable coaches to review and provide feedback
-- ============================================================================

-- Drop existing objects if they exist
DROP TABLE IF EXISTS home_training_feedback CASCADE;
DROP TABLE IF EXISTS home_training_logs CASCADE;

-- ============================================================================
-- Table: home_training_logs
-- ============================================================================
CREATE TABLE home_training_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    
    -- Training details
    training_date DATE NOT NULL DEFAULT CURRENT_DATE,
    training_type VARCHAR(100) NOT NULL, -- e.g., 'strength', 'cardio', 'skill_practice', 'flexibility'
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    
    -- Exercise details
    exercise_name VARCHAR(200) NOT NULL,
    sets INTEGER CHECK (sets > 0 AND sets <= 100),
    reps INTEGER CHECK (reps > 0 AND reps <= 1000),
    notes TEXT,
    
    -- Video upload
    video_url TEXT, -- URL to video in storage bucket
    video_duration_seconds INTEGER CHECK (video_duration_seconds > 0),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'needs_improvement')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Table: home_training_feedback
-- ============================================================================
CREATE TABLE home_training_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_log_id UUID NOT NULL REFERENCES home_training_logs(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Feedback content
    feedback_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 stars
    
    -- Recommendations
    improvement_areas TEXT[],
    next_steps TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT one_feedback_per_coach UNIQUE (training_log_id, coach_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX idx_home_training_logs_athlete ON home_training_logs(athlete_id, training_date DESC);
CREATE INDEX idx_home_training_logs_club ON home_training_logs(club_id, status, training_date DESC);
CREATE INDEX idx_home_training_logs_status ON home_training_logs(status, created_at DESC);
CREATE INDEX idx_home_training_logs_date ON home_training_logs(training_date DESC);
CREATE INDEX idx_home_training_feedback_log ON home_training_feedback(training_log_id);
CREATE INDEX idx_home_training_feedback_coach ON home_training_feedback(coach_id, created_at DESC);

-- ============================================================================
-- Updated_at Triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_home_training_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_home_training_logs_updated_at
    BEFORE UPDATE ON home_training_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_home_training_updated_at();

CREATE TRIGGER trigger_home_training_feedback_updated_at
    BEFORE UPDATE ON home_training_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_home_training_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE home_training_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_training_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policies for home_training_logs
-- ============================================================================

-- Athletes can view their own training logs
CREATE POLICY "Athletes can view own training logs"
    ON home_training_logs FOR SELECT
    USING (athlete_id = auth.uid());

-- Athletes can create their own training logs
CREATE POLICY "Athletes can create own training logs"
    ON home_training_logs FOR INSERT
    WITH CHECK (
        athlete_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'athlete')
    );

-- Athletes can update their own pending training logs
CREATE POLICY "Athletes can update own pending logs"
    ON home_training_logs FOR UPDATE
    USING (athlete_id = auth.uid() AND status = 'pending')
    WITH CHECK (athlete_id = auth.uid() AND status = 'pending');

-- Athletes can delete their own pending training logs
CREATE POLICY "Athletes can delete own pending logs"
    ON home_training_logs FOR DELETE
    USING (athlete_id = auth.uid() AND status = 'pending');

-- Coaches can view training logs from their club
CREATE POLICY "Coaches can view club training logs"
    ON home_training_logs FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() AND role = 'coach'
        )
    );

-- Coaches can update training logs (review status)
CREATE POLICY "Coaches can review training logs"
    ON home_training_logs FOR UPDATE
    USING (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() AND role = 'coach'
        )
    )
    WITH CHECK (
        club_id IN (
            SELECT club_id FROM profiles 
            WHERE id = auth.uid() AND role = 'coach'
        )
    );

-- Admins have full access
CREATE POLICY "Admins have full access to training logs"
    ON home_training_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Policies for home_training_feedback
-- ============================================================================

-- Athletes can view feedback on their training logs
CREATE POLICY "Athletes can view feedback on own logs"
    ON home_training_feedback FOR SELECT
    USING (
        training_log_id IN (
            SELECT id FROM home_training_logs WHERE athlete_id = auth.uid()
        )
    );

-- Coaches can view their own feedback
CREATE POLICY "Coaches can view own feedback"
    ON home_training_feedback FOR SELECT
    USING (coach_id = auth.uid());

-- Coaches can create feedback for training logs in their club
CREATE POLICY "Coaches can create feedback"
    ON home_training_feedback FOR INSERT
    WITH CHECK (
        coach_id = auth.uid()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
        AND training_log_id IN (
            SELECT htl.id 
            FROM home_training_logs htl
            JOIN profiles p ON p.id = auth.uid()
            WHERE htl.club_id = p.club_id AND p.role = 'coach'
        )
    );

-- Coaches can update their own feedback
CREATE POLICY "Coaches can update own feedback"
    ON home_training_feedback FOR UPDATE
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- Coaches can delete their own feedback
CREATE POLICY "Coaches can delete own feedback"
    ON home_training_feedback FOR DELETE
    USING (coach_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins have full access to feedback"
    ON home_training_feedback FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get training statistics for an athlete
CREATE OR REPLACE FUNCTION get_athlete_home_training_stats(
    p_athlete_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_sessions INTEGER,
    total_duration_minutes INTEGER,
    avg_duration_minutes NUMERIC,
    sessions_by_type JSONB,
    pending_reviews INTEGER,
    approved_sessions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_sessions,
        SUM(duration_minutes)::INTEGER as total_duration_minutes,
        ROUND(AVG(duration_minutes), 2) as avg_duration_minutes,
        jsonb_object_agg(
            training_type, 
            type_count
        ) as sessions_by_type,
        COUNT(*) FILTER (WHERE status = 'pending')::INTEGER as pending_reviews,
        COUNT(*) FILTER (WHERE status = 'approved')::INTEGER as approved_sessions
    FROM (
        SELECT 
            htl.training_type,
            htl.duration_minutes,
            htl.status,
            COUNT(*) OVER (PARTITION BY htl.training_type) as type_count
        FROM home_training_logs htl
        WHERE htl.athlete_id = p_athlete_id
        AND htl.training_date BETWEEN p_start_date AND p_end_date
    ) subquery;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending reviews for a coach
CREATE OR REPLACE FUNCTION get_coach_pending_home_training_reviews(
    p_coach_id UUID
)
RETURNS TABLE (
    log_id UUID,
    athlete_name VARCHAR,
    training_date DATE,
    training_type VARCHAR,
    exercise_name VARCHAR,
    duration_minutes INTEGER,
    video_url TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        htl.id,
        p.full_name,
        htl.training_date,
        htl.training_type,
        htl.exercise_name,
        htl.duration_minutes,
        htl.video_url,
        htl.created_at
    FROM home_training_logs htl
    JOIN profiles p ON p.id = htl.athlete_id
    JOIN profiles coach ON coach.id = p_coach_id
    WHERE htl.club_id = coach.club_id
    AND htl.status = 'pending'
    AND coach.role = 'coach'
    ORDER BY htl.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE home_training_logs IS 'Logs of home training sessions submitted by athletes';
COMMENT ON TABLE home_training_feedback IS 'Feedback from coaches on home training sessions';
COMMENT ON COLUMN home_training_logs.video_url IS 'URL to video stored in home-training-videos bucket';
COMMENT ON COLUMN home_training_logs.status IS 'Review status: pending, reviewed, approved, needs_improvement';
