import type { LearnArticleConfig } from "./shared";
import { LearnInlineLink, LearnSection, Paragraphs, sprint2RelatedArticles } from "./shared";

export const ARTICLE_CONFIG: LearnArticleConfig = {
  path: "/learn/invoice-vs-proforma-invoice",
  title: "Invoice vs Proforma Invoice: Which One to Send",
  description:
    "A proforma invoice requests payment before delivery; a tax invoice records a completed sale. Compare timing, legal weight, tax treatment, numbering and the mistakes that cause disputes.",
  breadcrumbTitle: "Invoice vs Proforma Invoice",
  heroTitle: "Invoice vs Proforma Invoice: What Is the Difference?",
  intro:
    "Both documents show a client what they owe and how to pay, and they can carry identical line items. The difference is when they are issued and what they commit you to. Sending the wrong one either misrecords a sale that has not happened or asks for money on paperwork your client cannot process.",
  toc: [
    { id: "short-answer", label: "The short answer" },
    { id: "timing", label: "Timing is the real distinction" },
    { id: "tax-treatment", label: "Tax treatment and legal weight" },
    { id: "numbering", label: "Numbering and record-keeping" },
    { id: "what-each-contains", label: "What each document contains" },
    { id: "choosing", label: "Choosing between them" },
    { id: "sequence", label: "Using both in sequence" },
    { id: "common-mistakes", label: "Common mistakes" },
  ],
  faq: [
    {
      question: "Is a proforma invoice the same as an invoice?",
      answer:
        "No. A proforma invoice is issued before delivery and requests payment in advance; it is generally not a tax document. A tax invoice records a sale that has already taken place and is the document a buyer files for accounting and, where applicable, tax recovery.",
    },
    {
      question: "Can a client pay a proforma invoice?",
      answer:
        "Yes, and that is usually the point of issuing one. Many finance departments specifically need a proforma invoice in order to raise an advance payment for goods or services they have not yet received.",
    },
    {
      question: "Does a proforma invoice count as a sale in my accounts?",
      answer:
        "Generally not. Because it precedes delivery, it is normally treated as a statement of terms rather than booked revenue. The tax invoice issued after delivery is what enters your sales records. Local rules vary, so confirm the treatment with your accountant.",
    },
    {
      question: "Should a proforma invoice show tax?",
      answer:
        "You can show the expected tax so the total is realistic and the client budgets correctly, but the proforma itself is normally not the document a registered buyer reclaims tax from. The subsequent tax invoice is.",
    },
    {
      question: "Do the two documents share a numbering series?",
      answer:
        "They should not. Separate series per document type keep your tax invoice numbering continuous, which is much easier to explain in a review than a sequence with proformas interleaved.",
    },
    {
      question: "Can I convert a proforma invoice into a tax invoice?",
      answer:
        "In practice you issue a second document once delivery is complete, referencing the first. Keeping both means each payment corresponds to exactly one document, which is what makes reconciliation straightforward.",
    },
    {
      question: "Which document do customs brokers ask for?",
      answer:
        "Usually a proforma invoice, because a shipment needs a declared value and terms before it moves, which is before any final tax invoice would exist.",
    },
  ],
  related: sprint2RelatedArticles("/learn/invoice-vs-proforma-invoice"),
};

