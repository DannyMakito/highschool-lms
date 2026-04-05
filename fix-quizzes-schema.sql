-- Add missing questions column to quizzes table
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS questions JSONB;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS settings_configured BOOLEAN DEFAULT FALSE;

-- Add RLS policies for quizzes if they don't exist
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quizzes are readable by authenticated users" ON public.quizzes;
CREATE POLICY "Quizzes are readable by authenticated users" ON public.quizzes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Quizzes are manageable by teachers and principals" ON public.quizzes;
CREATE POLICY "Quizzes are manageable by teachers and principals" ON public.quizzes
FOR ALL TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('teacher', 'principal')
)
WITH CHECK (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('teacher', 'principal')
);

-- Ensure quiz_submissions has proper columns and RLS too
ALTER TABLE public.quiz_submissions ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.quiz_submissions ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Update RLS for quiz_submissions
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Submissions are readable by teachers and principals" ON public.quiz_submissions;
CREATE POLICY "Submissions are readable by teachers and principals" ON public.quiz_submissions
FOR SELECT TO authenticated
USING (
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' IN ('teacher', 'principal')
);

DROP POLICY IF EXISTS "Students can create their own submissions" ON public.quiz_submissions;
CREATE POLICY "Students can create their own submissions" ON public.quiz_submissions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can read their own submissions" ON public.quiz_submissions;
CREATE POLICY "Students can read their own submissions" ON public.quiz_submissions
FOR SELECT TO authenticated
USING (auth.uid() = student_id);
