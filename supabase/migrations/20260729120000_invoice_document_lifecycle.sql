-- Document type, lifecycle, and payment status (backward-compatible with legacy `status`)

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'tax_invoice',
  ADD COLUMN IF NOT EXISTS document_status TEXT NOT NULL DEFAULT 'issued',
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_document_type_check,
  ADD CONSTRAINT invoices_document_type_check
    CHECK (document_type IN ('quotation', 'proforma_invoice', 'tax_invoice'));

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_document_status_check,
  ADD CONSTRAINT invoices_document_status_check
    CHECK (document_status IN ('draft', 'issued', 'accepted', 'rejected', 'cancelled', 'expired'));

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_payment_status_check,
  ADD CONSTRAINT invoices_payment_status_check
    CHECK (payment_status IN (
      'not_applicable', 'unpaid', 'partially_paid', 'paid', 'overdue', 'refunded'
    ));

-- Backfill from legacy status
UPDATE public.invoices
SET
  document_type = COALESCE(document_type, 'tax_invoice'),
  document_status = CASE status
    WHEN 'draft' THEN 'draft'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'issued'
  END,
  payment_status = CASE
    WHEN status = 'draft' THEN 'unpaid'
    WHEN status = 'cancelled' THEN 'unpaid'
    WHEN status = 'paid' THEN 'paid'
    WHEN status = 'overdue' THEN 'overdue'
    ELSE 'unpaid'
  END
WHERE true;

-- Quotations created after this migration will set not_applicable in app; existing rows stay tax_invoice.

CREATE INDEX IF NOT EXISTS invoices_user_document_type_idx
  ON public.invoices (user_id, document_type);

CREATE INDEX IF NOT EXISTS invoices_user_payment_status_idx
  ON public.invoices (user_id, payment_status);

CREATE INDEX IF NOT EXISTS invoices_user_document_status_idx
  ON public.invoices (user_id, document_status);

-- Per-user, per-type sequential numbering
CREATE TABLE IF NOT EXISTS public.invoice_document_sequences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, document_type),
  CONSTRAINT invoice_document_sequences_type_check
    CHECK (document_type IN ('quotation', 'proforma_invoice', 'tax_invoice'))
);

ALTER TABLE public.invoice_document_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own invoice sequences"
  ON public.invoice_document_sequences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.invoice_document_sequences TO authenticated;
GRANT ALL ON public.invoice_document_sequences TO service_role;

-- Seed sequences from existing invoice numbers (INV-0001 → 1, etc.)
INSERT INTO public.invoice_document_sequences (user_id, document_type, last_number)
SELECT
  user_id,
  COALESCE(document_type, 'tax_invoice'),
  COALESCE(
    MAX(
      CASE
        WHEN number ~ '^[A-Z]+-[0-9]+$'
        THEN NULLIF(regexp_replace(number, '^[A-Z]+-', ''), '')::integer
        ELSE 0
      END
    ),
    0
  )::integer
FROM public.invoices
GROUP BY user_id, COALESCE(document_type, 'tax_invoice')
ON CONFLICT (user_id, document_type)
DO UPDATE SET last_number = GREATEST(
  invoice_document_sequences.last_number,
  EXCLUDED.last_number
);

CREATE OR REPLACE FUNCTION public.allocate_invoice_document_number(p_document_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  prefix TEXT;
  next_num INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_document_type NOT IN ('quotation', 'proforma_invoice', 'tax_invoice') THEN
    RAISE EXCEPTION 'invalid document type';
  END IF;

  prefix := CASE p_document_type
    WHEN 'quotation' THEN 'QTN'
    WHEN 'proforma_invoice' THEN 'PI'
    ELSE 'INV'
  END;

  INSERT INTO public.invoice_document_sequences (user_id, document_type, last_number)
  VALUES (uid, p_document_type, 1)
  ON CONFLICT (user_id, document_type)
  DO UPDATE SET last_number = invoice_document_sequences.last_number + 1
  RETURNING last_number INTO next_num;

  RETURN prefix || '-' || lpad(next_num::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_invoice_document_number(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_document_number(TEXT) TO authenticated;
