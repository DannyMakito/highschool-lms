-- =============================================================================
-- Gradebook Scores Support
-- =============================================================================
-- Run this after gradebook_support.sql.
-- Adds max_points to the subject gradebook setup and stores learner scores
-- against each setup column.
-- =============================================================================

ALTER TABLE public.assignment_groups
ADD COLUMN IF NOT EXISTS max_points NUMERIC(6,2) NOT NULL DEFAULT 5;

UPDATE public.assignment_groups
SET max_points = COALESCE(NULLIF(max_points, 0), 5);

CREATE TABLE IF NOT EXISTS public.student_gradebook_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    assignment_group_id UUID NOT NULL REFERENCES public.assignment_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    score NUMERIC(6,2) NOT NULL DEFAULT 0,
    feedback TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, assignment_group_id)
);

ALTER TABLE public.student_gradebook_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_gradebook_scores_read" ON public.student_gradebook_scores;
CREATE POLICY "student_gradebook_scores_read" ON public.student_gradebook_scores
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "student_gradebook_scores_teacher_write" ON public.student_gradebook_scores;
CREATE POLICY "student_gradebook_scores_teacher_write" ON public.student_gradebook_scores
FOR ALL TO authenticated
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
)
WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);

-- Optional sanity checks:
-- SELECT subject_id, name, weight_percentage, max_points, "order"
-- FROM public.assignment_groups
-- ORDER BY subject_id, "order";
--
-- SELECT subject_id, assignment_group_id, student_id, score, updated_at
-- FROM public.student_gradebook_scores
-- ORDER BY updated_at DESC;
