-- ============================================================================
-- Home Training Videos Storage Bucket Setup
-- ============================================================================

-- Create storage bucket for home training videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'home-training-videos',
    'home-training-videos',
    false, -- Private bucket
    104857600, -- 100MB limit
    ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

-- ============================================================================
-- Storage RLS Policies
-- ============================================================================

-- Athletes can upload their own training videos
CREATE POLICY "Athletes can upload own training videos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'home-training-videos'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'athlete')
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Athletes can view their own training videos
CREATE POLICY "Athletes can view own training videos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'home-training-videos'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'athlete')
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Athletes can delete their own training videos
CREATE POLICY "Athletes can delete own training videos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'home-training-videos'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'athlete')
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Coaches can view training videos from their club athletes
CREATE POLICY "Coaches can view club training videos"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'home-training-videos'
        AND EXISTS (
            SELECT 1 
            FROM profiles coach
            JOIN profiles athlete ON athlete.club_id = coach.club_id
            WHERE coach.id = auth.uid() 
            AND coach.role = 'coach'
            AND athlete.id::text = (storage.foldername(name))[1]
        )
    );

-- Admins have full access
CREATE POLICY "Admins have full access to training videos"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'home-training-videos'
        AND EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );
