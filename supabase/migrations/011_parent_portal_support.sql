-- =============================================================================
-- Parent portal support
-- =============================================================================
-- Adds the parent-child link table plus RLS helpers for parent access.
-- Run this in Supabase SQL editor or via the migration pipeline.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship_label TEXT NOT NULL DEFAULT 'parent',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id
    ON public.parent_students(parent_id);

CREATE INDEX IF NOT EXISTS idx_parent_students_student_id
    ON public.parent_students(student_id);

ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(target_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.parent_students ps
        WHERE ps.parent_id = auth.uid()
          AND ps.student_id = target_student_id
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_parent_of_student(UUID) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_parent_or_principal()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
    ) IN ('parent', 'principal');
$$;

REVOKE EXECUTE ON FUNCTION public.is_parent_or_principal() FROM anon, authenticated;

DROP POLICY IF EXISTS "parent_students_select_linked" ON public.parent_students;
CREATE POLICY "parent_students_select_linked"
ON public.parent_students
FOR SELECT
TO authenticated
USING (
    parent_id = auth.uid()
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'principal'
);

DROP POLICY IF EXISTS "parent_students_insert_principal" ON public.parent_students;
CREATE POLICY "parent_students_insert_principal"
ON public.parent_students
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'principal');

DROP POLICY IF EXISTS "parent_students_update_principal" ON public.parent_students;
CREATE POLICY "parent_students_update_principal"
ON public.parent_students
FOR UPDATE
TO authenticated
USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'principal')
WITH CHECK (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'principal');

DROP POLICY IF EXISTS "parent_students_delete_principal" ON public.parent_students;
CREATE POLICY "parent_students_delete_principal"
ON public.parent_students
FOR DELETE
TO authenticated
USING (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') = 'principal');

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_staff_or_parent" ON public.profiles;
CREATE POLICY "profiles_select_self_or_staff_or_parent"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
    OR public.is_parent_of_student(id)
);
