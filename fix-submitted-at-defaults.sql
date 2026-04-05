-- ====================================================================
-- Fix submitted_at column defaults in assignment_submissions table
-- ====================================================================
-- Run this SQL script directly in Supabase SQL Editor
-- This ensures submitted_at always has a valid timestamp
-- ====================================================================

-- STEP 1: Update submitted_at NULL values to current_timestamp
-- ====================================================================
UPDATE public.assignment_submissions
SET submitted_at = NOW()
WHERE submitted_at IS NULL;

-- STEP 2: Alter column to add proper default
-- ====================================================================
ALTER TABLE public.assignment_submissions
ALTER COLUMN submitted_at SET DEFAULT NOW();

-- STEP 3: Add created_at if it doesn't exist (for auditing)
-- ====================================================================
ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- STEP 4: Verify the changes
-- ====================================================================
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN submitted_at IS NOT NULL THEN 1 END) as with_submitted_at,
    COUNT(CASE WHEN student_name IS NOT NULL AND student_name != 'Unknown Student' THEN 1 END) as with_student_names
FROM public.assignment_submissions;

-- ====================================================================
-- Done! submitted_at now defaults to current timestamp
-- ====================================================================
