-- =============================================================================
-- Parent dashboard read access backfill
-- =============================================================================
-- Safe follow-up for the parent mobile dashboard. Each block checks for the
-- target table/column before applying RLS, so this can be run on databases that
-- do not have every optional dashboard table yet.
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.assignments') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'assignments'
             AND column_name = 'subject_id'
       )
    THEN
        EXECUTE 'ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "assignments_read_parent_family" ON public.assignments';
        EXECUTE 'CREATE POLICY "assignments_read_parent_family"
            ON public.assignments
            FOR SELECT
            TO authenticated
            USING (
                public.current_profile_role() IN (''teacher'', ''principal'', ''admin'')
                OR public.is_parent_of_subject(subject_id)
            )';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.announcements') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "announcements_read_authenticated" ON public.announcements';
        EXECUTE 'CREATE POLICY "announcements_read_authenticated"
            ON public.announcements
            FOR SELECT
            TO authenticated
            USING (auth.uid() IS NOT NULL)';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.student_gradebook_scores') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'student_gradebook_scores'
             AND column_name = 'student_id'
       )
    THEN
        EXECUTE 'ALTER TABLE public.student_gradebook_scores ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "student_gradebook_scores_read" ON public.student_gradebook_scores';
        EXECUTE 'DROP POLICY IF EXISTS "student_gradebook_scores_read_parent_family" ON public.student_gradebook_scores';
        EXECUTE 'CREATE POLICY "student_gradebook_scores_read_parent_family"
            ON public.student_gradebook_scores
            FOR SELECT
            TO authenticated
            USING (
                student_id = auth.uid()
                OR public.current_profile_role() IN (''teacher'', ''principal'', ''admin'')
                OR public.is_parent_of_student(student_id)
            )';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.register_attendance_entries') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'register_attendance_entries'
             AND column_name = 'student_id'
       )
    THEN
        EXECUTE 'ALTER TABLE public.register_attendance_entries ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "register_attendance_entries_read" ON public.register_attendance_entries';
        EXECUTE 'DROP POLICY IF EXISTS "register_attendance_entries_read_parent_family" ON public.register_attendance_entries';
        EXECUTE 'CREATE POLICY "register_attendance_entries_read_parent_family"
            ON public.register_attendance_entries
            FOR SELECT
            TO authenticated
            USING (
                student_id = auth.uid()
                OR public.current_profile_role() IN (''teacher'', ''principal'', ''admin'')
                OR public.is_parent_of_student(student_id)
            )';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.register_attendance_sessions') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'register_attendance_sessions'
             AND column_name = 'register_class_id'
       )
    THEN
        EXECUTE 'ALTER TABLE public.register_attendance_sessions ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "register_attendance_sessions_read" ON public.register_attendance_sessions';
        EXECUTE 'DROP POLICY IF EXISTS "register_attendance_sessions_read_parent_family" ON public.register_attendance_sessions';
        EXECUTE 'CREATE POLICY "register_attendance_sessions_read_parent_family"
            ON public.register_attendance_sessions
            FOR SELECT
            TO authenticated
            USING (
                public.current_profile_role() IN (''teacher'', ''principal'', ''admin'')
                OR public.is_parent_of_register_class(register_class_id)
                OR EXISTS (
                    SELECT 1
                    FROM public.students s
                    WHERE s.id = auth.uid()
                      AND s.register_class_id = register_attendance_sessions.register_class_id
                )
            )';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.register_timetable_slots') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'register_timetable_slots'
             AND column_name = 'register_class_id'
       )
    THEN
        EXECUTE 'ALTER TABLE public.register_timetable_slots ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "register_timetable_slots_read" ON public.register_timetable_slots';
        EXECUTE 'DROP POLICY IF EXISTS "register_timetable_slots_read_parent_family" ON public.register_timetable_slots';
        EXECUTE 'CREATE POLICY "register_timetable_slots_read_parent_family"
            ON public.register_timetable_slots
            FOR SELECT
            TO authenticated
            USING (
                public.current_profile_role() IN (''teacher'', ''principal'', ''admin'')
                OR public.is_parent_of_register_class(register_class_id)
                OR EXISTS (
                    SELECT 1
                    FROM public.students s
                    WHERE s.id = auth.uid()
                      AND s.register_class_id = register_timetable_slots.register_class_id
                )
            )';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.assignment_groups') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'assignment_groups'
             AND column_name = 'subject_id'
       )
    THEN
        EXECUTE 'ALTER TABLE public.assignment_groups ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "assignment_groups_read_parent_family" ON public.assignment_groups';
        EXECUTE 'CREATE POLICY "assignment_groups_read_parent_family"
            ON public.assignment_groups
            FOR SELECT
            TO authenticated
            USING (
                public.current_profile_role() IN (''teacher'', ''principal'', ''admin'')
                OR public.is_parent_of_subject(subject_id)
            )';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.quizzes') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'quizzes'
             AND column_name = 'subject_id'
       )
    THEN
        EXECUTE 'ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "quizzes_read_parent_family" ON public.quizzes';
        EXECUTE 'CREATE POLICY "quizzes_read_parent_family"
            ON public.quizzes
            FOR SELECT
            TO authenticated
            USING (
                public.current_profile_role() IN (''teacher'', ''principal'', ''admin'')
                OR public.is_parent_of_subject(subject_id)
            )';
    END IF;
END $$;