export function ArticleContent() {
  return (
    <>
      <LearnSection id="short-answer" title="The short answer">
        <Paragraphs
          items={[
            "A proforma invoice is a request for payment issued before goods ship or work begins. A tax invoice is the record of a sale that has already happened. Same client, potentially the same line items and the same total — different point in the transaction, and therefore different consequences for your books and your client's.",
            "If you need money up front, the proforma invoice is the honest document. If the work is delivered and you are billing for it, the tax invoice is. Using a tax invoice to request an advance records revenue you have not earned; using a proforma after delivery leaves your client without the document their accounts department needs to file.",
          ]}
        />
        <p>
          If you are still establishing the basics, start with{" "}
          <LearnInlineLink to="/learn/what-is-an-invoice">what is an invoice</LearnInlineLink>, then
          come back to the comparison.
        </p>
      </LearnSection>

      <LearnSection id="timing" title="Timing is the real distinction">
        <Paragraphs
          items={[
            "Everything else follows from timing. A proforma invoice exists in the window between agreement and delivery, which is why it can legitimately be revised: the quantity changes, the specification shifts, the client adds an item, and you reissue. Nobody's books have moved yet.",
            "A tax invoice sits after delivery, which is why it should not be casually edited. Once it is issued, the sale is recorded on both sides. Corrections are made through a credit note or an adjustment document that references the original number, not by quietly replacing the PDF.",
            "This is also why the proforma carries a validity period and the tax invoice carries a due date. The proforma is saying how long these terms stand; the tax invoice is saying when payment is expected on a completed transaction. Confusing the two fields is a small mistake that produces surprisingly persistent arguments.",
          ]}
        />
      </LearnSection>

      <LearnSection id="tax-treatment" title="Tax treatment and legal weight">
        <Paragraphs
          items={[
            "In most systems, a tax invoice is the document that carries statutory weight. It typically needs your tax registration number, the tax shown as a separate amount, and specific wording. A registered buyer generally cannot reclaim input tax without it, which means an incorrect tax invoice comes straight back to you.",
            "A proforma invoice is normally treated as a good-faith statement of terms. It is not usually a valid document for tax recovery, and it should say on its face that it is a proforma invoice and not a tax invoice so that nobody in your client's finance team files it as one.",
            "Neither label makes a document automatically binding. Enforceability comes from the underlying contract, evidence of delivery, and whatever consumer or commercial law applies. What the label does is set expectations correctly, which is most of what a document is for.",
            "Because the specifics genuinely vary between jurisdictions — and change — treat the paragraphs above as the shape of the rule rather than the rule itself, and confirm your own position with a qualified accountant.",
          ]}
        />
      </LearnSection>

      <LearnSection id="numbering" title="Numbering and record-keeping">
        <Paragraphs
          items={[
            "Give each document type its own numbering series. PI-2026-0044 and INV-2026-0512 tell you immediately what kind of document you are looking at, and your tax invoice sequence stays unbroken.",
            "The alternative — one shared series — produces a tax invoice numbering run with gaps that are actually proformas. That is precisely the pattern that attracts questions in a review, and answering it requires you to explain your filing system rather than your business.",
            "Keep the pair connected in your own records. When a proforma is followed by a tax invoice, noting each number against the other turns 'what happened with this deposit' into a five-second answer months later.",
          ]}
        />
      </LearnSection>

      <LearnSection id="what-each-contains" title="What each document contains">
        <LearnSection id="proforma-fields" title="On a proforma invoice" level={3}>
          <Paragraphs
            items={[
              "A clear heading identifying it as a proforma invoice, its own number, the issue date and a validity period. Your business details and the client's details. Itemised goods or services with quantities and prices. Subtotal, any expected tax, and the total. Payment instructions. And a statement that it is not a tax invoice.",
              "Where a deposit is being requested, spell out the split: what is payable now, what is payable on delivery, and what happens if the order changes. A proforma that says 50% without saying 50% of what is an invitation to a disagreement.",
            ]}
          />
        </LearnSection>
        <LearnSection id="invoice-fields" title="On a tax invoice" level={3}>
          <Paragraphs
            items={[
              "Everything a compliant invoice needs: your registered name, address and tax or trade licence number; the client's legal name and address; a unique invoice number; issue and due dates; line items describing what was actually delivered; subtotal, discount, tax shown separately, and the amount due with the currency named.",
              "Then the payment block, complete enough that the client can finish the transfer without asking you a question. This is where most documents are thinnest and where most delays begin.",
            ]}
          />
        </LearnSection>
      </LearnSection>

      <LearnSection id="choosing" title="Choosing between them">
        <Paragraphs
          items={[
            "Send a proforma invoice when you need a deposit before starting, when a new client has no payment history with you, when a client's finance team needs a document in order to raise an advance payment, or when a broker or freight forwarder needs a declared value before goods move.",
            "Send a tax invoice when the goods have shipped or the work is delivered, when a client is paying on terms after the fact, and whenever the client needs a document for their own tax or accounting records.",
            "One useful test: could the client, in principle, refuse and walk away without owing you anything? If yes, you are earlier in the transaction than a tax invoice belongs. If no, because you have already delivered, the tax invoice is the correct document.",
          ]}
        />
      </LearnSection>

      <LearnSection id="sequence" title="Using both in sequence">
        <Paragraphs
          items={[
            "The common pattern is three documents rather than two. A quotation prices the work and gets accepted. A proforma invoice collects the deposit. A tax invoice bills the balance once the work is delivered. Each document corresponds to one decision or one payment, which is what makes the trail readable.",
            "A worked shape, with fictional figures: quotation QTN-2026-0091 for 12,000; proforma invoice PI-2026-0044 for the 6,000 deposit, valid 30 days; tax invoice INV-2026-0512 for the 6,000 balance on completion. Three numbers, three events, nothing to reconstruct later.",
            "Where no deposit is involved, the middle document simply does not exist — quotation then tax invoice. Adding a proforma because it looks more official is how businesses end up with paperwork nobody can explain.",
          ]}
        />
        <p>
          For the neighbouring comparison, see{" "}
          <LearnInlineLink to="/learn/quotation-vs-invoice">quotation vs invoice</LearnInlineLink>,
          and for a filled-in document see the{" "}
          <LearnInlineLink to="/learn/proforma-invoice-example">
            proforma invoice example
          </LearnInlineLink>
          .
        </p>
      </LearnSection>

      <LearnSection id="common-mistakes" title="Common mistakes">
        <Paragraphs
          items={[
            "Issuing a tax invoice to collect a deposit. This records a completed sale that has not completed, and if the order later changes you are amending a document that should not have existed.",
            "Sending a proforma and never following it with a tax invoice. The client has paid and has no document to file. This surfaces at their year end, usually as an urgent request during your busiest week.",
            "Leaving the validity period off a proforma. Input costs move, and an open-ended proforma is a price you promised indefinitely.",
            "Letting a proforma look like a tax invoice. If the heading is ambiguous, someone will file it as one and try to reclaim tax against it.",
            "Sharing one numbering series between the two, which breaks the continuity of the sequence that matters most.",
            "Restating a different total on the tax invoice from the proforma without explanation. If the figure changed, say why on the document; a silent difference reads as an error even when it is correct.",
          ]}
        />
      </LearnSection>
    </>
  );
}
