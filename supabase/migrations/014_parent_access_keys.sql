-- =============================================================================
-- Parent access-key auth support
-- =============================================================================
-- Staff generate one-time learner access keys for parents. The plain key is
-- returned only once from generate_parent_access_key; Supabase stores a hash.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cellphone TEXT;

CREATE TABLE IF NOT EXISTS public.parent_access_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
    claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_parent_access_keys_student_id
    ON public.parent_access_keys(student_id);

CREATE INDEX IF NOT EXISTS idx_parent_access_keys_created_by
    ON public.parent_access_keys(created_by);

ALTER TABLE public.parent_access_keys ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid()),
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
    );
$$;

REVOKE EXECUTE ON FUNCTION public.current_profile_role() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_parent_access_for_student(target_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN public.current_profile_role() IN ('principal', 'admin') THEN TRUE
        WHEN public.current_profile_role() = 'register-teacher' THEN EXISTS (
            SELECT 1
            FROM public.students s
            INNER JOIN public.register_classes rc
                ON rc.id = s.register_class_id
            WHERE s.id = target_student_id
              AND rc.class_teacher_id = auth.uid()
        )
        WHEN public.current_profile_role() = 'teacher' THEN EXISTS (
            SELECT 1
            FROM public.students s
            INNER JOIN public.register_classes rc
                ON rc.id = s.register_class_id
            WHERE s.id = target_student_id
              AND rc.class_teacher_id = auth.uid()
        )
        ELSE FALSE
    END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_parent_access_for_student(UUID) FROM anon, authenticated;

DROP POLICY IF EXISTS "parent_access_keys_staff_select" ON public.parent_access_keys;
CREATE POLICY "parent_access_keys_staff_select"
ON public.parent_access_keys
FOR SELECT
TO authenticated
USING (public.can_manage_parent_access_for_student(student_id));

DROP POLICY IF EXISTS "parent_access_keys_staff_insert" ON public.parent_access_keys;
CREATE POLICY "parent_access_keys_staff_insert"
ON public.parent_access_keys
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND public.can_manage_parent_access_for_student(student_id)
);

DROP POLICY IF EXISTS "parent_access_keys_staff_update" ON public.parent_access_keys;
CREATE POLICY "parent_access_keys_staff_update"
ON public.parent_access_keys
FOR UPDATE
TO authenticated
USING (public.can_manage_parent_access_for_student(student_id))
WITH CHECK (public.can_manage_parent_access_for_student(student_id));

CREATE OR REPLACE FUNCTION public.parent_access_key_status(
    claimed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN revoked_at IS NOT NULL THEN 'revoked'
        WHEN claimed_at IS NOT NULL THEN 'claimed'
        WHEN expires_at < now() THEN 'expired'
        ELSE 'active'
    END;
$$;

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

CREATE OR REPLACE FUNCTION public.get_parent_access_keys()
RETURNS TABLE (
    id UUID,
    student_id UUID,
    student_full_name TEXT,
    administration_number TEXT,
    grade_label TEXT,
    class_label TEXT,
    created_by UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    claimed_by UUID,
    claimed_by_name TEXT,
    claimed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        pak.id,
        pak.student_id,
        COALESCE(student_profile.full_name, 'Learner') AS student_full_name,
        s.administration_number,
        g.name AS grade_label,
        rc.name AS class_label,
        pak.created_by,
        creator.full_name AS created_by_name,
        pak.created_at,
        pak.expires_at,
        pak.claimed_by,
        claimant.full_name AS claimed_by_name,
        pak.claimed_at,
        pak.revoked_at,
        public.parent_access_key_status(pak.claimed_at, pak.revoked_at, pak.expires_at) AS status
    FROM public.parent_access_keys pak
    INNER JOIN public.students s
        ON s.id = pak.student_id
    LEFT JOIN public.profiles student_profile
        ON student_profile.id = pak.student_id
    LEFT JOIN public.grades g
        ON g.id = s.grade_id
    LEFT JOIN public.register_classes rc
        ON rc.id = s.register_class_id
    LEFT JOIN public.profiles creator
        ON creator.id = pak.created_by
    LEFT JOIN public.profiles claimant
        ON claimant.id = pak.claimed_by
    WHERE public.can_manage_parent_access_for_student(pak.student_id)
    ORDER BY pak.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.revoke_parent_access_key(p_access_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_student_id UUID;
BEGIN
    SELECT student_id INTO target_student_id
    FROM public.parent_access_keys
    WHERE id = p_access_key_id;

    IF target_student_id IS NULL THEN
        RAISE EXCEPTION 'Parent access key not found';
    END IF;

    IF NOT public.can_manage_parent_access_for_student(target_student_id) THEN
        RAISE EXCEPTION 'You do not have permission to revoke this parent access key';
    END IF;

    UPDATE public.parent_access_keys
    SET revoked_at = now()
    WHERE id = p_access_key_id
      AND claimed_at IS NULL
      AND revoked_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_parent_access_key(p_access_key TEXT)
RETURNS TABLE (
    access_key_id UUID,
    student_id UUID,
    student_full_name TEXT,
    administration_number TEXT,
    grade_label TEXT,
    class_label TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        pak.id,
        pak.student_id,
        COALESCE(student_profile.full_name, 'Learner') AS student_full_name,
        s.administration_number,
        g.name AS grade_label,
        rc.name AS class_label
    FROM public.parent_access_keys pak
    INNER JOIN public.students s
        ON s.id = pak.student_id
    LEFT JOIN public.profiles student_profile
        ON student_profile.id = pak.student_id
    LEFT JOIN public.grades g
        ON g.id = s.grade_id
    LEFT JOIN public.register_classes rc
        ON rc.id = s.register_class_id
    WHERE pak.key_hash = encode(
        extensions.digest(
            UPPER(regexp_replace(COALESCE(p_access_key, ''), '[[:space:]]+', '', 'g'))::TEXT,
            'sha256'::TEXT
        ),
        'hex'
    )
      AND pak.claimed_at IS NULL
      AND pak.revoked_at IS NULL
      AND pak.expires_at >= now()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.claim_parent_access_key(
    p_access_key TEXT,
    p_parent_id UUID,
    p_full_name TEXT,
    p_cellphone TEXT,
    p_email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_key_id UUID;
    target_student_id UUID;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_parent_id THEN
        RAISE EXCEPTION 'Parent must be authenticated before claiming access';
    END IF;

    SELECT access_key_id, student_id
    INTO target_key_id, target_student_id
    FROM public.verify_parent_access_key(p_access_key)
    LIMIT 1;

    IF target_key_id IS NULL OR target_student_id IS NULL THEN
        RAISE EXCEPTION 'This parent access key is invalid, expired, or already used';
    END IF;

    INSERT INTO public.profiles (id, full_name, email, role, cellphone)
    VALUES (p_parent_id, NULLIF(TRIM(p_full_name), ''), p_email, 'parent', NULLIF(TRIM(p_cellphone), ''))
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        cellphone = COALESCE(EXCLUDED.cellphone, public.profiles.cellphone),
        role = 'parent';

    INSERT INTO public.parent_students (parent_id, student_id, relationship_label, is_primary)
    VALUES (p_parent_id, target_student_id, 'parent', TRUE)
    ON CONFLICT (parent_id, student_id) DO UPDATE
    SET relationship_label = EXCLUDED.relationship_label,
        is_primary = TRUE;

    UPDATE public.parent_access_keys
    SET claimed_by = p_parent_id,
        claimed_at = now()
    WHERE id = target_key_id
      AND claimed_at IS NULL
      AND revoked_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_parent_access_key(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_access_keys() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_parent_access_key(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_parent_access_key(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_parent_access_key(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
