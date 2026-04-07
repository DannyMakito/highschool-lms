-- =============================================================================
-- Gradebook Support
-- =============================================================================
-- Run this in the Supabase SQL editor.
-- Adds subject gradebook groups and assessment inclusion metadata.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.assignment_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.assignment_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS counts_towards_final BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.assignment_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS counts_towards_final BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS points_possible INTEGER;

UPDATE public.assignments
SET counts_towards_final = COALESCE(counts_towards_final, true);

UPDATE public.quizzes
SET counts_towards_final = COALESCE(counts_towards_final, true);

ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignment_groups_read" ON public.assignment_groups;
CREATE POLICY "assignment_groups_read" ON public.assignment_groups
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "assignment_groups_teacher_write" ON public.assignment_groups;
CREATE POLICY "assignment_groups_teacher_write" ON public.assignment_groups
FOR ALL TO authenticated
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
)
WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);
