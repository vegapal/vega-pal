-- Non-destructive security hardening (RLS policies + RPC caller checks).
-- Apply in Supabase SQL editor or via db:migrate.

-- ---------------------------------------------------------------------------
-- F-1: log_user_activity — forbid cross-user forged activity entries
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id uuid,
  p_action text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR coalesce(nullif(trim(p_action), ''), '') = '' THEN
    RETURN;
  END IF;

  -- Authenticated callers may only log for themselves; service role (auth.uid() IS NULL) may log for any user.
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501', MESSAGE = 'Cannot log activity for another user.';
  END IF;

  INSERT INTO public.user_activity_logs (user_id, action, description, metadata)
  VALUES (
    p_user_id,
    left(trim(p_action), 80),
    left(coalesce(p_description, ''), 280),
    coalesce(p_metadata, '{}'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- F-4: get_effective_plan — block authenticated cross-user plan enumeration
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_effective_plan(p_user_id uuid)
RETURNS public.user_plan
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501', MESSAGE = 'Cannot read another user plan.';
  END IF;

  RETURN COALESCE(
    (
      SELECT s.plan::public.user_plan
      FROM public.subscriptions s
      WHERE s.user_id = p_user_id
        AND s.status = 'active'
        AND s.ends_at > timezone('UTC', now())
      ORDER BY s.ends_at DESC
      LIMIT 1
    ),
    'free'::public.user_plan
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- F-2/F-3: Tighten anon pay-link reads (draft + cancelled; honor document_status)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view non-draft invoices" ON public.invoices;
CREATE POLICY "Public can view non-draft invoices"
  ON public.invoices
  FOR SELECT
  TO anon
  USING (
    status IS DISTINCT FROM 'draft'
    AND status IS DISTINCT FROM 'cancelled'
    AND (
      document_status IS NULL
      OR document_status NOT IN ('draft', 'cancelled')
    )
  );

DROP POLICY IF EXISTS "Public can view items of non-draft invoices" ON public.invoice_items;
CREATE POLICY "Public can view items of non-draft invoices"
  ON public.invoice_items
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.status IS DISTINCT FROM 'draft'
        AND i.status IS DISTINCT FROM 'cancelled'
        AND (
          i.document_status IS NULL
          OR i.document_status NOT IN ('draft', 'cancelled')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- F-5: service_role grant on payment_methods (admin/server consistency)
-- ---------------------------------------------------------------------------
GRANT ALL ON TABLE public.payment_methods TO service_role;
