-- Lower Free plan monthly document limit from 5 to 3.
-- Keeps effective-plan-aware enforcement from subscriptions migration.

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
    IF monthly_count >= 3 THEN
      RAISE EXCEPTION 'FREE_PLAN_INVOICE_LIMIT'
        USING MESSAGE = 'You have reached the Free plan limit of 3 documents this month. Upgrade to Pro to create unlimited documents.';
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
    CASE WHEN public.get_effective_plan(auth.uid()) = 'free' THEN 3 ELSE NULL END;
$$;
