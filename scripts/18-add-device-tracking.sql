-- Add device tracking for login sessions and attendance
-- This allows tracking which device was used for login and check-in

-- Create login_sessions table to track device usage
CREATE TABLE IF NOT EXISTS public.login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_info JSONB,
    ip_address TEXT,
    user_agent TEXT,
    login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add device_id to attendance_logs for tracking check-in device
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Add device_id to attendance table for tracking check-in device
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON public.login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_device_id ON public.login_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_login_at ON public.login_sessions(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_device_id ON public.attendance_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_device_id ON public.attendance(device_id);

-- Enable RLS on login_sessions
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for login_sessions
-- Users can view their own login sessions
CREATE POLICY "Users can view own login sessions"
    ON public.login_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all login sessions
CREATE POLICY "Admins can view all login sessions"
    ON public.login_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Service role can insert login sessions (for server-side tracking)
CREATE POLICY "Service role can insert login sessions"
    ON public.login_sessions
    FOR INSERT
    WITH CHECK (true);

-- Users can update their own logout time
CREATE POLICY "Users can update own logout time"
    ON public.login_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to get device statistics
CREATE OR REPLACE FUNCTION public.get_device_statistics(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    device_id TEXT,
    login_count BIGINT,
    last_login TIMESTAMPTZ,
    check_in_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ls.device_id, al.device_id) as device_id,
        COUNT(DISTINCT ls.id) as login_count,
        MAX(ls.login_at) as last_login,
        COUNT(DISTINCT al.id) as check_in_count
    FROM public.login_sessions ls
    FULL OUTER JOIN public.attendance_logs al ON ls.device_id = al.device_id
    WHERE (p_user_id IS NULL OR ls.user_id = p_user_id OR al.athlete_id IN (
        SELECT id FROM public.athletes WHERE user_id = p_user_id
    ))
    GROUP BY COALESCE(ls.device_id, al.device_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.login_sessions IS 'Tracks user login sessions with device information';
COMMENT ON COLUMN public.attendance_logs.device_id IS 'Device ID used for check-in';
COMMENT ON COLUMN public.attendance.device_id IS 'Device ID used for check-in';
COMMENT ON FUNCTION public.get_device_statistics IS 'Get device usage statistics for a user';
