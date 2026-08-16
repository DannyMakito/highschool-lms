-- =============================================================================
-- Parent discussion chat access
-- =============================================================================
-- Lets parents read and reply to discussion threads that belong to their linked
-- learners, while keeping the existing teacher/student discussion rules intact.
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.discussions') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'discussions'
             AND column_name = 'subject_id'
       )
    THEN
        EXECUTE 'ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "discussions_read_parent_family" ON public.discussions';
        EXECUTE 'CREATE POLICY "discussions_read_parent_family"
            ON public.discussions
            FOR SELECT
            TO authenticated
            USING (public.is_parent_of_subject(subject_id))';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.discussion_replies') IS NOT NULL
    THEN
        EXECUTE 'ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "discussion_replies_read_parent_family" ON public.discussion_replies';
        EXECUTE 'CREATE POLICY "discussion_replies_read_parent_family"
            ON public.discussion_replies
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.discussions d
                    WHERE d.id = discussion_id
                      AND public.is_parent_of_subject(d.subject_id)
                )
            )';

        EXECUTE 'DROP POLICY IF EXISTS "discussion_replies_create_parent_family" ON public.discussion_replies';
        EXECUTE 'CREATE POLICY "discussion_replies_create_parent_family"
            ON public.discussion_replies
            FOR INSERT
            TO authenticated
            WITH CHECK (
                auth.uid() = author_id
                AND EXISTS (
                    SELECT 1
                    FROM public.discussions d
                    WHERE d.id = discussion_id
                      AND public.is_parent_of_subject(d.subject_id)
                )
            )';
    END IF;
END $$;