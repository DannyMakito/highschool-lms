CREATE TABLE IF NOT EXISTS public.register_attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    register_class_id UUID NOT NULL REFERENCES public.register_classes(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (register_class_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS public.register_attendance_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.register_attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    mark TEXT NOT NULL CHECK (mark IN ('present', 'absent', 'late', 'excused')),
    note TEXT,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.register_timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    register_class_id UUID NOT NULL REFERENCES public.register_classes(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    period_label TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity_title TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_register_attendance_sessions_class_date
    ON public.register_attendance_sessions(register_class_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_register_attendance_entries_session
    ON public.register_attendance_entries(session_id);

CREATE INDEX IF NOT EXISTS idx_register_timetable_slots_class_day_time
    ON public.register_timetable_slots(register_class_id, day_of_week, start_time);

ALTER TABLE public.register_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_attendance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.register_timetable_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "register_attendance_sessions_read" ON public.register_attendance_sessions;
CREATE POLICY "register_attendance_sessions_read" ON public.register_attendance_sessions
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "register_attendance_entries_read" ON public.register_attendance_entries;
CREATE POLICY "register_attendance_entries_read" ON public.register_attendance_entries
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "register_timetable_slots_read" ON public.register_timetable_slots;
CREATE POLICY "register_timetable_slots_read" ON public.register_timetable_slots
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "register_attendance_sessions_teacher_write" ON public.register_attendance_sessions;
CREATE POLICY "register_attendance_sessions_teacher_write" ON public.register_attendance_sessions
FOR ALL TO authenticated
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
)
WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "register_attendance_entries_teacher_write" ON public.register_attendance_entries;
CREATE POLICY "register_attendance_entries_teacher_write" ON public.register_attendance_entries
FOR ALL TO authenticated
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
)
WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "register_timetable_slots_teacher_write" ON public.register_timetable_slots;
CREATE POLICY "register_timetable_slots_teacher_write" ON public.register_timetable_slots
FOR ALL TO authenticated
USING (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
)
WITH CHECK (
    auth.jwt() -> 'app_metadata' ->> 'role' IN ('teacher', 'principal')
);
