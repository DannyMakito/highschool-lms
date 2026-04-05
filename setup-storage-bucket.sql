-- =============================================================================
-- Setup Supabase Storage Bucket for Assignment Submissions
-- =============================================================================
-- This script sets up the storage bucket and policies for storing uploaded PDFs
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- STEP 1: Create the storage bucket if it doesn't exist
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-submissions', 'assignment-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- STEP 2: Enable public access for all files in the bucket
-- =============================================================================
CREATE POLICY "Public access to assignment submissions"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignment-submissions');

-- STEP 3: Allow authenticated users to upload files
-- =============================================================================
CREATE POLICY "Allow authenticated users to upload assignments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-submissions'
  AND auth.role() = 'authenticated'
);

-- STEP 4: Allow users to update their own files
-- =============================================================================
CREATE POLICY "Allow users to update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assignment-submissions'
  AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'assignment-submissions'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- STEP 5: Allow users to delete their own files
-- =============================================================================
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignment-submissions'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- STEP 6: Verify bucket was created
-- =============================================================================
SELECT id, name, public FROM storage.buckets WHERE id = 'assignment-submissions';

-- =============================================================================
-- Done! The assignment-submissions bucket is now ready for file uploads
-- =============================================================================
-- File structure: {assignmentId}/{userId}/{timestamp}_{filename}
-- Example: 05851c61-552c-44f7-9227-f106e09b8106/704228ed-4569-4991-8d5f-0f57614d1038/1775321201198_dummy.pdf
-- =============================================================================
