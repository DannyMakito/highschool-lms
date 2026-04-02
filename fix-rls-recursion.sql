-- ====================================================================
-- FIX RLS INFINITE RECURSION ISSUE - subject_classes
-- ====================================================================
-- Run this SQL script directly in Supabase SQL Editor
-- Go to: Dashboard > SQL Editor > New Query > Paste this entire script
-- ====================================================================

-- STEP 1: DROP ALL PROBLEMATIC POLICIES
-- ====================================================================

-- Subject Classes policies
DROP POLICY IF EXISTS "sc_principal" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_teacher" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_principal_bypass" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_teacher_view" ON public.subject_classes;

-- Register Classes policies
DROP POLICY IF EXISTS "rc_principal" ON public.register_classes;
DROP POLICY IF EXISTS "rc_teacher" ON public.register_classes;
DROP POLICY IF EXISTS "rc_principal_bypass" ON public.register_classes;
DROP POLICY IF EXISTS "rc_teacher_view" ON public.register_classes;

-- Student Subject Classes policies
DROP POLICY IF EXISTS "ssc_principal" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_teacher_student" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_principal_bypass" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_teacher_view" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_student_view" ON public.student_subject_classes;

-- Other policies that might exist
DROP POLICY IF EXISTS "subjects_read_all" ON public.subjects;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "grades_read_all" ON public.grades;
DROP POLICY IF EXISTS "grades_authenticated_read_all" ON public.grades;
DROP POLICY IF EXISTS "grades_principal_manage" ON public.grades;
DROP POLICY IF EXISTS "subjects_authenticated_read_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_principal_manage" ON public.subjects;
DROP POLICY IF EXISTS "students_authenticated_read_all" ON public.students;
DROP POLICY IF EXISTS "students_principal_manage" ON public.students;
DROP POLICY IF EXISTS "sc_principal_full_access" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_teacher_view_own" ON public.subject_classes;
DROP POLICY IF EXISTS "rc_principal_full_access" ON public.register_classes;
DROP POLICY IF EXISTS "rc_teacher_view_own" ON public.register_classes;
DROP POLICY IF EXISTS "ssc_principal_full_access" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_teacher_view_own" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_student_view_own" ON public.student_subject_classes;

-- STEP 2: ENSURE RLS IS ENABLED
-- ====================================================================

ALTER TABLE public.subject_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- STEP 3: CREATE NEW, SIMPLE POLICIES (NO CIRCULAR DEPENDENCIES)
-- ====================================================================

-- ===== SUBJECT_CLASSES =====
-- Principals: Full access
CREATE POLICY "sc_principal_full_access" ON public.subject_classes
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
)
WITH CHECK (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
);

-- Teachers: Can only see their own classes
CREATE POLICY "sc_teacher_view_own" ON public.subject_classes
FOR SELECT TO authenticated
USING (
    teacher_id = auth.uid()
);

-- ===== REGISTER_CLASSES =====
-- Principals: Full access
CREATE POLICY "rc_principal_full_access" ON public.register_classes
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
)
WITH CHECK (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
);

-- Teachers: Can only see classes they teach
CREATE POLICY "rc_teacher_view_own" ON public.register_classes
FOR SELECT TO authenticated
USING (
    class_teacher_id = auth.uid()
);

-- ===== STUDENT_SUBJECT_CLASSES =====
-- Principals: Full access
CREATE POLICY "ssc_principal_full_access" ON public.student_subject_classes
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
)
WITH CHECK (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
);

-- Teachers: Can see their own class enrollments
CREATE POLICY "ssc_teacher_view_own" ON public.student_subject_classes
FOR SELECT TO authenticated
USING (
    teacher_id = auth.uid()
);

-- Students: Can see their own enrollments
CREATE POLICY "ssc_student_view_own" ON public.student_subject_classes
FOR SELECT TO authenticated
USING (
    student_id = auth.uid()
);

-- ===== PROFILES (allow reading all profiles) =====
CREATE POLICY "profiles_authenticated_read_all" ON public.profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ===== GRADES (allow reading all grades) =====
CREATE POLICY "grades_authenticated_read_all" ON public.grades
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "grades_principal_manage" ON public.grades
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
)
WITH CHECK (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
);

-- ===== SUBJECTS (allow reading all subjects) =====
CREATE POLICY "subjects_authenticated_read_all" ON public.subjects
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "subjects_principal_manage" ON public.subjects
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
)
WITH CHECK (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
);

-- ===== STUDENTS (allow reading all students) =====
CREATE POLICY "students_authenticated_read_all" ON public.students
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "students_principal_manage" ON public.students
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
)
WITH CHECK (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
);

-- ====================================================================
-- DONE! Your RLS policies are now rebuilt without circular dependencies
-- ====================================================================
-- Now test:
-- 1. Log in as a principal - you should see all subject classes
-- 2. Log in as a teacher - you should only see your own classes
-- 3. Log in as a student - you should only see your own enrollments

-- If you still get errors, check:
-- - Your JWT app_metadata has a 'role' claim
-- - The auth.uid() for teachers matches their ID in teacher_id/class_teacher_id columns
-- - The student enrollments are properly recorded in student_subject_classes
