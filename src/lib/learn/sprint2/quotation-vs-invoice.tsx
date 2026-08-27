import type { LearnArticleConfig } from "./shared";
import { LearnInlineLink, LearnSection, Paragraphs, sprint2RelatedArticles } from "./shared";

export const ARTICLE_CONFIG: LearnArticleConfig = {
  path: "/learn/quotation-vs-invoice",
  title: "Quotation vs Invoice: Offer, Then Obligation",
  description:
    "A quotation offers a price the client can decline; an invoice states an amount owed. Compare purpose, validity, wording, conversion and the mistakes that cost money.",
  breadcrumbTitle: "Quotation vs Invoice",
  heroTitle: "Quotation vs Invoice: What Changes Between Them",
  intro:
    "A quotation is an offer. An invoice is a claim. Everything else — the validity date versus the due date, whether it can be revised, how it is worded, what happens if it is ignored — follows from that single difference, and mixing the two is one of the most expensive small mistakes in service businesses.",
  toc: [
    { id: "short-answer", label: "The short answer" },
    { id: "purpose", label: "Purpose: offer versus obligation" },
    { id: "dates", label: "Validity dates and due dates" },
    { id: "wording", label: "Wording that holds up" },
    { id: "estimate", label: "Where estimates fit" },
    { id: "conversion", label: "Converting an accepted quotation" },
    { id: "deposits", label: "When a deposit sits in between" },
    { id: "common-mistakes", label: "Common mistakes" },
  ],
  faq: [
    {
      question: "Is a quotation legally binding?",
      answer:
        "A quotation is generally an offer, which the client can accept or decline. Once accepted within its validity period it usually forms part of a contract, so the scope and exclusions you wrote into it matter. The details depend on your jurisdiction and any contract that sits over it.",
    },
    {
      question: "Can a client pay a quotation?",
      answer:
        "Nothing is payable until the offer is accepted. If a client wants to pay immediately on acceptance, the cleaner route is a proforma invoice for the deposit or a tax invoice once work is delivered, so the payment lands against a document intended to be paid.",
    },
    {
      question: "What is the difference between a quotation and an estimate?",
      answer:
        "In everyday use a quotation is a firm price for a defined scope and an estimate signals an approximate figure that may move. If any part of your figure is indicative, say so explicitly in the terms rather than relying on the word at the top.",
    },
    {
      question: "How long should a quotation be valid?",
      answer:
        "Seven to thirty days suits most service work. Shorter if your input costs move, longer if the client has a slow internal approval chain. What matters is that a date exists at all.",
    },
    {
      question: "Should a quotation include payment details?",
      answer:
        "It can, and it saves a round trip if the client wants to pay a deposit on acceptance. Nothing becomes payable simply because the details are printed there.",
    },
    {
      question: "Do quotations need sequential numbers?",
      answer:
        "Yes, in their own series. A numbered quotation is what lets both sides refer to a specific version of an offer months later, and it keeps your invoice numbering separate and continuous.",
    },
    {
      question: "Can I invoice more than the accepted quotation?",
      answer:
        "Only for work outside the quoted scope, and only where that extra work was approved. Put it on its own line with a reference to the approval, rather than raising the quoted figure.",
    },
  ],
  related: sprint2RelatedArticles("/learn/quotation-vs-invoice"),
};

