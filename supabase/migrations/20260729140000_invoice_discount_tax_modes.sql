-- Percentage vs fixed discount/tax (legacy rows remain fixed amounts in discount/tax columns)

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS tax_type TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS discount_rate NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(8, 4);

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_discount_type_check,
  ADD CONSTRAINT invoices_discount_type_check
    CHECK (discount_type IN ('fixed', 'percentage'));

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_tax_type_check,
  ADD CONSTRAINT invoices_tax_type_check
    CHECK (tax_type IN ('fixed', 'percentage'));

UPDATE public.invoices
SET
  discount_type = COALESCE(discount_type, 'fixed'),
  tax_type = COALESCE(tax_type, 'fixed')
WHERE true;
