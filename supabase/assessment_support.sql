-- =============================================================================
-- Assessment Support: weighting, release windows, and rubric ordering
-- =============================================================================
-- Run this in the Supabase SQL editor.
-- =============================================================================

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS available_from DATE,
ADD COLUMN IF NOT EXISTS assessment_category TEXT CHECK (assessment_category IN ('assignment', 'test', 'quiz', 'exam', 'project')),
ADD COLUMN IF NOT EXISTS assessment_period TEXT CHECK (assessment_period IN ('term', 'year')),
ADD COLUMN IF NOT EXISTS contribution_weight NUMERIC(5,2) DEFAULT 0;

UPDATE public.assignments
SET
    available_from = COALESCE(available_from, created_at::date, due_date::date),
    assessment_category = COALESCE(assessment_category, 'assignment'),
    assessment_period = COALESCE(assessment_period, 'term'),
    contribution_weight = COALESCE(contribution_weight, 0);

ALTER TABLE public.rubric_criteria
ADD COLUMN IF NOT EXISTS "order" INTEGER;

WITH ordered_criteria AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY rubric_id ORDER BY created_at NULLS LAST, id) AS row_num
    FROM public.rubric_criteria
)
UPDATE public.rubric_criteria rc
SET "order" = oc.row_num
FROM ordered_criteria oc
WHERE rc.id = oc.id
  AND rc."order" IS NULL;

-- Optional sanity check:
-- SELECT id, title, available_from, assessment_category, assessment_period, contribution_weight
-- FROM public.assignments
-- ORDER BY created_at DESC;
