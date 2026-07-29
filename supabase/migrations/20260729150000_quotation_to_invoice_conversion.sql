-- Quotation → tax invoice conversion (linked documents, one invoice per quotation)

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_document_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_document_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_source_document_id_unique
  ON public.invoices (source_document_id)
  WHERE source_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS invoices_converted_document_id_idx
  ON public.invoices (converted_document_id)
  WHERE converted_document_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.convert_quotation_to_invoice(p_quotation_id UUID)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  already_existed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  q public.invoices%ROWTYPE;
  existing_id UUID;
  existing_num TEXT;
  new_id UUID;
  new_num TEXT;
  new_issue DATE;
  new_due DATE;
  term_days INTEGER;
  prof_disabled BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT is_disabled INTO prof_disabled FROM public.profiles WHERE id = uid;
  IF COALESCE(prof_disabled, false) THEN
    RAISE EXCEPTION 'account_disabled' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO q FROM public.invoices WHERE id = p_quotation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'quotation_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF q.user_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF q.document_type IS DISTINCT FROM 'quotation' THEN
    RAISE EXCEPTION 'not_a_quotation' USING ERRCODE = 'P0003';
  END IF;

  IF q.document_status = 'cancelled' THEN
    RAISE EXCEPTION 'quotation_cancelled' USING ERRCODE = 'P0004';
  END IF;

  IF q.converted_document_id IS NOT NULL THEN
    SELECT i.id, i.number INTO existing_id, existing_num
    FROM public.invoices i
    WHERE i.id = q.converted_document_id AND i.user_id = uid;
    IF existing_id IS NOT NULL THEN
      invoice_id := existing_id;
      invoice_number := existing_num;
      already_existed := true;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  SELECT i.id, i.number INTO existing_id, existing_num
  FROM public.invoices i
  WHERE i.source_document_id = p_quotation_id AND i.user_id = uid
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE public.invoices
    SET converted_document_id = existing_id
    WHERE id = p_quotation_id AND converted_document_id IS NULL;

    invoice_id := existing_id;
    invoice_number := existing_num;
    already_existed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  new_num := public.allocate_invoice_document_number('tax_invoice');
  new_issue := CURRENT_DATE;
  term_days := GREATEST(0, (q.due_date - q.issue_date));
  new_due := new_issue + term_days;

  INSERT INTO public.invoices (
    user_id,
    number,
    client_name,
    client_email,
    client_company,
    title,
    description,
    terms_and_conditions,
    status,
    document_type,
    document_status,
    payment_status,
    issue_date,
    due_date,
    subtotal,
    discount,
    tax,
    discount_type,
    tax_type,
    discount_rate,
    tax_rate,
    total,
    invoice_currency,
    po_number,
    reference_number,
    project_code,
    display_options,
    payment_methods,
    wallet_address,
    network,
    seller_name,
    seller_business,
    seller_email,
    seller_address,
    seller_logo_url,
    brand_color,
    source_document_id,
    converted_document_id
  ) VALUES (
    uid,
    new_num,
    q.client_name,
    q.client_email,
    q.client_company,
    q.title,
    q.description,
    q.terms_and_conditions,
    'draft',
    'tax_invoice',
    'draft',
    'unpaid',
    new_issue,
    new_due,
    q.subtotal,
    q.discount,
    q.tax,
    COALESCE(q.discount_type, 'fixed'),
    COALESCE(q.tax_type, 'fixed'),
    q.discount_rate,
    q.tax_rate,
    q.total,
    COALESCE(q.invoice_currency, 'USD'),
    q.po_number,
    q.reference_number,
    q.project_code,
    q.display_options,
    q.payment_methods,
    q.wallet_address,
    q.network,
    q.seller_name,
    q.seller_business,
    q.seller_email,
    q.seller_address,
    q.seller_logo_url,
    q.brand_color,
    p_quotation_id,
    NULL
  )
  RETURNING id INTO new_id;

  INSERT INTO public.invoice_items (
    invoice_id,
    position,
    description,
    quantity,
    unit_price,
    total
  )
  SELECT
    new_id,
    ii.position,
    ii.description,
    ii.quantity,
    ii.unit_price,
    ii.total
  FROM public.invoice_items ii
  WHERE ii.invoice_id = p_quotation_id
  ORDER BY ii.position;

  UPDATE public.invoices
  SET converted_document_id = new_id
  WHERE id = p_quotation_id;

  invoice_id := new_id;
  invoice_number := new_num;
  already_existed := false;
  RETURN NEXT;

EXCEPTION
  WHEN unique_violation THEN
    SELECT i.id, i.number INTO existing_id, existing_num
    FROM public.invoices i
    WHERE i.source_document_id = p_quotation_id AND i.user_id = uid
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE public.invoices
      SET converted_document_id = existing_id
      WHERE id = p_quotation_id AND converted_document_id IS NULL;

      invoice_id := existing_id;
      invoice_number := existing_num;
      already_existed := true;
      RETURN NEXT;
      RETURN;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_quotation_to_invoice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_invoice(UUID) TO authenticated;
