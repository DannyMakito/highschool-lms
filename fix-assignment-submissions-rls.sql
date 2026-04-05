-- ====================================================================
-- FIX: Add RLS policy for assignment_submissions
-- ====================================================================
-- This allows teachers and principals to view submissions
-- Run this SQL script directly in Supabase SQL Editor
-- Go to: Dashboard > SQL Editor > New Query > Paste this entire script
-- ====================================================================

-- STEP 1: Ensure RLS is enabled on assignment_submissions
-- ====================================================================
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop any existing policies
-- ====================================================================
DROP POLICY IF EXISTS "submission_student_read" ON public.assignment_submissions;
DROP POLICY IF EXISTS "submission_teacher_read" ON public.assignment_submissions;
DROP POLICY IF EXISTS "submission_principal_read" ON public.assignment_submissions;
DROP POLICY IF EXISTS "submission_student_write" ON public.assignment_submissions;
DROP POLICY IF EXISTS "submission_all_read" ON public.assignment_submissions;

-- STEP 3: Create new RLS policies
-- ====================================================================

-- Students can read their own submissions
CREATE POLICY "submission_student_read" ON public.assignment_submissions
FOR SELECT TO authenticated
USING (
    student_id = auth.uid()
);

-- Teachers can read all submissions (they need to see student submissions for grading)
CREATE POLICY "submission_teacher_read" ON public.assignment_submissions
FOR SELECT TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'teacher'
);

-- Principals can read all submissions
CREATE POLICY "submission_principal_read" ON public.assignment_submissions
FOR SELECT TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
);

-- Students can insert their own submissions
CREATE POLICY "submission_student_write" ON public.assignment_submissions
FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid()
);

-- Verify policies are created
SELECT * FROM pg_policies 
WHERE tablename = 'assignment_submissions' 
ORDER BY policyname;
