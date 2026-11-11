-- Create announcements table for coach notifications
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'athletes', 'specific')),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT announcements_title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  CONSTRAINT announcements_message_length CHECK (char_length(message) >= 10 AND char_length(message) <= 5000),
  CONSTRAINT fk_coach FOREIGN KEY (coach_id) REFERENCES public.coaches(id) ON DELETE CASCADE
);

-- Create announcement_reads table to track who has read announcements
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_announcement FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Unique constraint: one read record per user per announcement
  UNIQUE(announcement_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_announcements_coach_id ON public.announcements(coach_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_is_pinned ON public.announcements(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON public.announcements(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON public.announcement_reads(user_id);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements

-- Coaches can view announcements from their club
CREATE POLICY "coaches_view_own_club_announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches c1
      JOIN public.coaches c2 ON c1.club_id = c2.club_id
      WHERE c1.user_id = auth.uid()
      AND c2.id = announcements.coach_id
    )
  );

-- Coaches can create announcements
CREATE POLICY "coaches_create_announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaches
      WHERE coaches.user_id = auth.uid()
      AND coaches.id = announcements.coach_id
    )
  );

-- Coaches can update their own announcements
CREATE POLICY "coaches_update_own_announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches
      WHERE coaches.user_id = auth.uid()
      AND coaches.id = announcements.coach_id
    )
  );

-- Coaches can delete their own announcements
CREATE POLICY "coaches_delete_own_announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coaches
      WHERE coaches.user_id = auth.uid()
      AND coaches.id = announcements.coach_id
    )
  );

-- Athletes can view announcements from their club's coaches
CREATE POLICY "athletes_view_club_announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      JOIN public.coaches c ON a.club_id = c.club_id
      WHERE a.user_id = auth.uid()
      AND c.id = announcements.coach_id
    )
  );

-- Admins can view all announcements
CREATE POLICY "admins_view_all_announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- RLS Policies for announcement_reads

-- Users can view their own read records
CREATE POLICY "users_view_own_reads"
  ON public.announcement_reads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can mark announcements as read
CREATE POLICY "users_mark_as_read"
  ON public.announcement_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Coaches can view read statistics for their announcements
CREATE POLICY "coaches_view_announcement_reads"
  ON public.announcement_reads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.announcements a
      JOIN public.coaches c ON c.id = a.coach_id
      WHERE a.id = announcement_reads.announcement_id
      AND c.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_announcements_updated_at ON public.announcements;
CREATE TRIGGER trigger_update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- Create view for announcement statistics
CREATE OR REPLACE VIEW public.announcement_stats AS
SELECT 
  a.id,
  a.coach_id,
  a.title,
  a.created_at,
  c.club_id,
  COUNT(DISTINCT ar.user_id) as read_count,
  COUNT(DISTINCT ath.user_id) as total_athletes
FROM public.announcements a
JOIN public.coaches c ON c.id = a.coach_id
LEFT JOIN public.announcement_reads ar ON ar.announcement_id = a.id
LEFT JOIN public.athletes ath ON ath.club_id = c.club_id
GROUP BY a.id, a.coach_id, a.title, a.created_at, c.club_id;

COMMENT ON TABLE public.announcements IS 'Announcements created by coaches for their club members';
COMMENT ON TABLE public.announcement_reads IS 'Tracks which users have read which announcements';
COMMENT ON VIEW public.announcement_stats IS 'Statistics about announcement read rates';
