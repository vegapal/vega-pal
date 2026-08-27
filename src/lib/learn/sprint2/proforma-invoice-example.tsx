import type { LearnArticleConfig } from "./shared";
import { LearnInlineLink, LearnSection, Paragraphs, sprint2RelatedArticles } from "./shared";

export const ARTICLE_CONFIG: LearnArticleConfig = {
  path: "/learn/proforma-invoice-example",
  title: "Proforma Invoice Example, Field by Field",
  description:
    "A worked proforma invoice with fictional figures: header, parties, numbering, validity, line items, deposit terms and payment block — plus a services variant and the errors to avoid.",
  breadcrumbTitle: "Proforma Invoice Example",
  heroTitle: "Proforma Invoice Example: A Worked Document",
  intro:
    "Definitions only take you so far. This is a proforma invoice written out field by field with fictional figures, followed by a services variant, so you can see what each part is doing and copy the structure rather than the numbers.",
  toc: [
    { id: "before-you-start", label: "Before you write one" },
    { id: "goods-example", label: "Example one: goods with a deposit" },
    { id: "field-notes", label: "Field-by-field notes" },
    { id: "services-example", label: "Example two: services retainer" },
    { id: "what-follows", label: "What follows the proforma" },
    { id: "payment-block", label: "The payment block" },
    { id: "common-mistakes", label: "Common mistakes" },
  ],
  faq: [
    {
      question: "What should a proforma invoice include?",
      answer:
        "A clear proforma invoice heading, its own document number, the issue date and a validity period, both parties' details, itemised goods or services with quantities and prices, subtotal, any expected tax, the total, payment instructions, and a statement that it is not a tax invoice.",
    },
    {
      question: "Is there a standard proforma invoice format?",
      answer:
        "No single legal format applies everywhere. What matters is that the document is clearly identified as a proforma invoice, states the terms and total unambiguously, and does not present itself as a tax document.",
    },
    {
      question: "Should a proforma invoice have a number?",
      answer:
        "Yes, in its own series separate from your tax invoices. It gives both sides a reference for the advance payment and keeps your invoice numbering continuous.",
    },
    {
      question: "How long should a proforma invoice be valid?",
      answer:
        "Long enough for the client to act and short enough to protect you against cost movement. Two to four weeks is common; goods with volatile input costs justify less.",
    },
    {
      question: "Can a proforma invoice include tax?",
      answer:
        "You can show expected tax so the total is realistic, but the proforma is normally not the document a registered buyer reclaims tax against. The tax invoice that follows delivery is.",
    },
    {
      question: "Do I need to issue a tax invoice after a proforma?",
      answer:
        "In most cases yes, once the goods or services are delivered. Without it your client has paid and has no document to file, which surfaces at their year end.",
    },
    {
      question: "Can a proforma invoice be revised?",
      answer:
        "Yes — that is part of what makes it a proforma. Reissue it and tell the client the figure changed rather than letting them discover a different total on a link they already have.",
    },
  ],
  related: sprint2RelatedArticles("/learn/proforma-invoice-example"),
};

