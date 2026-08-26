-- Saved payment methods (bank accounts + crypto wallets). Owner-scoped RLS.
-- Invoice payment_methods JSONB remains the historical snapshot; this table is reusable prefs only.

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bank', 'crypto')),
  label TEXT NOT NULL DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  bank_name TEXT,
  account_holder_name TEXT,
  account_name TEXT,
  iban TEXT,
  account_number TEXT,
  swift_bic TEXT,
  bank_currency TEXT,
  payment_reference TEXT,
  crypto_currency TEXT,
  network TEXT,
  wallet_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT payment_methods_bank_or_crypto CHECK (
    (type = 'bank' AND (
      coalesce(nullif(trim(iban), ''), nullif(trim(account_number), '')) IS NOT NULL
    ))
    OR
    (type = 'crypto' AND coalesce(nullif(trim(wallet_address), ''), '') <> '')
  )
);

CREATE INDEX IF NOT EXISTS payment_methods_user_id_idx
  ON public.payment_methods (user_id);

CREATE INDEX IF NOT EXISTS payment_methods_user_type_idx
  ON public.payment_methods (user_id, type);

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_one_default_per_type
  ON public.payment_methods (user_id, type)
  WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.payment_methods_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.payment_methods_set_updated_at();

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own payment methods" ON public.payment_methods;
CREATE POLICY "Users can select own payment methods"
  ON public.payment_methods
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own payment methods" ON public.payment_methods;
CREATE POLICY "Users can insert own payment methods"
  ON public.payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payment methods" ON public.payment_methods;
CREATE POLICY "Users can update own payment methods"
  ON public.payment_methods
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own payment methods" ON public.payment_methods;
CREATE POLICY "Users can delete own payment methods"
  ON public.payment_methods
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
