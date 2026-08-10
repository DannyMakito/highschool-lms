-- Allow parents to start a discussion thread for a subject class linked to one
-- of their children. The thread can then be reused for replies by both sides.

DO $$
BEGIN
    IF to_regclass('public.discussions') IS NOT NULL
    THEN
        EXECUTE 'ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "discussions_create_parent_family" ON public.discussions';
        EXECUTE 'CREATE POLICY "discussions_create_parent_family"
            ON public.discussions
            FOR INSERT
            TO authenticated
            WITH CHECK (
                auth.uid() = author_id
                AND public.is_parent_of_subject_class(subject_class_id)
            )';
    END IF;
END $$;
