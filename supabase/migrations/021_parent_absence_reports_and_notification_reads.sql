-- Parent-facing attendance communication and durable notification reads.

ALTER TABLE public.user_notifications
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE public.user_notifications
    DROP CONSTRAINT IF EXISTS user_notifications_category_check;

ALTER TABLE public.user_notifications
    ADD CONSTRAINT user_notifications_category_check
    CHECK (category IN ('assessment', 'quiz', 'content', 'grading', 'submission', 'discussion', 'announcement', 'homework', 'attendance'));

CREATE INDEX IF NOT EXISTS user_notifications_recipient_unread_idx
    ON public.user_notifications(recipient_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.parent_absence_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 3 AND 1000),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'accepted', 'declined')),
    staff_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (parent_id, student_id, absence_date)
);

CREATE INDEX IF NOT EXISTS parent_absence_reports_student_date_idx
    ON public.parent_absence_reports(student_id, absence_date DESC);

ALTER TABLE public.parent_absence_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents create absence reports for linked learners" ON public.parent_absence_reports;
CREATE POLICY "parents create absence reports for linked learners"
ON public.parent_absence_reports FOR INSERT TO authenticated
WITH CHECK (
    parent_id = auth.uid()
    AND public.is_parent_of_student(student_id)
);

DROP POLICY IF EXISTS "parents read their own absence reports" ON public.parent_absence_reports;
CREATE POLICY "parents read their own absence reports"
ON public.parent_absence_reports FOR SELECT TO authenticated
USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "staff manage absence reports" ON public.parent_absence_reports;
DROP POLICY IF EXISTS "staff read linked absence reports" ON public.parent_absence_reports;
CREATE POLICY "staff read linked absence reports"
ON public.parent_absence_reports FOR SELECT TO authenticated
USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('principal', 'admin')
    OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.register_classes rc ON rc.id = s.register_class_id
        WHERE s.id = parent_absence_reports.student_id
          AND rc.class_teacher_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "staff update linked absence reports" ON public.parent_absence_reports;
CREATE POLICY "staff update linked absence reports"
ON public.parent_absence_reports FOR UPDATE TO authenticated
USING (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('principal', 'admin')
    OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.register_classes rc ON rc.id = s.register_class_id
        WHERE s.id = parent_absence_reports.student_id
          AND rc.class_teacher_id = auth.uid()
    )
)
WITH CHECK (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('principal', 'admin')
    OR EXISTS (
        SELECT 1 FROM public.students s
        JOIN public.register_classes rc ON rc.id = s.register_class_id
        WHERE s.id = parent_absence_reports.student_id
          AND rc.class_teacher_id = auth.uid()
    )
);

CREATE OR REPLACE FUNCTION public.notify_parent_absence_report() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_student_name TEXT;
    v_teacher_id UUID;
BEGIN
    SELECT p.full_name, rc.class_teacher_id
    INTO v_student_name, v_teacher_id
    FROM students s
    LEFT JOIN profiles p ON p.id = s.id
    LEFT JOIN register_classes rc ON rc.id = s.register_class_id
    WHERE s.id = NEW.student_id;

    INSERT INTO user_notifications (recipient_id, source_type, source_id, category, title, description, href)
    VALUES (
        NEW.parent_id,
        'parent-absence-report',
        NEW.id,
        'attendance',
        'Absence report sent',
        COALESCE(v_student_name, 'Your child') || ' will be absent on ' || to_char(NEW.absence_date, 'DD Mon YYYY') || '. The school has been notified.',
        '/parent/absence-reports/' || NEW.id
    )
    ON CONFLICT (recipient_id, source_type, source_id) DO NOTHING;

    IF v_teacher_id IS NOT NULL THEN
        INSERT INTO user_notifications (recipient_id, source_type, source_id, category, title, description, href)
        VALUES (
            v_teacher_id,
            'parent-absence-report',
            NEW.id,
            'attendance',
            'Parent absence report',
            COALESCE(v_student_name, 'A learner') || ' has an absence report for ' || to_char(NEW.absence_date, 'DD Mon YYYY') || '.',
            NULL
        )
        ON CONFLICT (recipient_id, source_type, source_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parent_absence_reports_notification_trigger ON public.parent_absence_reports;
CREATE TRIGGER parent_absence_reports_notification_trigger
AFTER INSERT ON public.parent_absence_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_parent_absence_report();
