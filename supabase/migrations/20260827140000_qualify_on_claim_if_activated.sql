-- Qualify referrals at claim time when the referred user already has documents.
-- Fixes E2E/edge case: attribution after first invoice would otherwise stay attributed forever.

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
  claim_result jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  normalized := upper(trim(p_code));
  IF normalized IS NULL OR length(normalized) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

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
    -- Already attributed: still attempt qualify if documents exist (idempotent).
    IF EXISTS (SELECT 1 FROM public.invoices WHERE user_id = uid LIMIT 1) THEN
      PERFORM public.qualify_referral_for_user(uid);
    END IF;
    RETURN jsonb_build_object('ok', true, 'attributed', false, 'already', true);
  END IF;

  INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code, status)
  VALUES (referrer, uid, used_code, 'attributed');

  claim_result := jsonb_build_object('ok', true, 'attributed', true);

  IF EXISTS (SELECT 1 FROM public.invoices WHERE user_id = uid LIMIT 1) THEN
    PERFORM public.qualify_referral_for_user(uid);
    claim_result := claim_result || jsonb_build_object('qualified_existing_docs', true);
  END IF;

  RETURN claim_result;
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'attributed', false, 'already', true);
END;
$$;

-- Authenticated self-qualify helper (idempotent; no cross-user).
CREATE OR REPLACE FUNCTION public.qualify_my_referral_if_eligible()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE user_id = uid LIMIT 1) THEN
    RETURN jsonb_build_object('ok', true, 'qualified', false, 'reason', 'no_document');
  END IF;
  RETURN public.qualify_referral_for_user(uid);
END;
$$;

REVOKE ALL ON FUNCTION public.qualify_my_referral_if_eligible() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qualify_my_referral_if_eligible() TO authenticated;
