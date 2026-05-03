-- =============================================================================
-- Rubric RLS alignment for teacher assessment workflows
-- =============================================================================
-- Allows authenticated users to read rubrics and rubric criteria.
-- Allows teachers/principals to create and manage rubric templates.
-- =============================================================================

ALTER TABLE IF EXISTS public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rubric_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rubrics_select_authenticated" ON public.rubrics;
CREATE POLICY "rubrics_select_authenticated"
ON public.rubrics
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rubrics_insert_teacher_principal" ON public.rubrics;
CREATE POLICY "rubrics_insert_teacher_principal"
ON public.rubrics
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "rubrics_update_teacher_principal" ON public.rubrics;
CREATE POLICY "rubrics_update_teacher_principal"
ON public.rubrics
FOR UPDATE
TO authenticated
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
)
WITH CHECK (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "rubrics_delete_teacher_principal" ON public.rubrics;
CREATE POLICY "rubrics_delete_teacher_principal"
ON public.rubrics
FOR DELETE
TO authenticated
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "rubric_criteria_select_authenticated" ON public.rubric_criteria;
CREATE POLICY "rubric_criteria_select_authenticated"
ON public.rubric_criteria
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rubric_criteria_insert_teacher_principal" ON public.rubric_criteria;
CREATE POLICY "rubric_criteria_insert_teacher_principal"
ON public.rubric_criteria
FOR INSERT
TO authenticated
WITH CHECK (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "rubric_criteria_update_teacher_principal" ON public.rubric_criteria;
CREATE POLICY "rubric_criteria_update_teacher_principal"
ON public.rubric_criteria
FOR UPDATE
TO authenticated
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
)
WITH CHECK (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "rubric_criteria_delete_teacher_principal" ON public.rubric_criteria;
CREATE POLICY "rubric_criteria_delete_teacher_principal"
ON public.rubric_criteria
FOR DELETE
TO authenticated
USING (
  COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
);
