-- Parent-facing academic status: submissions and quiz outcomes for linked children.
-- These policies expose read-only information only.
DO $$
BEGIN
    IF to_regclass('public.assignment_submissions') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "assignment_submissions_read_parent_family" ON public.assignment_submissions';
        EXECUTE 'CREATE POLICY "assignment_submissions_read_parent_family" ON public.assignment_submissions FOR SELECT TO authenticated USING (
          student_id = auth.uid() OR public.current_profile_role() IN (''teacher'', ''principal'', ''admin'') OR public.is_parent_of_student(student_id)
        )';
    END IF;
    IF to_regclass('public.quiz_submissions') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "quiz_submissions_read_parent_family" ON public.quiz_submissions';
        EXECUTE 'CREATE POLICY "quiz_submissions_read_parent_family" ON public.quiz_submissions FOR SELECT TO authenticated USING (
          student_id = auth.uid() OR public.current_profile_role() IN (''teacher'', ''principal'', ''admin'') OR public.is_parent_of_student(student_id)
        )';
    END IF;
END $$;
