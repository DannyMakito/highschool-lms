-- A per-recipient inbox.  Rows are deliberately removed when read, so an alert
-- is shown once and the unread badge always reflects only actionable updates.
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('assessment', 'quiz', 'content', 'grading', 'submission', 'discussion', 'announcement', 'homework')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    href TEXT,
    subject_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (recipient_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS user_notifications_recipient_created_idx
    ON public.user_notifications(recipient_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage their own notifications" ON public.user_notifications;
CREATE POLICY "users manage their own notifications"
ON public.user_notifications FOR ALL TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Creates an inbox item for each learner enrolled in a subject and every parent
-- linked to those learners.  Conflict handling makes this safe for retries and
-- for real-time clients reconnecting after an event.
CREATE OR REPLACE FUNCTION public.notify_subject_community(
    p_subject_id UUID,
    p_source_type TEXT,
    p_source_id UUID,
    p_category TEXT,
    p_title TEXT,
    p_description TEXT,
    p_href TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_subject_name TEXT;
BEGIN
    SELECT name INTO v_subject_name FROM subjects WHERE id = p_subject_id;
    INSERT INTO user_notifications (recipient_id, source_type, source_id, category, title, description, href, subject_name)
    SELECT DISTINCT recipient_id, p_source_type, p_source_id, p_category, p_title, p_description, p_href, v_subject_name
    FROM (
        SELECT ss.student_id AS recipient_id
        FROM student_subjects ss WHERE ss.subject_id = p_subject_id
        UNION
        SELECT ps.parent_id
        FROM parent_students ps
        JOIN student_subjects ss ON ss.student_id = ps.student_id
        WHERE ss.subject_id = p_subject_id
    ) recipients
    ON CONFLICT (recipient_id, source_type, source_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_teachers_for_subject(
    p_subject_id UUID, p_source_type TEXT, p_source_id UUID, p_title TEXT, p_description TEXT, p_href TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_subject_name TEXT;
BEGIN
    SELECT name INTO v_subject_name FROM subjects WHERE id = p_subject_id;
    INSERT INTO user_notifications (recipient_id, source_type, source_id, category, title, description, href, subject_name)
    SELECT DISTINCT teacher_id, p_source_type, p_source_id, 'submission', p_title, p_description, p_href, v_subject_name
    FROM teacher_subjects WHERE subject_id = p_subject_id
    ON CONFLICT (recipient_id, source_type, source_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_lms_notification() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_data JSONB := to_jsonb(NEW);
    v_old JSONB := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
    v_subject_id UUID;
    v_title TEXT;
BEGIN
    IF TG_TABLE_NAME = 'assignments' AND COALESCE(v_data->>'status', 'published') = 'published' THEN
        v_subject_id := (v_data->>'subject_id')::UUID;
        v_title := COALESCE(v_data->>'title', 'New assignment');
        PERFORM notify_subject_community(v_subject_id, 'assignment', NEW.id, 'assessment', 'New assignment', v_title, '/student/assignments/' || NEW.id);
    ELSIF TG_TABLE_NAME = 'quizzes' AND COALESCE(v_data->>'status', 'published') = 'published' THEN
        v_subject_id := (v_data->>'subject_id')::UUID;
        v_title := COALESCE(v_data->>'title', 'New quiz');
        PERFORM notify_subject_community(v_subject_id, 'quiz', NEW.id, 'quiz', 'New quiz', v_title, '/student/quizzes/' || NEW.id);
    ELSIF TG_TABLE_NAME = 'homework_alerts' AND COALESCE(v_data->>'status', 'published') = 'published' THEN
        v_subject_id := (v_data->>'subject_id')::UUID;
        v_title := COALESCE(v_data->>'title', 'New homework');
        PERFORM notify_subject_community(v_subject_id, 'homework', NEW.id, 'homework', 'New homework', v_title, '/student/homework');
    ELSIF TG_TABLE_NAME = 'lessons' THEN
        SELECT t.subject_id INTO v_subject_id FROM topics t WHERE t.id = (v_data->>'topic_id')::UUID;
        v_title := COALESCE(v_data->>'title', 'New class content');
        PERFORM notify_subject_community(v_subject_id, 'lesson', NEW.id, 'content', 'New class content', v_title, NULL);
    ELSIF TG_TABLE_NAME = 'assignment_submissions' THEN
        SELECT subject_id INTO v_subject_id FROM assignments WHERE id = (v_data->>'assignment_id')::UUID;
        IF TG_OP = 'INSERT' THEN
            PERFORM notify_teachers_for_subject(v_subject_id, 'assignment-submission', NEW.id, 'New assignment submission', 'A learner submitted work for marking.', '/teacher/assignments/' || (v_data->>'assignment_id') || '/grade');
        ELSIF COALESCE(v_data->>'is_released', 'false') = 'true'
              AND COALESCE(v_old->>'is_released', 'false') <> 'true' THEN
            INSERT INTO user_notifications (recipient_id, source_type, source_id, category, title, description, href)
            SELECT recipient_id, 'assignment-grade', NEW.id, 'grading', 'Assignment feedback released', 'Your marked assignment is ready to review.', '/student/assignments/' || (v_data->>'assignment_id')
            FROM (
                SELECT (v_data->>'student_id')::UUID AS recipient_id
                UNION
                SELECT parent_id FROM parent_students WHERE student_id = (v_data->>'student_id')::UUID
            ) recipients
            ON CONFLICT (recipient_id, source_type, source_id) DO NOTHING;
        END IF;
    ELSIF TG_TABLE_NAME = 'quiz_submissions' AND COALESCE(v_data->>'status', '') = 'completed' THEN
        SELECT subject_id, title INTO v_subject_id, v_title FROM quizzes WHERE id = (v_data->>'quiz_id')::UUID;
        PERFORM notify_teachers_for_subject(v_subject_id, 'quiz-submission', NEW.id, 'New quiz attempt submitted', 'A learner completed ' || COALESCE(v_title, 'a quiz') || '.', '/teacher/assignments/quizzes/' || (v_data->>'quiz_id') || '/analytics');
        INSERT INTO user_notifications (recipient_id, source_type, source_id, category, title, description, href)
        SELECT recipient_id, 'quiz-result', NEW.id, 'grading', 'Quiz result available', COALESCE(v_title, 'A quiz') || ' is ready to review.', '/student/quizzes/' || (v_data->>'quiz_id')
        FROM (
            SELECT (v_data->>'student_id')::UUID AS recipient_id
            UNION
            SELECT parent_id FROM parent_students WHERE student_id = (v_data->>'student_id')::UUID
        ) recipients
        ON CONFLICT (recipient_id, source_type, source_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assignments_notification_trigger ON public.assignments;
CREATE TRIGGER assignments_notification_trigger AFTER INSERT OR UPDATE OF status ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.dispatch_lms_notification();
DROP TRIGGER IF EXISTS quizzes_notification_trigger ON public.quizzes;
CREATE TRIGGER quizzes_notification_trigger AFTER INSERT OR UPDATE OF status ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.dispatch_lms_notification();
DROP TRIGGER IF EXISTS homework_notification_trigger ON public.homework_alerts;
CREATE TRIGGER homework_notification_trigger AFTER INSERT OR UPDATE OF status ON public.homework_alerts FOR EACH ROW EXECUTE FUNCTION public.dispatch_lms_notification();
DROP TRIGGER IF EXISTS lessons_notification_trigger ON public.lessons;
CREATE TRIGGER lessons_notification_trigger AFTER INSERT ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.dispatch_lms_notification();
DROP TRIGGER IF EXISTS assignment_submissions_notification_trigger ON public.assignment_submissions;
CREATE TRIGGER assignment_submissions_notification_trigger AFTER INSERT OR UPDATE OF is_released ON public.assignment_submissions FOR EACH ROW EXECUTE FUNCTION public.dispatch_lms_notification();
DROP TRIGGER IF EXISTS quiz_submissions_notification_trigger ON public.quiz_submissions;
CREATE TRIGGER quiz_submissions_notification_trigger AFTER INSERT OR UPDATE OF status ON public.quiz_submissions FOR EACH ROW EXECUTE FUNCTION public.dispatch_lms_notification();
