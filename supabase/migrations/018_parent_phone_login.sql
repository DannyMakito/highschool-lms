-- Allow parent portal sign-in with either email or cellphone number.
-- The function only resolves accounts that are already linked to at least one learner.

CREATE OR REPLACE FUNCTION public.resolve_parent_login_identifier(p_identifier TEXT)
RETURNS TABLE (
    auth_method TEXT,
    auth_identifier TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH normalized AS (
        SELECT
            LOWER(TRIM(COALESCE(p_identifier, ''))) AS lowered,
            regexp_replace(COALESCE(p_identifier, ''), '[^0-9]+', '', 'g') AS digits
    )
    SELECT
        CASE
            WHEN NULLIF(TRIM(p.email), '') IS NOT NULL THEN 'email'
            ELSE 'phone'
        END AS auth_method,
        COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(p.cellphone), '')) AS auth_identifier
    FROM public.profiles p
    CROSS JOIN normalized n
    WHERE p.role = 'parent'
      AND EXISTS (
          SELECT 1
          FROM public.parent_students ps
          WHERE ps.parent_id = p.id
      )
      AND (
          LOWER(TRIM(COALESCE(p.email, ''))) = n.lowered
          OR (
              n.digits <> ''
              AND regexp_replace(COALESCE(p.cellphone, ''), '[^0-9]+', '', 'g') = n.digits
          )
      )
      AND COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(p.cellphone), '')) IS NOT NULL
    ORDER BY
        CASE WHEN LOWER(TRIM(COALESCE(p.email, ''))) = n.lowered THEN 0 ELSE 1 END,
        p.id
    LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_parent_login_identifier(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_parent_login_identifier(TEXT) TO anon, authenticated;