export function ArticleContent() {
  return (
    <>
      <LearnSection id="before-you-start" title="Before you write one">
        <Paragraphs
          items={[
            "A proforma invoice is a request for payment issued before delivery. It comes after the client has agreed to buy and before you have supplied, which is why it can be revised and why it is normally not a tax document. If you are unsure whether it is the right document at all, the comparison page covers that choice first.",
            "Everything in the examples below is fictional — the businesses, the addresses, the registration numbers and the amounts. Copy the structure and the wording patterns, not the figures.",
          ]}
        />
        <p>
          Background:{" "}
          <LearnInlineLink to="/learn/invoice-vs-proforma-invoice">
            invoice vs proforma invoice
          </LearnInlineLink>{" "}
          and <LearnInlineLink to="/learn/what-is-an-invoice">what is an invoice</LearnInlineLink>.
        </p>
      </LearnSection>

      <LearnSection id="goods-example" title="Example one: goods with a deposit">
        <Paragraphs
          items={[
            "Document heading: PROFORMA INVOICE — NOT A TAX INVOICE.",
            "From: Harbour Fabrication LLC, Warehouse 9, Al Quoz Industrial 3, Dubai, UAE. TRN 100xxxxxxxxxx41. To: Meridian Fitout FZ-LLC, Office 1204, JLT Cluster D, Dubai, UAE.",
            "Document number: PI-2026-0044. Issue date: 9 April 2026. Valid until: 30 April 2026. Reference: your enquiry MF-2026-118.",
            "Line items: 'Aluminium bracket, 6082-T6, per drawing HB-114 — 40 × 46.00 = 1,840.00'. Subtotal 1,840.00. Tax at 5% 92.00. Total 1,932.00 AED.",
            "Terms: 50% deposit (966.00 AED) payable before production begins. Balance of 966.00 AED payable on collection. Lead time 12 working days from receipt of deposit. Pricing valid until 30 April 2026 and subject to change thereafter. Any change to drawing HB-114 will be re-quoted before production.",
            "Payment: bank transfer details as shown below. Please quote PI-2026-0044 as the transfer reference. Note: this proforma invoice is issued in advance of supply and is not a tax invoice. A tax invoice will be issued on collection.",
          ]}
        />
      </LearnSection>

      <LearnSection id="field-notes" title="Field-by-field notes">
        <LearnSection id="heading-and-number" title="Heading, number and dates" level={3}>
          <Paragraphs
            items={[
              "The heading does real work. 'PROFORMA INVOICE' in the document title, and an explicit line stating it is not a tax invoice, stops a finance team filing it as one and attempting to reclaim tax against it. This is the single most useful sentence on the document.",
              "PI-2026-0044 comes from a proforma series separate from the tax invoice series. That separation is what keeps your tax invoice numbering unbroken, which is far easier to explain in a review than a sequence with proformas interleaved.",
              "Two dates, doing different jobs: the issue date anchors the validity period, and 'valid until' is the expiry of your offer. A proforma with no expiry is a price you promised indefinitely.",
            ]}
          />
        </LearnSection>
        <LearnSection id="parties-and-items" title="Parties and line items" level={3}>
          <Paragraphs
            items={[
              "Use registered entity names on both sides, not trading names or a contact's name. An accounts payable system matches on the registered name, and 'Meridian Fitout' and 'Meridian Fitout FZ-LLC' are not the same payer in that system.",
              "Line items should be specific enough that somebody who was not part of the conversation can verify them. 'Aluminium bracket, 6082-T6, per drawing HB-114' references an agreed document; 'brackets as discussed' references a memory.",
              "Where you include the client's own enquiry or purchase order reference, do it. It is often the field that decides whether the document enters their payment process at all.",
            ]}
          />
        </LearnSection>
        <LearnSection id="terms-detail" title="The terms field" level={3}>
          <Paragraphs
            items={[
              "This is where a proforma earns its keep. The deposit amount in figures rather than only a percentage, when the balance falls due, the lead time and what it is measured from, the price validity, and what happens if the specification changes.",
              "Every one of those sentences replaces a conversation that would otherwise happen mid-production, when your position is weaker and the client has already committed money.",
            ]}
          />
        </LearnSection>
      </LearnSection>

      <LearnSection id="services-example" title="Example two: services retainer">
        <Paragraphs
          items={[
            "Document heading: PROFORMA INVOICE — NOT A TAX INVOICE.",
            "From: Ashgrove Advisory Ltd, 14 Kingsway, London, UK. VAT registration GB xxx xxxx 12. To: Larkfield Manufacturing Ltd, Unit 6 Brookside Park, Leeds, UK.",
            "Document number: PI-2026-0018. Issue date: 26 September 2026. Valid until: 10 October 2026.",
            "Line item: 'Advisory retainer, October 2026 — up to 8 hours, includes monthly board note — 1 × 4,000.00'. Total 4,000.00 GBP.",
            "Terms: payable in advance, before the retainer month begins. Hours beyond the retainer will be invoiced separately at 250.00 per hour. Unused hours do not carry forward. Either party may end the arrangement with 30 days' written notice. This proforma invoice is issued in advance of supply and is not a tax invoice; a tax invoice will be issued at the end of the retainer month.",
            "Payment: bank transfer, details below. Please quote PI-2026-0018 as the reference.",
          ]}
        />
        <Paragraphs
          items={[
            "The services version is shorter because there is nothing to specify physically, and the terms field carries more weight as a result. Notice that the overage rate is stated on the document rather than agreed verbally — that is what allows you to bill it later without a negotiation.",
          ]}
        />
      </LearnSection>

      <LearnSection id="what-follows" title="What follows the proforma">
        <Paragraphs
          items={[
            "For the goods example: the deposit of 966.00 arrives, Harbour marks PI-2026-0044 as paid, production runs, and on collection they issue tax invoice INV-2026-0512 for the 966.00 balance. Two documents, two payments, each traceable to the other.",
            "For the services example: Ashgrove receives 4,000.00 before October begins, then issues a tax invoice at month end covering the retainer and any overage hours. The client has one document to file for their records and one to reclaim tax against, which is the whole point of issuing the second one.",
            "Note both numbers against each other in your own records. 'What happened with that deposit' becomes a five-second answer rather than an archaeology exercise.",
          ]}
        />
      </LearnSection>

      <LearnSection id="payment-block" title="The payment block">
        <Paragraphs
          items={[
            "For a bank transfer, include the beneficiary name exactly as the bank holds it, the bank name, account number, IBAN where it applies, SWIFT or BIC for international payments, the account currency, and the reference to quote. On a cross-border payment, also state who bears intermediary charges.",
            "For a crypto payment, write the asset and the network together above the address — 'USDT on TRON (TRC20)' — give the address in full, and state that the amount received must equal the amount due so the network fee is not deducted from your payment.",
            "One thing worth being plain about: a proforma invoice presents your payment instructions. The tool that produced it does not take, hold or verify the payment. The deposit goes from your client's account or wallet to yours, and you record it once you can see it.",
          ]}
        />
        <p>
          For network choice on crypto payments, see{" "}
          <LearnInlineLink to="/learn/trc20-vs-erc20-for-usdt-payments">
            TRC20 vs ERC20 for USDT
          </LearnInlineLink>
          , and for terms wording see{" "}
          <LearnInlineLink to="/learn/invoice-payment-terms">invoice payment terms</LearnInlineLink>
          .
        </p>
      </LearnSection>

      <LearnSection id="common-mistakes" title="Common mistakes">
        <Paragraphs
          items={[
            "No statement that the document is not a tax invoice, so it gets filed as one.",
            "Putting the full contract value on a deposit proforma. If you are asking for half now, issue for half and describe the balance in the terms.",
            "A percentage with no figure. '50%' requires arithmetic and invites a different answer than yours.",
            "No validity period, so the price is open-ended.",
            "Sharing numbering with your tax invoices, which breaks the sequence that matters most.",
            "Never issuing the follow-up tax invoice, leaving the client with a payment and no document.",
            "Editing an issued proforma silently. Reissue and say what changed; the shared link always shows the current version.",
            "Trading names instead of registered entity names, so the document cannot be matched to a supplier record.",
          ]}
        />
      </LearnSection>
    </>
  );
}
