-- Canonical analytics schema + RLS policies
-- This migration aligns frontend tracking writes with stable, queryable columns.

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  session_duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  action TEXT NOT NULL,
  duration INTEGER,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  content_id TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- BACKWARD-COMPATIBLE COLUMNS (if legacy tables already exist)
-- ============================================================================

ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS login_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS logout_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_duration INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.content_interactions
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS content_id TEXT,
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS duration INTEGER,
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS interaction_type TEXT,
  ADD COLUMN IF NOT EXISTS lesson_id TEXT;

ALTER TABLE public.teacher_activities
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS content_id TEXT,
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ;

ALTER TABLE public.system_performance
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_login_time
  ON public.user_sessions (user_id, login_time DESC);

CREATE INDEX IF NOT EXISTS idx_content_interactions_user_timestamp
  ON public.content_interactions (user_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_content_interactions_type_action_timestamp
  ON public.content_interactions (content_type, action, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_activities_teacher_timestamp
  ON public.teacher_activities (teacher_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_system_performance_type_timestamp
  ON public.system_performance (event_type, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_user_timestamp
  ON public.feedback (user_id, "timestamp" DESC);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_performance ENABLE ROW LEVEL SECURITY;

-- user_sessions
DROP POLICY IF EXISTS "analytics_user_sessions_insert_self" ON public.user_sessions;
CREATE POLICY "analytics_user_sessions_insert_self"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "analytics_user_sessions_update_self" ON public.user_sessions;
CREATE POLICY "analytics_user_sessions_update_self"
ON public.user_sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "analytics_user_sessions_select_self_or_staff" ON public.user_sessions;
CREATE POLICY "analytics_user_sessions_select_self_or_staff"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'principal')
  )
);

-- content_interactions
DROP POLICY IF EXISTS "analytics_content_interactions_insert_self" ON public.content_interactions;
CREATE POLICY "analytics_content_interactions_insert_self"
ON public.content_interactions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "analytics_content_interactions_select_self_or_staff" ON public.content_interactions;
CREATE POLICY "analytics_content_interactions_select_self_or_staff"
ON public.content_interactions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'principal')
  )
);

-- teacher_activities
DROP POLICY IF EXISTS "analytics_teacher_activities_insert_teacher" ON public.teacher_activities;
CREATE POLICY "analytics_teacher_activities_insert_teacher"
ON public.teacher_activities
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'teacher'
  )
);

DROP POLICY IF EXISTS "analytics_teacher_activities_select_staff" ON public.teacher_activities;
CREATE POLICY "analytics_teacher_activities_select_staff"
ON public.teacher_activities
FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'principal')
  )
);

-- feedback
DROP POLICY IF EXISTS "analytics_feedback_insert_self" ON public.feedback;
CREATE POLICY "analytics_feedback_insert_self"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "analytics_feedback_select_self_or_principal" ON public.feedback;
CREATE POLICY "analytics_feedback_select_self_or_principal"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'principal'
  )
);

-- system_performance
DROP POLICY IF EXISTS "analytics_system_performance_insert_authenticated" ON public.system_performance;
CREATE POLICY "analytics_system_performance_insert_authenticated"
ON public.system_performance
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_system_performance_select_staff" ON public.system_performance;
CREATE POLICY "analytics_system_performance_select_staff"
ON public.system_performance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'principal')
  )
);
