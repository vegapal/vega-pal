-- Harden qualify_referral_for_user: only the referred user (or owner/definer context) may qualify.
-- Authenticated clients must not pass arbitrary user IDs.

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
  caller uuid := auth.uid();
BEGIN
  -- Block cross-user calls from authenticated sessions.
  -- Triggers / other SECURITY DEFINER helpers still work when caller is the referred user
  -- or when there is no JWT (service/maintenance).
  IF caller IS NOT NULL AND caller <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

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

  IF public.count_user_invoices_this_month(p_user_id) < 1
     AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE user_id = p_user_id LIMIT 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_document');
  END IF;

  UPDATE public.referrals
  SET status = 'qualified', qualified_at = now()
  WHERE id = ref.id;

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

REVOKE ALL ON FUNCTION public.qualify_referral_for_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.qualify_referral_for_user(uuid) FROM anon, authenticated;
