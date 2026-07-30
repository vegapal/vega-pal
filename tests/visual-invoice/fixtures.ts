import { DEFAULT_DISPLAY_OPTIONS } from "@/lib/invoice-constants";
import { buildPdfTestInvoice } from "@/lib/invoice-pdf";
import type { Invoice } from "@/lib/vegapal-store";

export type InvoiceFixture = { id: string; invoice: Invoice; expectPages?: number };

function items(n: number, desc = (i: number) => `Line ${i + 1}`) {
  return Array.from({ length: n }, (_, i) => ({
    description: desc(i),
    quantity: 1,
    unitPrice: 100,
    total: 100,
  }));
}

export const INVOICE_HTML_FIXTURES: InvoiceFixture[] = [
  {
    id: "quotation-one-page",
    invoice: buildPdfTestInvoice({
      number: "QTN-HTML",
      documentType: "quotation",
      paymentStatus: "not_applicable",
      displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showPaymentInstructions: false },
    }),
    expectPages: 1,
  },
  {
    id: "tax-invoice-bank-one-page",
    invoice: buildPdfTestInvoice({
      number: "INV-BANK-HTML",
      displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showTerms: false },
    }),
    expectPages: 1,
  },
  {
    id: "tax-invoice-crypto",
    invoice: buildPdfTestInvoice({
      number: "INV-CRY-HTML",
      paymentMethods: {
        method: "crypto",
        crypto: {
          enabled: true,
          currency: "USDT",
          network: "TRON TRC20",
          walletAddress: "TXYZ1234567890abcdefghijklmnopqrstuvwxyz",
        },
        bank: { enabled: false },
        cash: { enabled: false },
      },
    }),
  },
  {
    id: "bank-crypto-dual",
    invoice: buildPdfTestInvoice({
      number: "INV-DUAL-HTML",
      paymentMethods: {
        method: "multiple",
        crypto: {
          enabled: true,
          currency: "USDT",
          network: "TRON TRC20",
          walletAddress: "TXYZ1234567890abcdefghijklmnopqrst",
        },
        bank: {
          enabled: true,
          bankName: "Emirates NBD",
          accountName: "Acme Studio LLC",
          accountNumber: "999",
          iban: "AE123",
          swift: "EBILAEAD",
        },
        cash: { enabled: false },
      },
    }),
  },
  {
    id: "proforma",
    invoice: buildPdfTestInvoice({ number: "PI-HTML", documentType: "proforma_invoice" }),
  },
  {
    id: "one-item",
    invoice: buildPdfTestInvoice({
      number: "POL-1-HTML",
      displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showTerms: false },
    }),
    expectPages: 1,
  },
  {
    id: "five-items",
    invoice: buildPdfTestInvoice({ number: "POL-5-HTML", items: items(5), total: 500 }),
  },
  {
    id: "twenty-items",
    invoice: buildPdfTestInvoice({ number: "POL-20-HTML", items: items(20), total: 2000 }),
  },
  {
    id: "hundred-items",
    invoice: buildPdfTestInvoice({ number: "POL-100-HTML", items: items(100), total: 10000 }),
  },
  {
    id: "long-company",
    invoice: buildPdfTestInvoice({
      number: "CO-HTML",
      sellerBusiness: "Very Long Company Name International Holdings And Services Limited",
    }),
  },
  {
    id: "long-client",
    invoice: buildPdfTestInvoice({
      number: "CL-HTML",
      clientCompany: "Global Enterprise Client With Long Registered Name Ltd",
      clientName: "Director of Operations",
    }),
  },
  {
    id: "long-descriptions",
    invoice: buildPdfTestInvoice({
      number: "DESC-HTML",
      items: [
        {
          description:
            "Enterprise platform migration including discovery, architecture review, phased rollout, training, and hypercare support across multiple regions",
          quantity: 1,
          unitPrice: 5000,
          total: 5000,
        },
      ],
      total: 5000,
    }),
  },
  {
    id: "long-notes",
    invoice: buildPdfTestInvoice({
      number: "NOTES-HTML",
      description: "Thank you for your business.",
      termsAndConditions: "Payment within 14 days.\nDelivery expected within 5 business days after payment clears.",
      displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showNotes: true, showTerms: true },
    }),
  },
  {
    id: "no-subject",
    invoice: buildPdfTestInvoice({ number: "NO-SUBJ", title: "" }),
  },
  {
    id: "no-client-email",
    invoice: buildPdfTestInvoice({ number: "NO-EMAIL", clientEmail: "" }),
  },
  {
    id: "no-payment",
    invoice: buildPdfTestInvoice({
      number: "NO-PAY",
      displayOptions: { ...DEFAULT_DISPLAY_OPTIONS, showPaymentInstructions: false },
    }),
  },
  {
    id: "currency-aed",
    invoice: buildPdfTestInvoice({ number: "AED-HTML", invoiceCurrency: "AED" }),
  },
  {
    id: "currency-usd",
    invoice: buildPdfTestInvoice({ number: "USD-HTML", invoiceCurrency: "USD" }),
  },
  {
    id: "currency-usdt",
    invoice: buildPdfTestInvoice({
      number: "USDT-HTML",
      invoiceCurrency: "USD",
      paymentMethods: {
        method: "crypto",
        crypto: {
          enabled: true,
          currency: "USDT",
          network: "TRON TRC20",
          walletAddress: "TXYZ1234567890abcdefghijklmnopqrstuvwxyz",
        },
        bank: { enabled: false },
        cash: { enabled: false },
      },
    }),
  },
  {
    id: "rtl-arabic",
    invoice: buildPdfTestInvoice({
      number: "AR-HTML",
      clientName: "شركة النخيل للتجارة",
      clientCompany: "شركة النخيل للتجارة",
      title: "تطوير موقع إلكتروني",
    }),
  },
];
