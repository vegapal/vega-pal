-- Manual USDT Pro subscription payment requests (admin-reviewed activation).

CREATE TABLE IF NOT EXISTS public.subscription_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan = 'pro'),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'semiannual')),
  amount_usdt NUMERIC(12, 2) NOT NULL CHECK (amount_usdt > 0),
  months INTEGER NOT NULL CHECK (months IN (1, 6)),
  network_id TEXT NOT NULL,
  network_label TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  subscription_id UUID REFERENCES public.subscriptions (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_payment_requests_status_created_idx
  ON public.subscription_payment_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS subscription_payment_requests_user_id_created_idx
  ON public.subscription_payment_requests (user_id, created_at DESC);

ALTER TABLE public.subscription_payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own subscription payment requests"
  ON public.subscription_payment_requests;
CREATE POLICY "Users select own subscription payment requests"
  ON public.subscription_payment_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts/updates go through service role API only (server derives amount/address).
DROP POLICY IF EXISTS "Users insert own subscription payment requests"
  ON public.subscription_payment_requests;

REVOKE ALL ON TABLE public.subscription_payment_requests FROM PUBLIC;
GRANT SELECT ON TABLE public.subscription_payment_requests TO authenticated;
GRANT ALL ON TABLE public.subscription_payment_requests TO service_role;
