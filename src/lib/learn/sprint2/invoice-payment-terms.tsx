import type { LearnArticleConfig } from "./shared";
import { LearnInlineLink, LearnSection, Paragraphs, sprint2RelatedArticles } from "./shared";

export const ARTICLE_CONFIG: LearnArticleConfig = {
  path: "/learn/invoice-payment-terms",
  title: "Invoice Payment Terms Explained",
  description:
    "What net 7, net 30, due on receipt and end-of-month actually mean, how to choose terms a client can meet, how to word deposits and late fees, and the mistakes that delay payment.",
  breadcrumbTitle: "Invoice Payment Terms",
  heroTitle: "Invoice Payment Terms: Choosing Them and Wording Them",
  intro:
    "Payment terms are the shortest part of an invoice and the part that most determines when you get paid. Most late payments are not refusals; they are the predictable result of terms that were vague, unrealistic for the client's process, or never enforced.",
  toc: [
    { id: "vocabulary", label: "The vocabulary, precisely" },
    { id: "counting", label: "How the days are counted" },
    { id: "choosing", label: "Choosing terms a client can meet" },
    { id: "deposits", label: "Deposits and staged payments" },
    { id: "late-payment", label: "Late-payment terms" },
    { id: "wording", label: "Wording you can copy" },
    { id: "enforcing", label: "Enforcing terms without friction" },
    { id: "common-mistakes", label: "Common mistakes" },
  ],
  faq: [
    {
      question: "What does net 30 mean?",
      answer:
        "Payment is due 30 calendar days after the invoice date. Calendar days, not working days, and the invoice date counts as day zero — so net 30 on an invoice dated 3 March falls due on 2 April.",
    },
    {
      question: "Does net 30 include weekends and holidays?",
      answer:
        "Yes, unless your contract specifically says business days. If you need working days, write that explicitly, because the default reading is calendar days.",
    },
    {
      question: "What does end of month mean on payment terms?",
      answer:
        "Terms run to the last day of the month in which the count lands. It suits clients who release payments in a single monthly run rather than per invoice, and matching their rhythm deliberately often gets you paid sooner than shorter terms they cannot meet.",
    },
    {
      question: "Is due on receipt a good payment term?",
      answer:
        "Rarely, on its own. It gives nobody a date to miss, which makes follow-up feel like a favour rather than a process. Pair it with a specific calendar date if you want payment quickly.",
    },
    {
      question: "Can I charge interest on a late invoice?",
      answer:
        "It depends on your jurisdiction and on whether the term was stated before the invoice fell due. Adding a charge retrospectively is a negotiating position rather than a term. Take advice on what is enforceable where you operate.",
    },
    {
      question: "Should I offer an early payment discount?",
      answer:
        "Only if the cash is worth the margin. A 2% discount for paying 20 days early is an expensive way to borrow if you would have been paid anyway. It works best with clients who genuinely have discretion over timing.",
    },
    {
      question: "Where should payment terms appear?",
      answer:
        "On the document itself, not in the covering email. Invoices get forwarded internally and emails do not, so anything the payer needs has to travel with the invoice.",
    },
  ],
  related: sprint2RelatedArticles("/learn/invoice-payment-terms"),
};