export function ArticleContent() {
  return (
    <>
      <LearnSection id="short-answer" title="The short answer">
        <Paragraphs
          items={[
            "A quotation says: here is what this would cost, and you are free to say no. An invoice says: this amount is owed, and here is how to pay it. The quotation comes before agreement; the invoice comes after work, or after a decision to pay in advance.",
            "In practice the two documents often contain the same line items and the same total. What differs is the commitment attached to them. A quotation can be superseded by a better one. An invoice, once issued, is a record on both sides' books and is corrected through a credit note rather than a replacement file.",
          ]}
        />
        <p>
          For the adjacent comparison — advance payment versus completed sale — see{" "}
          <LearnInlineLink to="/learn/invoice-vs-proforma-invoice">
            invoice vs proforma invoice
          </LearnInlineLink>
          .
        </p>
      </LearnSection>

      <LearnSection id="purpose" title="Purpose: offer versus obligation">
        <Paragraphs
          items={[
            "A quotation has a persuasive job as well as a commercial one. It has to make the price defensible and the scope obvious, which is why itemising matters so much more here than on an invoice. A client who can see the components can remove one; a client faced with a single lump sum can only accept or reject the whole thing.",
            "An invoice has a processing job. Its audience is often not the person who agreed the work but an accounts payable clerk checking whether the entity name matches their supplier record, whether a purchase order reference is present, and whether the tax is broken out. It succeeds by being complete and unambiguous, not by being persuasive.",
            "This is why the same content can need different emphasis. On the quotation, the description sells the work. On the invoice, the description has to be recognisable to someone who was not involved: 'April social media management, 12 posts' rather than 'marketing services'.",
          ]}
        />
      </LearnSection>

      <LearnSection id="dates" title="Validity dates and due dates">
        <Paragraphs
          items={[
            "A quotation carries a validity date: this offer stands until the date shown. It is not a payment deadline, and it does not oblige anyone to do anything. Without it, you have promised a price forever, and someone will eventually quote it back to you after your costs have moved.",
            "An invoice carries a due date: this amount is payable by the date shown. Terms expressed only as a phrase — 'net 30', 'due on receipt' — are not a due date until somebody counts the days, and a document without a specific date is chased far less successfully than one with it.",
            "Both dates should appear as calendar dates rather than as descriptions. It removes an entire category of one-day disagreements about when a period started.",
          ]}
        />
        <p>
          On choosing and wording terms, see{" "}
          <LearnInlineLink to="/learn/invoice-payment-terms">invoice payment terms</LearnInlineLink>
          .
        </p>
      </LearnSection>

      <LearnSection id="wording" title="Wording that holds up">
        <Paragraphs
          items={[
            "On a quotation, write scope as deliverables rather than activities. 'Three landing page designs, two revision rounds' commits to something checkable; 'design work' commits to whatever the client imagines. Exclusions carry equal weight: name what you are not doing, because the assumptions you leave unstated are the ones that get tested.",
            "Say how to accept. A quotation that does not state what acceptance looks like gets answered with a question rather than an approval, which adds a week for no reason. 'Reply confirming this quotation number' is enough.",
            "On an invoice, the wording that matters most is the payment block and the terms. What is due, by when, how to pay, what reference to quote, and what happens if it is late. Each of those is one sentence, and each removes a conversation that would otherwise happen after the due date, when your position is weaker.",
          ]}
        />
      </LearnSection>

      <LearnSection id="estimate" title="Where estimates fit">
        <Paragraphs
          items={[
            "Estimate is not a document type in most systems, including VegaPal — it is a way of describing the confidence attached to a figure. If part of your pricing genuinely depends on a variable you cannot fix yet, the honest approach is a quotation with the variable named and its basis stated.",
            "For example: a fixed line for the defined work, plus a separate line described as 'Site visits beyond the first, charged at 800.00 each' with a note in the terms explaining that the final total depends on how many are required. The client can see exactly where the uncertainty is and how much it costs.",
            "What does not work is labelling a document an estimate and then treating it as a firm price, or the reverse. The label sets an expectation; the terms field is where the expectation is actually defined.",
          ]}
        />
      </LearnSection>

      <LearnSection id="conversion" title="Converting an accepted quotation">
        <Paragraphs
          items={[
            "The point of a good quotation is that it becomes an invoice without retyping. Retyping is how the amount you bill drifts from the amount you offered — a transposed digit, a line dropped, a discount forgotten — and the client always notices in the direction that favours them.",
            "In VegaPal an accepted quotation converts into a tax invoice, carrying the client and line items across, and you choose whether the new invoice starts as a draft or is issued immediately. The original quotation stays in your records, so the offer and the bill can be compared later when somebody asks why a figure differs.",
            "A fictional example of the pattern: quotation QTN-2026-0119 offers three phases totalling 10,700. The client accepts two of them. The converted invoice is for 8,300, and because it descends from the quotation rather than being rebuilt, that 8,300 is visibly the sum of the two lines that were approved.",
          ]}
        />
        <p>
          The{" "}
          <LearnInlineLink to="/learn/invoice-generator">invoice generator guide</LearnInlineLink>{" "}
          covers what to look for in a tool that handles this properly.
        </p>
      </LearnSection>

      <LearnSection id="deposits" title="When a deposit sits in between">
        <Paragraphs
          items={[
            "Often the sequence is not two documents but three. The quotation fixes scope and price. A proforma invoice collects a deposit before work starts. A tax invoice bills the balance once the work is delivered. Each document corresponds to one decision or one payment.",
            "Keeping them separate is what makes the trail readable a year later, and it means each payment you receive matches exactly one document rather than a fraction of one. Splitting a single invoice across two payments is where reconciliation starts to hurt.",
          ]}
        />
      </LearnSection>

      <LearnSection id="common-mistakes" title="Common mistakes">
        <Paragraphs
          items={[
            "Invoicing before acceptance. An invoice for work that has not been agreed is not a stronger position, it is a document the client can ignore with justification.",
            "A quotation with no expiry, no number, or no stated way to accept. Each of those omissions costs time, and the first one can cost margin.",
            "Sending a single lump sum on a quotation, then wondering why the client went quiet rather than negotiating one item.",
            "Rebuilding the invoice from scratch after approval instead of converting the quotation.",
            "Adding scope to the invoice that was never approved. Bill extras as their own line with the approval reference, or expect the whole invoice to be held while it is queried.",
            "Using the words quotation and estimate interchangeably in the same conversation, so neither side is sure whether the figure is firm.",
            "Mixing quotation and invoice numbering into one series, which breaks the continuity of the sequence that matters.",
          ]}
        />
      </LearnSection>
    </>
  );
}
