-- ============================================================================
-- MIGRATE EXISTING ANNOTATION DATA
-- Converts JSON annotations embedded in assignment_submissions
-- into the new submission_annotations table
-- Run in Supabase SQL Editor AFTER 001 and 002
-- ============================================================================

DO $$
BEGIN
    -- 1. Migrate annotations from the embedded JSON column (if the column exists)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assignment_submissions'
          AND column_name = 'annotations'
    ) THEN
        EXECUTE '
        INSERT INTO public.submission_annotations (
            submission_id, author_id, annotation_type,
            page_number, text_range_start, text_range_end, selected_text,
            comment_text, color, created_at
        )
        SELECT
            sub.id AS submission_id,
            sub.student_id AS author_id,
            CASE WHEN ann->>''type'' = ''note'' THEN ''text_comment'' ELSE ''highlight'' END,
            1,
            (ann->''range''->>''start'')::INTEGER,
            (ann->''range''->>''end'')::INTEGER,
            NULL,
            ann->>''text'',
            COALESCE(ann->>''color'', ''#FFEB3B''),
            COALESCE((ann->>''createdAt'')::TIMESTAMPTZ, NOW())
        FROM public.assignment_submissions sub,
             jsonb_array_elements(
                 CASE
                     WHEN sub.annotations IS NOT NULL
                          AND sub.annotations::text != ''null''
                          AND sub.annotations::text != ''[]''
                     THEN sub.annotations::jsonb
                     ELSE ''[]''::jsonb
                 END
             ) AS ann
        WHERE sub.annotations IS NOT NULL
          AND sub.annotations::text != ''null''
          AND sub.annotations::text != ''[]'';
        ';
    END IF;

    -- 2. Migrate rubric_grades JSON to normalised rubric_criterion_grades (if column exists)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assignment_submissions'
          AND column_name = 'rubric_grades'
    ) THEN
        EXECUTE '
        INSERT INTO public.rubric_criterion_grades (submission_id, criterion_id, score, graded_by)
        SELECT
            sub.id,
            key::UUID,
            value::DOUBLE PRECISION,
            sub.graded_by
        FROM public.assignment_submissions sub,
             jsonb_each_text(
                 CASE
                     WHEN sub.rubric_grades IS NOT NULL
                          AND sub.rubric_grades::text != ''null''
                          AND sub.rubric_grades::text != ''{}''
                     THEN sub.rubric_grades::jsonb
                     ELSE ''{}''::jsonb
                 END
             )
        WHERE sub.rubric_grades IS NOT NULL
          AND sub.rubric_grades::text != ''null''
          AND sub.rubric_grades::text != ''{}'';
        ';
    END IF;
END $$;

-- 3. Verify migration results
SELECT 'submission_annotations' AS table_name, COUNT(*) AS row_count
FROM public.submission_annotations
UNION ALL
SELECT 'rubric_criterion_grades', COUNT(*)
FROM public.rubric_criterion_grades;