export function ArticleContent() {
  return (
    <>
      <LearnSection id="vocabulary" title="The vocabulary, precisely">
        <Paragraphs
          items={[
            "Net 7, net 14, net 30, net 60: payment is due that many calendar days after the invoice date. The number is the whole term; 'net' simply signals that the full amount is payable with no deduction.",
            "Due on receipt: payable when the invoice arrives. Legitimate for small or immediate work, weak as a general policy because it contains no date.",
            "End of month, sometimes written EOM: payable by the last day of the relevant month. Common with clients who run a single monthly payment cycle.",
            "2/10 net 30 and similar constructions: a 2% discount if paid within 10 days, otherwise the full amount within 30. Less common in service businesses than in goods trade, and only worth offering if the early cash is genuinely worth 2% to you.",
            "Deposit or advance: a portion payable before work begins. This is a different document rather than a different term — advance payments belong on a proforma invoice.",
          ]}
        />
        <p>
          On which document to use when, see{" "}
          <LearnInlineLink to="/learn/invoice-vs-proforma-invoice">
            invoice vs proforma invoice
          </LearnInlineLink>
          .
        </p>
      </LearnSection>

      <LearnSection id="counting" title="How the days are counted">
        <Paragraphs
          items={[
            "The invoice date is day zero and the count runs in calendar days. Net 30 issued on 3 March is due 2 April. This is the standard commercial reading, and it is the source of a surprising number of one-day disagreements when one side assumes the invoice date is day one.",
            "The fix is to print an actual calendar due date on the document rather than only the phrase. 'Due 2 April 2026' cannot be miscounted, cannot be misremembered, and is far easier to reference in a follow-up than 'net 30 from our invoice'.",
            "Where you use end-of-month terms, be explicit about which month. Net 30 EOM on a 20 March invoice lands on 19 April by the day count, and therefore 30 April under the end-of-month rule — a difference of eleven days that is worth stating rather than leaving to interpretation.",
          ]}
        />
      </LearnSection>

      <LearnSection id="choosing" title="Choosing terms a client can meet">
        <Paragraphs
          items={[
            "Shorter is not automatically better. The question is whether the client's payment process can actually meet the term you set. Net 7 to an organisation with a monthly approval cycle is a term you will breach on their behalf every single month, and each breach quietly teaches everyone involved that your due dates are decorative.",
            "So ask, early, how the client pays: per invoice or in a run, on what day, and how long approval takes internally. Then set terms that land just inside their cycle. Being paid reliably on day 30 is worth more than being nominally owed on day 7 and paid on day 41.",
            "Vary terms by client rather than running one policy for everyone. A long-standing client with a clean record and a slow finance department is a different risk from a new client with no history, and the second is where a deposit belongs rather than shorter terms.",
          ]}
        />
      </LearnSection>

      <LearnSection id="deposits" title="Deposits and staged payments">
        <Paragraphs
          items={[
            "A deposit does two jobs: it funds the start of the work and it tests whether the client can and will pay at all. For a new client, or a project with real up-front cost, it is normal and much easier to ask for in a document than in a conversation.",
            "Word the split precisely: what is payable now, what is payable on delivery or at each stage, and what happens if the scope changes. A term reading '50%' without saying 50% of what, and when the rest falls due, is an invitation to a disagreement.",
            "Issue one document per payment. A proforma invoice for the deposit, then a tax invoice for the balance, means each payment you receive matches exactly one document. Splitting one invoice across two payments is where reconciliation starts to cost time.",
          ]}
        />
      </LearnSection>

      <LearnSection id="late-payment" title="Late-payment terms">
        <Paragraphs
          items={[
            "A late-payment charge works mainly as a deterrent, and it only works if it was stated before the invoice fell due. Introducing it afterwards produces an argument rather than a payment, and it damages the relationship more than the amount justifies.",
            "Keep the rate proportionate. Something in the region of 1% to 2% per month on the outstanding balance is common; a punitive rate is more likely to be challenged, more likely to be ignored, and less likely to be enforceable. Whether it is enforceable at all depends on your jurisdiction and on the contract sitting over the invoice, which is a question for an adviser rather than an invoicing tool.",
            "Also decide in advance whether you would actually apply it. A term you never enforce is a term nobody reads. On a relationship you intend to keep, waiving the charge while pointing out that it existed often collects faster than applying it.",
          ]}
        />
      </LearnSection>

      <LearnSection id="wording" title="Wording you can copy">
        <Paragraphs
          items={[
            "Four sentences cover almost every case. When: 'Payment is due within 14 calendar days of the invoice date, by the due date shown above.' Advance, if any: 'A deposit of 50% of the total is payable before work begins; the balance falls due on the terms above.'",
            "Reference: 'Please quote the invoice number shown above as the payment reference so the payment can be matched on arrival.' And late payment, if you use it: 'Amounts unpaid after the due date may attract a late-payment charge of 1.5% per month on the outstanding balance.'",
            "Add one line about the payment route itself: bank and crypto details are on the document and the linked payment page, funds are received directly, and the client should retain their transfer reference or transaction hash. That last part saves you both time when a payment needs tracing.",
          ]}
        />
        <p>
          The related pages on{" "}
          <LearnInlineLink to="/learn/quotation-vs-invoice">quotation vs invoice</LearnInlineLink>{" "}
          and the{" "}
          <LearnInlineLink to="/learn/invoice-generator">invoice generator guide</LearnInlineLink>{" "}
          cover where these fields sit on a generated document.
        </p>
      </LearnSection>

      <LearnSection id="enforcing" title="Enforcing terms without friction">
        <Paragraphs
          items={[
            "Enforcement is mostly a routine rather than a confrontation. A short weekly pass through unpaid invoices, and a follow-up that names the invoice number, the amount and the original due date, collects most overdue money without anyone raising their voice.",
            "Tone follows from having a document. Referencing invoice INV-2026-0233, due 26 May, reads as process. Asking whether there is any news on that payment reads as a favour being requested, and gets treated accordingly.",
            "Escalate on a schedule rather than on frustration: a reminder at a few days, a firmer note at two weeks, a conversation about stopping work at a month. Predictability is what makes the process feel businesslike rather than personal.",
          ]}
        />
      </LearnSection>

      <LearnSection id="common-mistakes" title="Common mistakes">
        <Paragraphs
          items={[
            "Terms expressed as a phrase with no calendar date on the document.",
            "Setting terms shorter than the client's payment cycle, then treating every invoice as late.",
            "Putting the terms in the covering email rather than on the invoice.",
            "Raising a late-payment charge for the first time after the due date has passed.",
            "Asking for a deposit without saying what the balance is or when it falls due.",
            "Offering an early payment discount to a client who would have paid on time anyway.",
            "Never asking for the invoice number as a reference, then spending an afternoon matching a payment from an unfamiliar entity.",
            "Different terms on the quotation and the invoice for the same job, which gives the client a legitimate reason to pause.",
          ]}
        />
      </LearnSection>
    </>
  );
}
