
-- ============================================================================
-- COMPREHENSIVE RLS RECURSION FIX (JWT VERSION)
-- ============================================================================
-- This migration breaks circular dependencies by using JWT metadata for role checks
-- and SECURITY DEFINER functions for enrollment checks.
-- ============================================================================

-- 1. DROP EXISTING HELPERS
DROP FUNCTION IF EXISTS public.is_student_in_class(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_student_in_subject(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_teacher_of_class(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;

-- 2. CREATE ROBUST SECURITY DEFINER HELPERS (Bypass RLS)
CREATE OR REPLACE FUNCTION public.check_enrollment(class_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_subject_classes WHERE subject_class_id = class_id AND student_id = user_id);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_subject_enrollment(sub_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_subjects WHERE subject_id = sub_id AND student_id = user_id);
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_class_ownership(class_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.subject_classes WHERE id = class_id AND teacher_id = user_id);
$$ LANGUAGE sql SECURITY DEFINER;


-- 3. RESET POLICIES USING JWT ROLE CHECKS (Avoids querying 'profiles' table)

-- HELPER MACRO-LIKE CHECKS (for use in policies)
-- Principal: auth.jwt() -> 'user_metadata' ->> 'role' = 'principal'
-- Teacher:   auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher'

-- === SUBJECT_CLASSES ===
ALTER TABLE public.subject_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subject_classes_read" ON public.subject_classes;
DROP POLICY IF EXISTS "subject_classes_write" ON public.subject_classes;
DROP POLICY IF EXISTS "Allow authenticated read subject_classes" ON public.subject_classes;
DROP POLICY IF EXISTS "subject_classes_manager" ON public.subject_classes;

CREATE POLICY "subject_classes_read_v2" ON public.subject_classes
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'principal')
    OR (teacher_id = auth.uid())
    OR (public.check_enrollment(id, auth.uid()))
);

CREATE POLICY "subject_classes_write_v2" ON public.subject_classes
FOR ALL TO authenticated
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'principal');


-- === STUDENT_SUBJECT_CLASSES ===
ALTER TABLE public.student_subject_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_subject_classes_read" ON public.student_subject_classes;
DROP POLICY IF EXISTS "student_subject_classes_write" ON public.student_subject_classes;
DROP POLICY IF EXISTS "Allow authenticated read enrollments" ON public.student_subject_classes;
DROP POLICY IF EXISTS "enrollments_manager" ON public.student_subject_classes;

CREATE POLICY "student_subject_classes_read_v2" ON public.student_subject_classes
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'principal')
    OR (student_id = auth.uid())
    OR (public.check_class_ownership(subject_class_id, auth.uid()))
);

CREATE POLICY "student_subject_classes_write_v2" ON public.student_subject_classes
FOR ALL TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('principal', 'teacher'))
);


-- === SUBJECTS ===
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_read" ON public.subjects;
CREATE POLICY "subjects_read_v2" ON public.subjects
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('principal', 'teacher'))
    OR (public.check_subject_enrollment(id, auth.uid()))
);


-- === STUDENT_SUBJECTS ===
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_subjects_read" ON public.student_subjects;
CREATE POLICY "student_subjects_read_v2" ON public.student_subjects
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' IN ('principal', 'teacher'))
    OR (student_id = auth.uid())
);


-- === GRADES ===
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grades_read" ON public.grades;
CREATE POLICY "grades_read_v2" ON public.grades
FOR SELECT TO authenticated
USING (true);


-- === REGISTER_CLASSES ===
ALTER TABLE public.register_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "register_classes_read" ON public.register_classes;
CREATE POLICY "register_classes_read_v2" ON public.register_classes
FOR SELECT TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'principal')
    OR (class_teacher_id = auth.uid())
    OR (EXISTS (SELECT 1 FROM public.students WHERE id = auth.uid() AND register_class_id = register_classes.id))
);
