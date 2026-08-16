-- =============================================================================
-- Parent dashboard read access
-- =============================================================================
-- Grants parents read access to the content used by the mobile dashboard.
-- Assumes 011_parent_portal_support.sql and 012_parent_child_read_access.sql
-- have already been applied.
-- =============================================================================

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments_read_parent_family" ON public.assignments;
CREATE POLICY "assignments_read_parent_family"
ON public.assignments
FOR SELECT
TO authenticated
USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('teacher', 'principal')
    OR public.is_parent_of_subject(subject_id)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_read_authenticated" ON public.announcements;
CREATE POLICY "announcements_read_authenticated"
ON public.announcements
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

