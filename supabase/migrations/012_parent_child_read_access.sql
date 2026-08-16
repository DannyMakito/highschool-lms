-- =============================================================================
-- Parent child read access
-- =============================================================================
-- Extends the core school-data RLS policies so a parent can read only the
-- records linked to their children.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_parent_of_subject(target_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.student_subjects ss
        INNER JOIN public.parent_students ps
            ON ps.student_id = ss.student_id
        WHERE ps.parent_id = auth.uid()
          AND ss.subject_id = target_subject_id
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_parent_of_subject(UUID) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_parent_of_subject_class(target_subject_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.student_subject_classes ssc
        INNER JOIN public.parent_students ps
            ON ps.student_id = ssc.student_id
        WHERE ps.parent_id = auth.uid()
          AND ssc.subject_class_id = target_subject_class_id
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_parent_of_subject_class(UUID) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_parent_of_register_class(target_register_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.students s
        INNER JOIN public.parent_students ps
            ON ps.student_id = s.id
        WHERE ps.parent_id = auth.uid()
          AND s.register_class_id = target_register_class_id
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_parent_of_register_class(UUID) FROM anon, authenticated;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "students_select_parent_linked" ON public.students;
CREATE POLICY "students_select_parent_linked"
ON public.students
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
    OR public.is_parent_of_student(id)
);

ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_subjects_select_parent_linked" ON public.student_subjects;
CREATE POLICY "student_subjects_select_parent_linked"
ON public.student_subjects
FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
    OR public.is_parent_of_student(student_id)
);

ALTER TABLE public.student_subject_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_subject_classes_select_parent_linked" ON public.student_subject_classes;
CREATE POLICY "student_subject_classes_select_parent_linked"
ON public.student_subject_classes
FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
    OR public.is_parent_of_student(student_id)
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_read_v2" ON public.subjects;
CREATE POLICY "subjects_read_v2" ON public.subjects
FOR SELECT TO authenticated
USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('principal', 'teacher')
    OR public.check_subject_enrollment(id, auth.uid())
    OR public.is_parent_of_subject(id)
);

ALTER TABLE public.subject_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subject_classes_read_v2" ON public.subject_classes;
CREATE POLICY "subject_classes_read_v2" ON public.subject_classes
FOR SELECT TO authenticated
USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'principal'
    OR teacher_id = auth.uid()
    OR public.check_enrollment(id, auth.uid())
    OR public.is_parent_of_subject_class(id)
);

ALTER TABLE public.register_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "register_classes_read_v2" ON public.register_classes;
CREATE POLICY "register_classes_read_v2" ON public.register_classes
FOR SELECT TO authenticated
USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'principal'
    OR class_teacher_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = auth.uid()
          AND s.register_class_id = register_classes.id
    )
    OR public.is_parent_of_register_class(register_classes.id)
);
