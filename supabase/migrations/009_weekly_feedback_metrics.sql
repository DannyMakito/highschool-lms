-- Weekly external feedback prompt metrics
-- This migration adds prompt configuration and prompt-event tracking tables.

CREATE TABLE IF NOT EXISTS public.feedback_form_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  end_date DATE,
  target_roles TEXT[] NOT NULL DEFAULT ARRAY['learner', 'teacher', 'principal'],
  target_portals TEXT[] NOT NULL DEFAULT ARRAY['student', 'teacher', 'principal'],
  form_version TEXT NOT NULL DEFAULT 'v1',
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feedback_prompt_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  role TEXT NOT NULL,
  portal TEXT NOT NULL,
  form_version TEXT,
  shown_count INTEGER NOT NULL DEFAULT 0,
  first_shown_at TIMESTAMPTZ,
  last_shown_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  submitted_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_feedback_prompt_events_user_week
  ON public.feedback_prompt_events (user_id, week_key);

CREATE INDEX IF NOT EXISTS idx_feedback_prompt_events_week
  ON public.feedback_prompt_events (week_key);

CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_form_config_updated_at ON public.feedback_form_config;
CREATE TRIGGER trg_feedback_form_config_updated_at
BEFORE UPDATE ON public.feedback_form_config
FOR EACH ROW
EXECUTE FUNCTION public.update_feedback_updated_at();

DROP TRIGGER IF EXISTS trg_feedback_prompt_events_updated_at ON public.feedback_prompt_events;
CREATE TRIGGER trg_feedback_prompt_events_updated_at
BEFORE UPDATE ON public.feedback_prompt_events
FOR EACH ROW
EXECUTE FUNCTION public.update_feedback_updated_at();

ALTER TABLE public.feedback_form_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_prompt_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_form_config_select_authenticated" ON public.feedback_form_config;
CREATE POLICY "feedback_form_config_select_authenticated"
ON public.feedback_form_config
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "feedback_form_config_insert_principal" ON public.feedback_form_config;
CREATE POLICY "feedback_form_config_insert_principal"
ON public.feedback_form_config
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'principal'
  )
);

DROP POLICY IF EXISTS "feedback_form_config_update_principal" ON public.feedback_form_config;
CREATE POLICY "feedback_form_config_update_principal"
ON public.feedback_form_config
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'principal'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'principal'
  )
);

DROP POLICY IF EXISTS "feedback_form_config_delete_principal" ON public.feedback_form_config;
CREATE POLICY "feedback_form_config_delete_principal"
ON public.feedback_form_config
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'principal'
  )
);

DROP POLICY IF EXISTS "feedback_prompt_events_insert_self" ON public.feedback_prompt_events;
CREATE POLICY "feedback_prompt_events_insert_self"
ON public.feedback_prompt_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "feedback_prompt_events_update_self_or_principal" ON public.feedback_prompt_events;
CREATE POLICY "feedback_prompt_events_update_self_or_principal"
ON public.feedback_prompt_events
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'principal'
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'principal'
  )
);

DROP POLICY IF EXISTS "feedback_prompt_events_select_self_or_principal" ON public.feedback_prompt_events;
CREATE POLICY "feedback_prompt_events_select_self_or_principal"
ON public.feedback_prompt_events
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

INSERT INTO public.feedback_form_config (
  form_url,
  is_active,
  form_version,
  title,
  description
)
SELECT
  'https://forms.gle/replace-with-your-feedback-form',
  false,
  'v1',
  'Weekly System Feedback',
  'Rate system functions out of 10 and share improvements.'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.feedback_form_config
);
