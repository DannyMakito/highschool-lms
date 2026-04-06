-- ============================================================================
-- SPEEDGRADER SCHEMA MIGRATION
-- Canvas-style decoupled annotation architecture
-- Run in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. NEW TABLE: submission_files
-- Tracks raw file metadata separately from submission content
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    file_size_bytes BIGINT,
    page_count INTEGER,
    version INTEGER DEFAULT 1,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),

    CONSTRAINT valid_mime_type CHECK (mime_type IN ('application/pdf', 'text/plain', 'text/html'))
);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON public.submission_files(submission_id);

-- ============================================================================
-- 2. NEW TABLE: submission_annotations
-- Each annotation is its own row with full coordinate data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.submission_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id),

    -- Annotation type
    annotation_type TEXT NOT NULL CHECK (annotation_type IN (
        'highlight',
        'drawing',
        'text_comment',
        'area_comment',
        'strikethrough'
    )),

    -- Spatial positioning (percentage-based 0-100 relative to page dimensions)
    page_number INTEGER NOT NULL DEFAULT 1,
    x_percent DOUBLE PRECISION,
    y_percent DOUBLE PRECISION,
    width_percent DOUBLE PRECISION,
    height_percent DOUBLE PRECISION,

    -- For text submissions: character offset range
    text_range_start INTEGER,
    text_range_end INTEGER,
    selected_text TEXT,

    -- Drawing data (fabric.js serialized path)
    drawing_data JSONB,

    -- Comment content
    comment_text TEXT,

    -- Visual properties
    color TEXT DEFAULT '#FFEB3B',
    opacity DOUBLE PRECISION DEFAULT 0.35,

    -- Rubric linking
    rubric_criterion_id UUID,

    -- State
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotations_submission ON public.submission_annotations(submission_id);
CREATE INDEX IF NOT EXISTS idx_annotations_author ON public.submission_annotations(author_id);
CREATE INDEX IF NOT EXISTS idx_annotations_page ON public.submission_annotations(submission_id, page_number);
CREATE INDEX IF NOT EXISTS idx_annotations_criterion ON public.submission_annotations(rubric_criterion_id);

-- ============================================================================
-- 3. NEW TABLE: rubric_criterion_grades
-- Normalised per-criterion scores (replaces the JSON blob)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rubric_criterion_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    criterion_id UUID NOT NULL REFERENCES public.rubric_criteria(id) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    feedback TEXT,
    graded_by UUID REFERENCES auth.users(id),
    graded_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_submission_criterion UNIQUE (submission_id, criterion_id),
    CONSTRAINT score_non_negative CHECK (score >= 0)
);

CREATE INDEX IF NOT EXISTS idx_criterion_grades_submission ON public.rubric_criterion_grades(submission_id);

-- ============================================================================
-- 4. ALTER TABLE: assignment_submissions  –  new columns
-- ============================================================================
ALTER TABLE public.assignment_submissions
    ADD COLUMN IF NOT EXISTS file_id UUID,
    ADD COLUMN IF NOT EXISTS graded_by UUID,
    ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS submission_version INTEGER DEFAULT 1;

-- ============================================================================
-- 5. ENABLE RLS on new tables
-- ============================================================================
ALTER TABLE public.submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criterion_grades ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. Enable realtime for annotation collaboration
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.submission_annotations;
