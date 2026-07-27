-- Paper-based homework alerts. These are intentionally separate from assessed
-- assignments: no submission, marks, or completion register is created.
CREATE TABLE IF NOT EXISTS public.homework_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    subject_class_id UUID REFERENCES public.subject_classes(id) ON DELETE SET NULL,
    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    instructions TEXT NOT NULL,
    textbook_reference TEXT,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    attachment_url TEXT,
    attachment_name TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT homework_alerts_due_after_assigned CHECK (due_date >= assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_homework_alerts_subject_due
    ON public.homework_alerts(subject_id, due_date);
CREATE INDEX IF NOT EXISTS idx_homework_alerts_subject_class
    ON public.homework_alerts(subject_class_id);

ALTER TABLE public.homework_alerts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_homework_alert_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS homework_alerts_updated_at ON public.homework_alerts;
CREATE TRIGGER homework_alerts_updated_at
BEFORE UPDATE ON public.homework_alerts
FOR EACH ROW EXECUTE FUNCTION public.set_homework_alert_updated_at();

DROP POLICY IF EXISTS "homework_alerts_read_school_community" ON public.homework_alerts;
CREATE POLICY "homework_alerts_read_school_community"
ON public.homework_alerts FOR SELECT TO authenticated
USING (
    public.current_profile_role() IN ('teacher', 'principal', 'admin')
    OR (status = 'published'
        AND public.is_parent_of_subject(subject_id)
        AND (subject_class_id IS NULL OR public.is_parent_of_subject_class(subject_class_id))
    )
    OR (status = 'published' AND EXISTS (
        SELECT 1 FROM public.student_subjects ss
        WHERE ss.student_id = auth.uid() AND ss.subject_id = homework_alerts.subject_id
    ) AND (
        subject_class_id IS NULL OR EXISTS (
            SELECT 1 FROM public.student_subject_classes ssc
            WHERE ssc.student_id = auth.uid() AND ssc.subject_class_id = homework_alerts.subject_class_id
        )
    ))
);

DROP POLICY IF EXISTS "homework_alerts_teacher_create" ON public.homework_alerts;
CREATE POLICY "homework_alerts_teacher_create"
ON public.homework_alerts FOR INSERT TO authenticated
WITH CHECK (
    public.current_profile_role() IN ('principal', 'admin')
    OR (
        public.current_profile_role() = 'teacher'
        AND created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.teacher_subjects ts
            WHERE ts.teacher_id = auth.uid() AND ts.subject_id = homework_alerts.subject_id
        )
    )
);

DROP POLICY IF EXISTS "homework_alerts_teacher_manage_own" ON public.homework_alerts;
CREATE POLICY "homework_alerts_teacher_manage_own"
ON public.homework_alerts FOR UPDATE TO authenticated
USING (public.current_profile_role() IN ('principal', 'admin') OR created_by = auth.uid())
WITH CHECK (public.current_profile_role() IN ('principal', 'admin') OR created_by = auth.uid());

DROP POLICY IF EXISTS "homework_alerts_teacher_delete_own" ON public.homework_alerts;
CREATE POLICY "homework_alerts_teacher_delete_own"
ON public.homework_alerts FOR DELETE TO authenticated
USING (public.current_profile_role() IN ('principal', 'admin') OR created_by = auth.uid());
