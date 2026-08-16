-- Parent academic read access must mirror the learner's direct and class-based
-- enrolment. A parent linked to a learner may read only that learner's subjects.

CREATE OR REPLACE FUNCTION public.is_parent_of_subject(target_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.parent_students ps
        LEFT JOIN public.student_subjects ss
            ON ss.student_id = ps.student_id
           AND ss.subject_id = target_subject_id
        LEFT JOIN public.student_subject_classes ssc
            ON ssc.student_id = ps.student_id
        LEFT JOIN public.subject_classes sc
            ON sc.id = ssc.subject_class_id
           AND sc.subject_id = target_subject_id
        WHERE ps.parent_id = auth.uid()
          AND (ss.subject_id IS NOT NULL OR sc.subject_id IS NOT NULL)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.is_parent_of_subject(UUID) FROM anon, authenticated;

-- Lesson content is reached through topic -> subject. These policies supplement
-- existing learner/staff policies without granting parents any write access.
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "topics_read_parent_family" ON public.topics;
CREATE POLICY "topics_read_parent_family"
ON public.topics FOR SELECT TO authenticated
USING (public.is_parent_of_subject(subject_id));

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_read_parent_family" ON public.lessons;
CREATE POLICY "lessons_read_parent_family"
ON public.lessons FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.topics t
        WHERE t.id = lessons.topic_id
          AND public.is_parent_of_subject(t.subject_id)
    )
);
