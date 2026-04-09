-- =============================================================================
-- Lesson and Assignment File Attachment Support
-- =============================================================================
-- Run this in the Supabase SQL editor before using lesson PDF uploads and
-- assignment attachment uploads.
-- =============================================================================

ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS resource_url TEXT,
ADD COLUMN IF NOT EXISTS resource_type TEXT CHECK (resource_type IN ('pdf', 'file')),
ADD COLUMN IF NOT EXISTS resource_file_path TEXT,
ADD COLUMN IF NOT EXISTS resource_file_name TEXT,
ADD COLUMN IF NOT EXISTS resource_mime_type TEXT;

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT CHECK (attachment_type IN ('pdf', 'file')),
ADD COLUMN IF NOT EXISTS attachment_file_path TEXT,
ADD COLUMN IF NOT EXISTS attachment_file_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('lesson-resources', 'lesson-resources', true),
    ('assignment-files', 'assignment-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view lesson resources" ON storage.objects;
CREATE POLICY "Public can view lesson resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-resources');

DROP POLICY IF EXISTS "Teachers can upload lesson resources" ON storage.objects;
CREATE POLICY "Teachers can upload lesson resources"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'lesson-resources'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "Teachers can update lesson resources" ON storage.objects;
CREATE POLICY "Teachers can update lesson resources"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'lesson-resources'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
)
WITH CHECK (
    bucket_id = 'lesson-resources'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "Teachers can delete lesson resources" ON storage.objects;
CREATE POLICY "Teachers can delete lesson resources"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'lesson-resources'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "Public can view assignment files" ON storage.objects;
CREATE POLICY "Public can view assignment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignment-files');

DROP POLICY IF EXISTS "Teachers can upload assignment files" ON storage.objects;
CREATE POLICY "Teachers can upload assignment files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'assignment-files'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "Teachers can update assignment files" ON storage.objects;
CREATE POLICY "Teachers can update assignment files"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'assignment-files'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
)
WITH CHECK (
    bucket_id = 'assignment-files'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "Teachers can delete assignment files" ON storage.objects;
CREATE POLICY "Teachers can delete assignment files"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'assignment-files'
    AND auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);
