-- =============================================================================
-- Lesson Video Support for the LMS
-- =============================================================================
-- Run this in the Supabase SQL editor before using teacher video uploads.
-- This adds lesson video metadata columns and creates a storage bucket that
-- teachers can upload into while students can stream the final lesson videos.
-- =============================================================================

ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS video_type TEXT CHECK (video_type IN ('external', 'upload')),
ADD COLUMN IF NOT EXISTS video_file_path TEXT,
ADD COLUMN IF NOT EXISTS video_file_name TEXT,
ADD COLUMN IF NOT EXISTS video_mime_type TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view lesson videos" ON storage.objects;
CREATE POLICY "Public can view lesson videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos');

DROP POLICY IF EXISTS "Teachers can upload lesson videos" ON storage.objects;
CREATE POLICY "Teachers can upload lesson videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'lesson-videos'
    AND (
        auth.jwt() -> 'app_metadata' ->> 'role' = 'teacher'
        OR auth.jwt() -> 'app_metadata' ->> 'role' = 'principal'
    )
);

DROP POLICY IF EXISTS "Teachers can update lesson videos" ON storage.objects;
CREATE POLICY "Teachers can update lesson videos"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'lesson-videos'
    AND (
        auth.jwt() -> 'app_metadata' ->> 'role' = 'teacher'
        OR auth.jwt() -> 'app_metadata' ->> 'role' = 'principal'
    )
)
WITH CHECK (
    bucket_id = 'lesson-videos'
    AND (
        auth.jwt() -> 'app_metadata' ->> 'role' = 'teacher'
        OR auth.jwt() -> 'app_metadata' ->> 'role' = 'principal'
    )
);

DROP POLICY IF EXISTS "Teachers can delete lesson videos" ON storage.objects;
CREATE POLICY "Teachers can delete lesson videos"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'lesson-videos'
    AND (
        auth.jwt() -> 'app_metadata' ->> 'role' = 'teacher'
        OR auth.jwt() -> 'app_metadata' ->> 'role' = 'principal'
    )
);

-- Rubric grading note:
-- The new grading flow uses assignments.total_marks together with
-- rubric_criteria.max_points. Store rubric scales here (for example 4 for a /4
-- criterion), not the full assignment mark share. The app now converts rubric
-- scores into assignment marks automatically.
