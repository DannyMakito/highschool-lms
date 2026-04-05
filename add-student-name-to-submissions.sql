-- ====================================================================
-- Add student_name column to assignment_submissions table
-- ====================================================================
-- Run this SQL script directly in Supabase SQL Editor
-- This allows storing student names with submissions for display in SpeedGrader
-- ====================================================================

-- STEP 1: Add the student_name column if it doesn't exist
-- ====================================================================
ALTER TABLE public.assignment_submissions
ADD COLUMN IF NOT EXISTS student_name VARCHAR(255) DEFAULT 'Unknown Student';

-- STEP 2: Populate existing submissions with student names from profiles
-- ====================================================================
UPDATE public.assignment_submissions sub
SET student_name = COALESCE(p.full_name, 'Unknown Student')
FROM public.profiles p
WHERE sub.student_id = p.id AND sub.student_name = 'Unknown Student';

-- STEP 3: Verify the update
-- ====================================================================
SELECT COUNT(*) as total_submissions, 
       COUNT(CASE WHEN student_name != 'Unknown Student' THEN 1 END) as populated_names
FROM public.assignment_submissions;

-- ====================================================================
-- Done! The student_name field is now available for submissions
-- ====================================================================
