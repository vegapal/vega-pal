-- Subscriptions lifecycle + user activity logs.
-- profiles.plan remains a cached effective plan for UI/quick reads.
-- Authoritative entitlement: active subscription with ends_at > now().

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'canceled', 'pending')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'admin_manual'
    CHECK (source IN ('admin_manual', 'crypto', 'stripe', 'other')),
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_ends_at_idx ON public.subscriptions (ends_at);
CREATE INDEX IF NOT EXISTS subscriptions_user_active_idx
  ON public.subscriptions (user_id, status, ends_at DESC);

CREATE OR REPLACE FUNCTION public.subscriptions_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.subscriptions_set_updated_at();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users may read only their own subscription rows (no insert/update/delete from client).
DROP POLICY IF EXISTS "Users can select own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can select own subscriptions"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Effective plan: paid only while an active (non-expired) subscription exists.
CREATE OR REPLACE FUNCTION public.get_effective_plan(p_user_id uuid)
RETURNS public.user_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
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
$$;

REVOKE ALL ON FUNCTION public.get_effective_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_plan(uuid) TO service_role;

-- Invoice limit uses effective plan (not stale profiles.plan alone).
CREATE OR REPLACE FUNCTION public.enforce_invoice_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_plan public.user_plan;
  monthly_count integer;
BEGIN
  effective_plan := public.get_effective_plan(NEW.user_id);

  IF effective_plan = 'free' THEN
    monthly_count := public.count_user_invoices_this_month(NEW.user_id);
    IF monthly_count >= 5 THEN
      RAISE EXCEPTION 'FREE_PLAN_INVOICE_LIMIT'
        USING MESSAGE = 'You have reached the Free plan limit of 5 invoices this month. Upgrade to Pro to create unlimited invoices.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invoice_plan_usage()
RETURNS TABLE (
  plan public.user_plan,
  invoices_this_month integer,
  monthly_limit integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.get_effective_plan(auth.uid()),
    public.count_user_invoices_this_month(auth.uid()),
    CASE WHEN public.get_effective_plan(auth.uid()) = 'free' THEN 5 ELSE NULL END;
$$;

-- User activity (minimal metadata; no secrets / full payment details).
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_logs_user_id_created_at_idx
  ON public.user_activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_logs_action_idx
  ON public.user_activity_logs (action);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own activity" ON public.user_activity_logs;
CREATE POLICY "Users can select own activity"
  ON public.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts only via service role / SECURITY DEFINER helpers.
GRANT SELECT ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;

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
  INSERT INTO public.user_activity_logs (user_id, action, description, metadata)
  VALUES (p_user_id, left(trim(p_action), 80), left(coalesce(p_description, ''), 280), coalesce(p_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.log_user_activity(uuid, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_user_activity(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity(uuid, text, text, jsonb) TO service_role;

-- Expire due subscriptions and sync profiles.plan (cleanup; entitlement still uses get_effective_plan).
CREATE OR REPLACE FUNCTION public.expire_due_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, user_id, plan
    FROM public.subscriptions
    WHERE status = 'active'
      AND ends_at <= timezone('UTC', now())
  LOOP
    UPDATE public.subscriptions
    SET status = 'expired',
        updated_at = now()
    WHERE id = r.id;

    -- Only downgrade profile if no other active sub remains.
    IF public.get_effective_plan(r.user_id) = 'free' THEN
      UPDATE public.profiles
      SET plan = 'free',
          updated_at = now()
      WHERE id = r.user_id
        AND plan <> 'free';
    END IF;

    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_due_subscriptions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_due_subscriptions() TO service_role;
