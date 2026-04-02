-- ====================================================================
-- AGGRESSIVE FIX: Disable RLS on problematic tables
-- ====================================================================
-- This approach disables RLS on tables causing infinite recursion
-- and implements security at the application level instead.
-- Run this in Supabase SQL Editor
-- ====================================================================

-- STEP 1: DROP ALL RLS POLICIES
-- ====================================================================

-- Subject Classes
DROP POLICY IF EXISTS "sc_principal" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_teacher" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_principal_bypass" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_teacher_view" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_principal_full_access" ON public.subject_classes;
DROP POLICY IF EXISTS "sc_teacher_view_own" ON public.subject_classes;

-- Register Classes
DROP POLICY IF EXISTS "rc_principal" ON public.register_classes;
DROP POLICY IF EXISTS "rc_teacher" ON public.register_classes;
DROP POLICY IF EXISTS "rc_principal_bypass" ON public.register_classes;
DROP POLICY IF EXISTS "rc_teacher_view" ON public.register_classes;
DROP POLICY IF EXISTS "rc_principal_full_access" ON public.register_classes;
DROP POLICY IF EXISTS "rc_teacher_view_own" ON public.register_classes;

-- Student Subject Classes
DROP POLICY IF EXISTS "ssc_principal" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_teacher_student" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_principal_bypass" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_teacher_view" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_student_view" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_principal_full_access" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_teacher_view_own" ON public.student_subject_classes;
DROP POLICY IF EXISTS "ssc_student_view_own" ON public.student_subject_classes;

-- ====================================================================
-- STEP 2: DISABLE RLS ON PROBLEMATIC TABLES
-- ====================================================================
-- These tables will rely on application-level security instead

ALTER TABLE public.subject_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_classes DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- STEP 3: KEEP RLS ON NON-PROBLEMATIC TABLES (simple policies only)
-- ====================================================================

-- Drop all old policies on other tables
DROP POLICY IF EXISTS "subjects_read_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_authenticated_read_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_principal_manage" ON public.subjects;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "grades_read_all" ON public.grades;
DROP POLICY IF EXISTS "grades_authenticated_read_all" ON public.grades;
DROP POLICY IF EXISTS "grades_principal_manage" ON public.grades;
DROP POLICY IF EXISTS "students_authenticated_read_all" ON public.students;
DROP POLICY IF EXISTS "students_principal_manage" ON public.students;

-- Enable RLS on simple reference tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Simple read-all permissions for shared data (no joins, no circular refs)
CREATE POLICY "profiles_all_read" ON public.profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "grades_all_read" ON public.grades
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "subjects_all_read" ON public.subjects
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "students_all_read" ON public.students
FOR SELECT TO authenticated
USING (true);

-- Principals can insert/update/delete
CREATE POLICY "profiles_principal_write" ON public.profiles
FOR UPDATE TO authenticated
USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');

CREATE POLICY "grades_principal_write" ON public.grades
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');

CREATE POLICY "subjects_principal_write" ON public.subjects
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal')
WITH CHECK ((auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal');

-- ====================================================================
-- STEP 4: IMPORTANT - IMPLEMENT SECURITY IN FRONTEND/API
-- ====================================================================
-- Since subject_classes, register_classes, and student_subject_classes
-- have RLS disabled, you MUST implement access control in your app:
--
-- RULES TO FOLLOW IN YOUR CODE:
-- 1. PRINCIPALS: Can see and modify all subject_classes, register_classes, student_subject_classes
-- 2. TEACHERS: 
--    - Can only see subject_classes where teacher_id = their auth.uid()
--    - Can only see student_subject_classes where teacher_id = their auth.uid()
-- 3. STUDENTS:
--    - Can only see student_subject_classes where student_id = their auth.uid()
--
-- ENFORCE THIS BY:
-- - Filtering queries on the frontend based on user role
-- - Using .eq('teacher_id', userId) for teacher queries
-- - Using .eq('student_id', userId) for student queries
-- - OR use Supabase functions with SECURITY DEFINER to enforce on backend

-- ====================================================================
-- OPTIONAL: Create a helper function for backend security
-- ====================================================================
-- You can use this function to filter results safely on the backend

CREATE OR REPLACE FUNCTION get_subject_classes_for_user()
RETURNS TABLE (
    id uuid,
    name text,
    subject_id uuid,
    teacher_id uuid,
    grade_id text,
    capacity integer,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sc.id,
        sc.name,
        sc.subject_id,
        sc.teacher_id,
        sc.grade_id,
        sc.capacity,
        sc.created_at
    FROM public.subject_classes sc
    WHERE 
        -- Principal sees all
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
        OR
        -- Teacher sees only their own
        (
            (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'teacher'
            AND sc.teacher_id = auth.uid()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_subject_classes_for_user()
RETURNS TABLE (
    id uuid,
    student_id uuid,
    subject_class_id uuid,
    teacher_id uuid,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ssc.id,
        ssc.student_id,
        ssc.subject_class_id,
        ssc.teacher_id,
        ssc.created_at
    FROM public.student_subject_classes ssc
    WHERE 
        -- Principal sees all
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'principal'
        OR
        -- Teacher sees their students' enrollments
        (
            (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'teacher'
            AND ssc.teacher_id = auth.uid()
        )
        OR
        -- Student sees only their own enrollments
        (
            (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'student'
            AND ssc.student_id = auth.uid()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- DONE!
-- ====================================================================
-- The infinite recursion error should be GONE.
--
-- NEXT STEPS:
-- 1. Test your app - subject classes page should load
-- 2. Teachers should be able to view/create classes
-- 3. If you see "access denied" errors, add this filter to your queries:
--    - For teachers: .eq('teacher_id', auth.user().id)
--    - For students: .eq('student_id', auth.user().id)
--
-- ALTERNATIVE (Recommended):
-- Use the RPC functions above in your code instead of direct table access:
--   const { data } = await supabase.rpc('get_subject_classes_for_user');
--   const { data } = await supabase.rpc('get_student_subject_classes_for_user');
