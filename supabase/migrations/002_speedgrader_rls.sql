-- ============================================================================
-- RLS POLICIES FOR SPEEDGRADER TABLES
-- Run in Supabase SQL Editor AFTER 001_speedgrader_schema.sql
-- ============================================================================

-- ============================================================
-- submission_files
-- ============================================================

-- Students can view files for their own submissions
CREATE POLICY "students_view_own_files" ON public.submission_files
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.assignment_submissions s
        WHERE s.id = submission_files.submission_id
        AND s.student_id = auth.uid()
    )
);

-- Teachers / principals can view all files
CREATE POLICY "teachers_view_all_files" ON public.submission_files
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);

-- Students can insert files (linked to their own submissions)
CREATE POLICY "students_upload_files" ON public.submission_files
FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- Teachers can insert file metadata (admin uploads)
CREATE POLICY "teachers_upload_files" ON public.submission_files
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);

-- ============================================================
-- submission_annotations
-- ============================================================

-- Students can view annotations on their own released submissions
CREATE POLICY "students_view_released_annotations" ON public.submission_annotations
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.assignment_submissions s
        WHERE s.id = submission_annotations.submission_id
        AND s.student_id = auth.uid()
        AND s.is_released = true
    )
);

-- Teachers see all annotations
CREATE POLICY "teachers_select_annotations" ON public.submission_annotations
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);

-- Teachers can create annotations
CREATE POLICY "teachers_insert_annotations" ON public.submission_annotations
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);

-- Teachers can update their own annotations
CREATE POLICY "teachers_update_annotations" ON public.submission_annotations
FOR UPDATE TO authenticated
USING (
    author_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'principal'
    )
);

-- Teachers can delete their own annotations
CREATE POLICY "teachers_delete_annotations" ON public.submission_annotations
FOR DELETE TO authenticated
USING (
    author_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'principal'
    )
);

-- ============================================================
-- rubric_criterion_grades
-- ============================================================

-- Students can view their own released grades
CREATE POLICY "students_view_own_grades" ON public.rubric_criterion_grades
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.assignment_submissions s
        WHERE s.id = rubric_criterion_grades.submission_id
        AND s.student_id = auth.uid()
        AND s.is_released = true
    )
);

-- Teachers see all grades
CREATE POLICY "teachers_select_grades" ON public.rubric_criterion_grades
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);

-- Teachers can insert grades
CREATE POLICY "teachers_insert_grades" ON public.rubric_criterion_grades
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);

-- Teachers can update grades
CREATE POLICY "teachers_update_grades" ON public.rubric_criterion_grades
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);

-- Teachers can delete grades
CREATE POLICY "teachers_delete_grades" ON public.rubric_criterion_grades
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);

-- Allow teacher UPDATE on assignment_submissions (for grading fields)
DROP POLICY IF EXISTS "submission_teacher_update" ON public.assignment_submissions;
CREATE POLICY "submission_teacher_update" ON public.assignment_submissions
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('teacher', 'principal')
    )
);
