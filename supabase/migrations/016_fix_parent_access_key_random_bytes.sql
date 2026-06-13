-- =============================================================================
-- Fix parent access key generation on Supabase extension schema
-- =============================================================================
-- Some Supabase projects keep pgcrypto functions in the extensions schema.
-- Recreate only the generator function with explicit extensions.* calls.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_parent_access_key(
    p_student_id UUID,
    p_expires_in_days INTEGER DEFAULT 14
)
RETURNS TABLE (
    id UUID,
    access_key TEXT,
    student_id UUID,
    expires_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    generated_key TEXT;
    generated_hash TEXT;
    next_expires_at TIMESTAMPTZ;
    inserted_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication is required';
    END IF;

    IF NOT public.can_manage_parent_access_for_student(p_student_id) THEN
        RAISE EXCEPTION 'You do not have permission to generate parent access for this learner';
    END IF;

    generated_key := UPPER(encode(extensions.gen_random_bytes(6), 'hex'));
    generated_hash := encode(extensions.digest(generated_key::TEXT, 'sha256'::TEXT), 'hex');
    next_expires_at := now() + make_interval(days => GREATEST(1, LEAST(COALESCE(p_expires_in_days, 14), 60)));

    INSERT INTO public.parent_access_keys (student_id, key_hash, created_by, expires_at)
    VALUES (p_student_id, generated_hash, auth.uid(), next_expires_at)
    RETURNING parent_access_keys.id INTO inserted_id;

    RETURN QUERY
    SELECT inserted_id, generated_key, p_student_id, next_expires_at, 'active'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_parent_access_key(UUID, INTEGER) TO authenticated;
