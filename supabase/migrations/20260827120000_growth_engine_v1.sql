-- Growth Engine V1: referral codes, attribution, bonuses, affiliates, commissions.
-- Additive only. Base Free limit remains 3 documents/month; bonuses increase effective allowance.

-- ---------------------------------------------------------------------------
-- referral_codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[A-Z0-9]{6,12}$'),
  CONSTRAINT referral_codes_user_unique UNIQUE (user_id),
  CONSTRAINT referral_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON public.referral_codes (code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_codes_select_own" ON public.referral_codes;
CREATE POLICY "referral_codes_select_own"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No insert/update/delete for authenticated — server/RPC only.

-- ---------------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'attributed'
    CHECK (status IN ('attributed', 'qualified', 'rewarded', 'rejected')),
  attributed_at timestamptz NOT NULL DEFAULT now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_referred_unique UNIQUE (referred_user_id),
  CONSTRAINT referrals_no_self CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals (status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own_as_referrer" ON public.referrals;
CREATE POLICY "referrals_select_own_as_referrer"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- ---------------------------------------------------------------------------
-- document_bonus_ledger (monthly promotional allowances)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_bonus_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0 AND amount <= 10),
  reason text NOT NULL CHECK (reason IN ('referral_referrer', 'referral_referred', 'admin_grant')),
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  month_key text NOT NULL, -- YYYY-MM UTC
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_bonus_referral_unique UNIQUE (referral_id, user_id, reason)
);

CREATE INDEX IF NOT EXISTS document_bonus_user_month_idx
  ON public.document_bonus_ledger (user_id, month_key);

ALTER TABLE public.document_bonus_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_bonus_select_own" ON public.document_bonus_ledger;
CREATE POLICY "document_bonus_select_own"
  ON public.document_bonus_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_attribution (first-touch)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_attribution (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_source text,
  first_medium text,
  first_campaign text,
  first_term text,
  first_content text,
  first_referral_code text,
  first_landing_path text,
  first_touch_at timestamptz NOT NULL DEFAULT now(),
  last_source text,
  last_medium text,
  last_campaign text,
  last_referral_code text,
  last_landing_path text,
  last_touch_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_attribution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_attribution_select_own" ON public.user_attribution;
CREATE POLICY "user_attribution_select_own"
  ON public.user_attribution FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- affiliates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.3000
    CHECK (commission_rate >= 0 AND commission_rate <= 1),
  notes text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliates_code_format CHECK (code ~ '^[A-Z0-9]{4,24}$'),
  CONSTRAINT affiliates_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS affiliates_code_idx ON public.affiliates (code);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated — admin/service only.

-- ---------------------------------------------------------------------------
-- affiliate_commissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_payment_request_id uuid NOT NULL
    REFERENCES public.subscription_payment_requests(id) ON DELETE CASCADE,
  gross_revenue_usd numeric(12,2) NOT NULL CHECK (gross_revenue_usd >= 0),
  commission_rate numeric(5,4) NOT NULL,
  commission_amount_usd numeric(12,2) NOT NULL CHECK (commission_amount_usd >= 0),
  status text NOT NULL DEFAULT 'earned'
    CHECK (status IN ('pending', 'earned', 'paid', 'rejected')),
  earned_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_commissions_payment_unique UNIQUE (subscription_payment_request_id)
);

CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_idx
  ON public.affiliate_commissions (affiliate_id);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated — admin/service only.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.utc_month_key(ts timestamptz DEFAULT now())
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char((ts AT TIME ZONE 'UTC'), 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.referral_codes WHERE code = candidate
    ) AND NOT EXISTS (
      SELECT 1 FROM public.affiliates WHERE code = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing text;
  new_code text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user required';
  END IF;

  SELECT code INTO existing FROM public.referral_codes WHERE user_id = p_user_id;
  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  new_code := public.generate_referral_code();
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, new_code)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT code INTO existing FROM public.referral_codes WHERE user_id = p_user_id;
  RETURN existing;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_bonus_docs(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LEAST(
    COALESCE(SUM(amount), 0)::integer,
    10
  )
  FROM public.document_bonus_ledger
  WHERE user_id = p_user_id
    AND month_key = public.utc_month_key(now());
$$;

-- Effective Free allowance = 3 + capped bonuses
CREATE OR REPLACE FUNCTION public.get_free_plan_monthly_allowance(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 3 + public.get_referral_bonus_docs(p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.enforce_invoice_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_plan public.user_plan;
  monthly_count integer;
  allowance integer;
BEGIN
  effective_plan := public.get_effective_plan(NEW.user_id);

  IF effective_plan = 'free' THEN
    monthly_count := public.count_user_invoices_this_month(NEW.user_id);
    allowance := public.get_free_plan_monthly_allowance(NEW.user_id);
    IF monthly_count >= allowance THEN
      RAISE EXCEPTION 'FREE_PLAN_INVOICE_LIMIT'
        USING MESSAGE = 'You have reached your Free plan document limit for this month. Upgrade to Pro or invite friends for bonus documents.';
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
    CASE
      WHEN public.get_effective_plan(auth.uid()) = 'free'
        THEN public.get_free_plan_monthly_allowance(auth.uid())
      ELSE NULL
    END;
$$;

-- ---------------------------------------------------------------------------
-- Claim referral attribution (authenticated caller = referred user)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_referral_attribution(
  p_code text,
  p_source text DEFAULT NULL,
  p_medium text DEFAULT NULL,
  p_campaign text DEFAULT NULL,
  p_term text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_landing_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text;
  ref_row public.referral_codes%ROWTYPE;
  aff_row public.affiliates%ROWTYPE;
  referrer uuid;
  used_code text;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  normalized := upper(trim(p_code));
  IF normalized IS NULL OR length(normalized) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  -- First-touch attribution (insert only)
  INSERT INTO public.user_attribution (
    user_id, first_source, first_medium, first_campaign, first_term, first_content,
    first_referral_code, first_landing_path, last_source, last_medium, last_campaign,
    last_referral_code, last_landing_path, last_touch_at
  ) VALUES (
    uid, p_source, p_medium, p_campaign, p_term, p_content,
    normalized, p_landing_path, p_source, p_medium, p_campaign,
    normalized, p_landing_path, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_source = EXCLUDED.last_source,
    last_medium = EXCLUDED.last_medium,
    last_campaign = EXCLUDED.last_campaign,
    last_referral_code = EXCLUDED.last_referral_code,
    last_landing_path = EXCLUDED.last_landing_path,
    last_touch_at = now();

  -- Prefer user referral code, then affiliate code
  SELECT * INTO ref_row FROM public.referral_codes
  WHERE code = normalized AND status = 'active';

  IF FOUND THEN
    referrer := ref_row.user_id;
    used_code := ref_row.code;
  ELSE
    SELECT * INTO aff_row FROM public.affiliates
    WHERE code = normalized AND status = 'active';
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
    END IF;
    -- Affiliate-only: attribution recorded; referral row only if affiliate linked to user
    IF aff_row.user_id IS NULL THEN
      RETURN jsonb_build_object('ok', true, 'attributed', false, 'affiliate', true);
    END IF;
    referrer := aff_row.user_id;
    used_code := aff_row.code;
  END IF;

  IF referrer = uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = uid) THEN
    RETURN jsonb_build_object('ok', true, 'attributed', false, 'already', true);
  END IF;

  INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status)
  VALUES (referrer, uid, used_code, 'attributed');

  RETURN jsonb_build_object('ok', true, 'attributed', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'attributed', false, 'already', true);
END;
$$;

-- Qualify + reward on first document (idempotent)
CREATE OR REPLACE FUNCTION public.qualify_referral_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref public.referrals%ROWTYPE;
  month_key text := public.utc_month_key(now());
  referrer_bonus int;
  referred_bonus int;
BEGIN
  SELECT * INTO ref FROM public.referrals
  WHERE referred_user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'qualified', false);
  END IF;

  IF ref.status IN ('qualified', 'rewarded') THEN
    RETURN jsonb_build_object('ok', true, 'qualified', true, 'already', true);
  END IF;

  IF ref.status <> 'attributed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  -- Must already have at least one document
  IF public.count_user_invoices_this_month(p_user_id) < 1
     AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE user_id = p_user_id LIMIT 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_document');
  END IF;

  UPDATE public.referrals
  SET status = 'qualified', qualified_at = now()
  WHERE id = ref.id;

  -- Bonus +2 each, respecting monthly cap of 10 total per user
  referrer_bonus := LEAST(2, GREATEST(0, 10 - public.get_referral_bonus_docs(ref.referrer_user_id)));
  referred_bonus := LEAST(2, GREATEST(0, 10 - public.get_referral_bonus_docs(p_user_id)));

  IF referrer_bonus > 0 THEN
    INSERT INTO public.document_bonus_ledger (user_id, amount, reason, referral_id, month_key)
    VALUES (ref.referrer_user_id, referrer_bonus, 'referral_referrer', ref.id, month_key)
    ON CONFLICT (referral_id, user_id, reason) DO NOTHING;
  END IF;

  IF referred_bonus > 0 THEN
    INSERT INTO public.document_bonus_ledger (user_id, amount, reason, referral_id, month_key)
    VALUES (p_user_id, referred_bonus, 'referral_referred', ref.id, month_key)
    ON CONFLICT (referral_id, user_id, reason) DO NOTHING;
  END IF;

  UPDATE public.referrals
  SET status = 'rewarded', rewarded_at = now()
  WHERE id = ref.id;

  RETURN jsonb_build_object(
    'ok', true,
    'qualified', true,
    'referrer_bonus', referrer_bonus,
    'referred_bonus', referred_bonus
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.on_invoice_created_growth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Qualify only when this is the user's first invoice ever
  IF (SELECT count(*) FROM public.invoices WHERE user_id = NEW.user_id) = 1 THEN
    PERFORM public.qualify_referral_for_user(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_growth_qualify ON public.invoices;
CREATE TRIGGER invoices_growth_qualify
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.on_invoice_created_growth();

-- Auto-create referral code for new profiles
CREATE OR REPLACE FUNCTION public.on_profile_created_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_referral_code(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_ensure_referral_code ON public.profiles;
CREATE TRIGGER profiles_ensure_referral_code
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_profile_created_referral_code();

-- Backfill referral codes for existing profiles
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles LOOP
    PERFORM public.ensure_referral_code(r.id);
  END LOOP;
END $$;

-- Public validate: returns only whether code is valid (no owner identity)
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text := upper(trim(p_code));
BEGIN
  IF normalized IS NULL OR length(normalized) < 4 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  IF EXISTS (SELECT 1 FROM public.referral_codes WHERE code = normalized AND status = 'active') THEN
    RETURN jsonb_build_object('valid', true, 'type', 'referral');
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliates WHERE code = normalized AND status = 'active') THEN
    RETURN jsonb_build_object('valid', true, 'type', 'affiliate');
  END IF;
  RETURN jsonb_build_object('valid', false);
END;
$$;

-- Own referral stats
CREATE OR REPLACE FUNCTION public.get_my_referral_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  my_code text;
  invited int;
  activated int;
  bonus int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  my_code := public.ensure_referral_code(uid);
  SELECT count(*)::int INTO invited FROM public.referrals WHERE referrer_user_id = uid;
  SELECT count(*)::int INTO activated FROM public.referrals
    WHERE referrer_user_id = uid AND status IN ('qualified', 'rewarded');
  bonus := public.get_referral_bonus_docs(uid);

  RETURN jsonb_build_object(
    'ok', true,
    'code', my_code,
    'link_path', '/?ref=' || my_code,
    'invited', invited,
    'activated', activated,
    'bonus_documents', bonus
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral_attribution(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_referral_attribution(text, text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.validate_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_my_referral_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_referral_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.ensure_referral_code(uuid) FROM PUBLIC;
-- Invoked only by SECURITY DEFINER helpers / triggers — not directly by clients.

REVOKE ALL ON FUNCTION public.qualify_referral_for_user(uuid) FROM PUBLIC;
-- Invoked only by SECURITY DEFINER helpers / triggers.

REVOKE ALL ON FUNCTION public.get_referral_bonus_docs(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_free_plan_monthly_allowance(uuid) FROM PUBLIC;

-- Public pay-page viral CTA: returns owner referral code only (no PII).
CREATE OR REPLACE FUNCTION public.get_public_invoice_referral_code(p_invoice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  code text;
BEGIN
  SELECT user_id INTO owner_id FROM public.invoices WHERE id = p_invoice_id;
  IF owner_id IS NULL THEN
    RETURN NULL;
  END IF;
  code := public.ensure_referral_code(owner_id);
  RETURN code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_invoice_referral_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_invoice_referral_code(uuid) TO anon, authenticated;
