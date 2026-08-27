/**
 * Free public tools under /tools.
 *
 * Rules these tools follow:
 * - Every result is computed in the browser and shown without a signup gate.
 * - Nothing here calls a private API, stores input, or handles a private key.
 * - Copy must not imply VegaPal processes payments, verifies transfers or gives
 *   legal, tax or accounting advice.
 *
 * This module is intentionally free of React so audit scripts can import it.
 */

import type { MarketingPageSlug } from "@/lib/seo/marketing-pages";

export const TOOL_SLUGS = [
  "due-date-calculator",
  "discount-calculator",
  "vat-calculator",
  "invoice-number-generator",
  "payment-terms-generator",
  "late-fee-calculator",
  "crypto-payment-qr-generator",
  "usdt-aed-converter",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

export type ToolCategory = "invoice-maths" | "invoice-admin" | "crypto";

export type ToolSection = {
  heading: string;
  body: string[];
};

export type ToolDefinition = {
  slug: ToolSlug;
  path: `/tools/${ToolSlug}`;
  /** Short label for cards, breadcrumbs and cluster links. */
  name: string;
  category: ToolCategory;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  /** One-line summary used on the hub cards. */
  summary: string;
  /** Explanation shown under the calculator. */
  sections: ToolSection[];
  /** Shown as a highlighted caveat above the explanation. Keep short and honest. */
  disclaimer?: string;
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
  faqs: Array<{ question: string; answer: string }>;
  relatedToolSlugs: ToolSlug[];
  relatedPageSlugs: MarketingPageSlug[];
};

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  "invoice-maths": "Invoice maths",
  "invoice-admin": "Invoice admin",
  crypto: "Crypto payments",
};

const TOOLS: Record<ToolSlug, ToolDefinition> = {
  "due-date-calculator": {
    slug: "due-date-calculator",
    path: "/tools/due-date-calculator",
    name: "Due date calculator",
    category: "invoice-maths",
    title: "Invoice Due Date Calculator — Net Terms to a Real Date | VegaPal",
    description:
      "Turn net 7, net 15, net 30 or custom payment terms into a calendar due date, with an optional end-of-month rule. Free, runs in your browser, no signup.",
    h1: "Invoice due date calculator",
    eyebrow: "Free tool",
    intro:
      "Enter the invoice date and the terms you use, and get the exact calendar date the payment is due. 'Net 30' is not a due date until somebody counts the days, and a document with a real date on it is chased far more successfully than one that says due on receipt.",
    summary: "Invoice date plus net terms, out comes the calendar due date.",
    sections: [
      {
        heading: "How the count works",
        body: [
          "Net terms count calendar days from the invoice date, not working days, and the invoice date itself is day zero. Net 30 on an invoice dated 3 March is therefore due 2 April, which is the kind of detail people get wrong by one day and then argue about.",
          "The end-of-month option covers the other common convention, where terms run to the last day of the month in which the count lands. Some clients operate a fixed monthly payment run and will pay on that basis whatever your invoice says, so it can be worth matching their rhythm deliberately.",
        ],
      },
      {
        heading: "Choosing terms you can defend",
        body: [
          "Shorter terms are not automatically better. What matters is whether the client's payment process can meet them: net 7 to an organisation with a monthly approval cycle is a term you will breach on their behalf every single month, which quietly trains everyone to ignore your due dates.",
          "Pick terms that match how the client actually pays, write them on the document as a date rather than a phrase, and enforce them consistently. Consistency is what makes a follow-up feel like process instead of a favour.",
        ],
      },
    ],
    ctaHeading: "Put the date on a real invoice",
    ctaBody:
      "VegaPal sets the due date on the document and on the shareable payment page, so the client sees the same date you do.",
    ctaLabel: "Create an invoice",
    faqs: [
      {
        question: "Does net 30 include weekends?",
        answer:
          "Yes. Net terms count calendar days unless your contract says otherwise, so weekends and public holidays are included in the count.",
      },
      {
        question: "Is the invoice date day one or day zero?",
        answer:
          "Day zero. Net 30 from 3 March lands on 2 April. This calculator uses that convention, which is the common commercial reading.",
      },
      {
        question: "What does end of month mean on payment terms?",
        answer:
          "Terms run to the last day of the month the count falls in. It suits clients who pay in a single monthly run rather than per invoice.",
      },
    ],
    relatedToolSlugs: ["payment-terms-generator", "late-fee-calculator"],
    relatedPageSlugs: ["invoice-generator", "invoice-template", "small-business-invoice"],
  },

  "discount-calculator": {
    slug: "discount-calculator",
    path: "/tools/discount-calculator",
    name: "Discount calculator",
    category: "invoice-maths",
    title: "Invoice Discount Calculator — Percentage or Fixed Amount | VegaPal",
    description:
      "Work out a percentage or fixed discount on an invoice amount and see the discount value and the net total side by side. Free, browser-only, no signup.",
    h1: "Invoice discount calculator",
    eyebrow: "Free tool",
    intro:
      "Enter the amount and either a percentage or a fixed reduction, and see the discount value and the resulting total together. Useful before you commit to a number in a conversation, because a discount agreed verbally is very hard to walk back.",
    summary: "Percentage or fixed discount, with the net total shown alongside.",
    sections: [
      {
        heading: "Percentage or fixed, and why it matters",
        body: [
          "A percentage discount scales with the job, which protects you on small work and costs you on large work. A fixed reduction does the opposite. On a 40,000 invoice, '10% off' and '2,000 off' are very different conversations, and clients usually ask for the one that favours them.",
          "Where a discount is a goodwill gesture rather than a pricing decision, a fixed amount reads better on the document. It looks like a specific concession rather than a signal that your list price has slack in it.",
        ],
      },
      {
        heading: "Discount before or after tax",
        body: [
          "A discount normally reduces the taxable amount, which means tax is calculated on the discounted subtotal rather than the original. This calculator shows the discount and the net amount; where tax applies, work from that net figure.",
          "Show the discount as its own line on the invoice rather than quietly lowering a unit price. The client sees the concession you made — which is the entire point of making it — and your records show what the work is actually worth.",
        ],
      },
    ],
    ctaHeading: "Show the discount on the document",
    ctaBody:
      "VegaPal applies a discount as its own line so the client can see the original amount, the reduction and the total due.",
    ctaLabel: "Create an invoice",
    faqs: [
      {
        question: "Should a discount be applied before or after tax?",
        answer:
          "Usually before, so tax is calculated on the discounted subtotal. The exact treatment depends on your local tax rules, so confirm with your accountant if you are registered.",
      },
      {
        question: "Percentage or fixed discount — which is better?",
        answer:
          "Percentages scale with the invoice and fixed amounts do not. For a one-off goodwill gesture a fixed amount reads as a specific concession rather than a permanent price cut.",
      },
      {
        question: "Can VegaPal apply a discount automatically?",
        answer:
          "Yes. Discount is an optional field on each document, shown as its own line with the totals recalculated.",
      },
    ],
    relatedToolSlugs: ["vat-calculator", "due-date-calculator"],
    relatedPageSlugs: ["invoice-generator", "quotation-generator", "invoice-template"],
  },

  "vat-calculator": {
    slug: "vat-calculator",
    path: "/tools/vat-calculator",
    name: "VAT calculator",
    category: "invoice-maths",
    title: "VAT Calculator — Add or Remove Tax From an Amount | VegaPal",
    description:
      "Add VAT to a net amount or extract it from a gross amount at any rate. Shows net, tax and gross together. Free and browser-only — not tax advice.",
    h1: "VAT calculator: inclusive and exclusive",
    eyebrow: "Free tool",
    intro:
      "Enter an amount and a rate, then choose whether the amount already includes tax. The calculator shows net, tax and gross together, which is what an invoice has to show anyway if a registered buyer is going to reclaim it.",
    summary: "Add or extract tax at any rate, with net, tax and gross shown.",
    disclaimer:
      "This is arithmetic, not tax advice. Rates, registration thresholds, place-of-supply rules and exemptions vary by jurisdiction and change over time — confirm your treatment with a qualified accountant.",
    sections: [
      {
        heading: "Inclusive and exclusive, and why the difference bites",
        body: [
          "Exclusive means the figure you have is net and tax is added on top: 1,000 at 5% becomes 1,050. Inclusive means tax is already inside the figure and has to be extracted: 1,050 inclusive of 5% contains 50 of tax and 1,000 of net.",
          "The mistake that costs money is treating a gross figure as net. Taking 5% of 1,050 gives 52.50, not 50, and if you have quoted a client an inclusive price and then invoiced tax on top of it, you are the one absorbing the difference.",
        ],
      },
      {
        heading: "What belongs on the invoice",
        body: [
          "Where you are registered, show the net amount, the tax rate, the tax amount as a separate line and the gross total, along with your tax registration number. A registered buyer generally cannot reclaim tax from a document that does not break it out, which means the invoice comes back to you.",
          "Whether you charge tax at all on a given sale — particularly on exports of services or to a client in another country — is a jurisdiction question rather than a formatting one. Ask once per client country and then encode the answer in how you issue.",
        ],
      },
    ],
    ctaHeading: "Show tax properly on every document",
    ctaBody:
      "VegaPal shows tax as its own line with your registration number, and lets you hide it entirely on documents where it does not apply.",
    ctaLabel: "Create an invoice",
    faqs: [
      {
        question: "How do I remove VAT from a gross amount?",
        answer:
          "Divide the gross by one plus the rate. At 5%, gross ÷ 1.05 gives the net, and the difference is the tax. Taking the raw percentage of a gross figure overstates the tax.",
      },
      {
        question: "Which rate should I use?",
        answer:
          "The rate that applies to your registration and the type of supply. This tool accepts any rate; it does not know your jurisdiction and does not choose for you.",
      },
      {
        question: "Is this tool tax advice?",
        answer:
          "No. It performs arithmetic. Registration, rates, exemptions and place-of-supply rules are matters for a qualified accountant in your jurisdiction.",
      },
    ],
    relatedToolSlugs: ["discount-calculator", "due-date-calculator"],
    relatedPageSlugs: ["invoice-template", "international-invoice", "small-business-invoice"],
  },

  "invoice-number-generator": {
    slug: "invoice-number-generator",
    path: "/tools/invoice-number-generator",
    name: "Invoice number generator",
    category: "invoice-admin",
    title: "Invoice Number Generator — Build a Numbering Scheme | VegaPal",
    description:
      "Preview an invoice numbering scheme from a prefix, year, padding and starting sequence, and see the next several numbers. Free, browser-only, nothing saved.",
    h1: "Invoice number generator and numbering scheme preview",
    eyebrow: "Free tool",
    intro:
      "Set a prefix, decide whether to include the year, choose how many digits to pad to, and see the next numbers your scheme would produce. This is a preview tool: it generates nothing in your account and stores nothing anywhere.",
    summary: "Preview a prefix, year and padding scheme before you commit to it.",
    sections: [
      {
        heading: "What makes a numbering scheme hold up",
        body: [
          "Unique, sequential, and with no gaps you cannot explain. That is the whole requirement, and it is the one most manual systems fail — usually the first time two invoices go out on the same day and both get the same number.",
          "Padding matters more than it looks. INV-0001 sorts correctly in every file listing and spreadsheet; INV-1 puts invoice 10 before invoice 2 forever. Pick four digits unless you know you will exceed 9,999 documents in a series.",
          "Including the year makes documents easy to find but restarts the sequence annually, which some accountants prefer and others dislike. Either is defensible; changing your mind halfway through a year is not.",
        ],
      },
      {
        heading: "How VegaPal numbers documents",
        body: [
          "VegaPal maintains a separate sequence per document type, so quotations, proforma invoices and tax invoices each run their own series and cannot collide. The next number is assigned when you create a document, which is what keeps the series unbroken without you tracking the last one used.",
          "That separation is deliberate: mixed series across document types are exactly what an auditor asks about, because a proforma sitting in the middle of your tax invoice numbering looks like a missing sale until somebody explains it.",
        ],
      },
    ],
    ctaHeading: "Let the numbering take care of itself",
    ctaBody:
      "In VegaPal each document type gets its own sequence and the next number is assigned automatically when you create a document.",
    ctaLabel: "Create an invoice",
    faqs: [
      {
        question: "Does this tool reserve or create invoice numbers?",
        answer:
          "No. It previews what a scheme would look like. Nothing is saved, and no number in your VegaPal account is affected.",
      },
      {
        question: "Can invoice numbers have gaps?",
        answer:
          "Avoid them. A gap you cannot explain is the first thing questioned in a review. If you void a document, keep the number and record it as voided rather than reusing it.",
      },
      {
        question: "Should quotations share numbering with invoices?",
        answer:
          "No. Separate series per document type keeps each sequence continuous and easy to explain. VegaPal does this automatically.",
      },
    ],
    relatedToolSlugs: ["payment-terms-generator", "due-date-calculator"],
    relatedPageSlugs: ["invoice-template", "small-business-invoice", "invoice-generator"],
  },

  "payment-terms-generator": {
    slug: "payment-terms-generator",
    path: "/tools/payment-terms-generator",
    name: "Payment terms generator",
    category: "invoice-admin",
    title: "Payment Terms Generator — Copyable Wording for Invoices | VegaPal",
    description:
      "Build payment terms wording from net terms, deposit, late-payment and reference options, then copy it onto your invoice. Free, browser-only — not legal advice.",
    h1: "Payment terms generator",
    eyebrow: "Free tool",
    intro:
      "Pick the terms you actually operate and get plain wording you can copy onto your invoice or quotation. Most payment disputes are wording disputes, and the sentences below are the ones people wish they had written before the due date passed.",
    summary: "Choose net terms and options, copy out the wording.",
    disclaimer:
      "Generated wording is a plain-language starting point, not legal advice. Whether a term is enforceable — late-payment charges especially — depends on your jurisdiction and your contract with the client.",
    sections: [
      {
        heading: "The four things terms should settle",
        body: [
          "When payment is due, stated as a period or a date rather than 'on receipt'. What is payable up front, if anything. How the client should reference the payment so you can match it. And what happens if it is late.",
          "Each of those is one sentence. Together they remove the four conversations that otherwise happen after the due date, at which point you are negotiating from a weaker position than you were before you sent the invoice.",
        ],
      },
      {
        heading: "Being realistic about late-payment terms",
        body: [
          "A late-payment charge is a deterrent more than a revenue line, and its enforceability varies by jurisdiction. Stating it before the work starts is what gives it weight; adding it retrospectively to an overdue invoice mostly produces an argument.",
          "Keep it proportionate. A punitive rate is more likely to be challenged and less likely to be paid than a modest one that you actually apply consistently.",
        ],
      },
    ],
    ctaHeading: "Put the terms on the document",
    ctaBody:
      "Paste the wording into the terms field on a VegaPal document and it prints on the PDF and shows on the payment page.",
    ctaLabel: "Create an invoice",
    faqs: [
      {
        question: "What are the most common payment terms?",
        answer:
          "Net 30 is the default in much B2B trade, with net 14 and net 7 common for smaller suppliers and freelancers. Match the client's actual payment cycle rather than picking the shortest number.",
      },
      {
        question: "Can I charge interest on late invoices?",
        answer:
          "It depends on your jurisdiction and your contract. State the term up front if you intend to rely on it, and take advice before enforcing it.",
      },
      {
        question: "Where do the terms go on the invoice?",
        answer:
          "In the terms field, which prints on the PDF and appears on the shareable payment page alongside the payment instructions.",
      },
    ],
    relatedToolSlugs: ["due-date-calculator", "late-fee-calculator"],
    relatedPageSlugs: ["invoice-template", "freelance-invoice", "consulting-invoice"],
  },

  "late-fee-calculator": {
    slug: "late-fee-calculator",
    path: "/tools/late-fee-calculator",
    name: "Late fee calculator",
    category: "invoice-maths",
    title: "Late Payment Fee Calculator — Daily or Monthly Rate | VegaPal",
    description:
      "Calculate a late-payment charge on an overdue invoice from a daily or monthly rate and the number of days overdue. Free and browser-only — not legal advice.",
    h1: "Late payment fee calculator",
    eyebrow: "Free tool",
    intro:
      "Enter the overdue amount, your rate and how late the payment is, and see what the charge would come to. Whether you should apply it is a separate question from what it adds up to, and the number is usually smaller than people expect.",
    summary: "Overdue amount and a daily or monthly rate, out comes the charge.",
    disclaimer:
      "This is arithmetic, not legal advice. Whether a late-payment charge is enforceable, and at what maximum rate, depends on your jurisdiction and on what your contract or invoice terms said before the invoice fell due.",
    sections: [
      {
        heading: "Daily and monthly rates are not interchangeable",
        body: [
          "A 1.5% monthly rate and a 0.05% daily rate look similar and are not. Over 90 days the monthly figure gives roughly 4.5% simple, the daily figure gives 4.5% too — but 1.5% per month compounded, or 0.05% per day over a 31-day month, drift apart quickly once you are into multiple periods.",
          "This calculator uses simple interest on the overdue principal, which is the most common and most defensible basis. If your terms specify compounding, the figure here will be conservative.",
        ],
      },
      {
        heading: "When to actually charge it",
        body: [
          "The charge has to have been stated in your terms before the invoice fell due. Introducing it afterwards is a negotiating position, not a term, and clients treat it accordingly.",
          "It is also worth asking what you want: the charge, or the payment. On a client relationship you intend to keep, waiving the fee while pointing out that it existed often collects faster than applying it. On a client who has stopped answering, the fee is the least of your problems.",
        ],
      },
    ],
    ctaHeading: "State the term before you need it",
    ctaBody:
      "Put your late-payment wording in the terms field on every document, so it is on the record before an invoice falls due.",
    ctaLabel: "Create an invoice",
    faqs: [
      {
        question: "How is a late payment fee calculated?",
        answer:
          "Most commonly as simple interest on the overdue amount for the days it is late. This tool converts a daily or monthly rate into the charge for the period you enter.",
      },
      {
        question: "Can I add a late fee that was not on the invoice?",
        answer:
          "In practice, not effectively. A term needs to be stated before the invoice falls due if you want to rely on it. Take advice on your jurisdiction.",
      },
      {
        question: "Does VegaPal add late fees automatically?",
        answer:
          "No. There is no automatic interest calculation or dunning. You can state the term in the terms field and add a charge as a line item on a new document if you decide to apply it.",
      },
    ],
    relatedToolSlugs: ["payment-terms-generator", "due-date-calculator"],
    relatedPageSlugs: ["freelance-invoice", "small-business-invoice", "payment-request"],
  },

  "crypto-payment-qr-generator": {
    slug: "crypto-payment-qr-generator",
    path: "/tools/crypto-payment-qr-generator",
    name: "Crypto payment QR generator",
    category: "crypto",
    title: "Crypto Payment QR Code Generator — Public Address Only | VegaPal",
    description:
      "Generate a QR code from a public receiving address with an optional amount and network label. Runs entirely in your browser. Never enter a private key or seed phrase.",
    h1: "Crypto payment QR code generator",
    eyebrow: "Free tool",
    intro:
      "Paste a public receiving address, optionally add the amount and the network label you want printed underneath, and get a QR code you can download. The code is drawn in your browser from the text you typed — nothing is uploaded, fetched or stored.",
    summary: "A QR code from a public address, generated locally in your browser.",
    disclaimer:
      "Only ever enter a public receiving address. Never type a private key, seed phrase or recovery words into this or any web page. This tool encodes the text you provide into an image and cannot check that the address or network is correct.",
    sections: [
      {
        heading: "The QR code is not the instruction",
        body: [
          "A QR code carries an address string and nothing else. It does not carry the network, and a scanning wallet will not warn your client that they are about to send USDT over the wrong chain to an address that happens to be valid on both.",
          "So the label matters as much as the code. Print the asset and the network together — 'USDT on TRON (TRC20)' — next to the image, and print the address in text as well, because some clients copy and some scan and you do not get to choose which.",
        ],
      },
      {
        heading: "What this tool does and does not check",
        body: [
          "It encodes exactly the characters you type. It does not validate the address format, confirm the address exists, check that it matches the network you labelled, or verify that you control it. A typo in produces a valid-looking QR code out.",
          "Check the address against the source you copied it from before you put the code in front of a client, and send yourself a small test amount the first time you use a new receiving address. That habit costs a few minutes once and has saved a lot of people a lot of money.",
        ],
      },
      {
        heading: "On a VegaPal invoice this is already handled",
        body: [
          "When you save a wallet in payment methods, the asset and network travel with the address, and the public payment page renders the QR code, the copyable address and the network label from the same saved record. The PDF carries the address in text.",
          "This standalone tool exists for the cases outside a document — a printed notice, a slide, a support page — where you want the image and nothing else.",
        ],
      },
    ],
    ctaHeading: "Send the address on a document instead",
    ctaBody:
      "A VegaPal invoice puts the amount, the network, the address and the QR code on one page your client can open without a login.",
    ctaLabel: "Create an invoice",
    faqs: [
      {
        question: "Is it safe to generate a crypto QR code here?",
        answer:
          "The code is drawn in your browser and nothing is sent anywhere. It is safe for a public receiving address. Never enter a private key or seed phrase into any web page, including this one.",
      },
      {
        question: "Does the QR code include the network?",
        answer:
          "No. A QR code carries the address string only. Always print the asset and network as text next to the code, because a scanning wallet cannot infer which chain you meant.",
      },
      {
        question: "Does this tool check that my address is valid?",
        answer:
          "No. It encodes exactly what you type. Verify the address against your wallet before sharing the code, and test with a small amount the first time.",
      },
    ],
    relatedToolSlugs: ["usdt-aed-converter"],
    relatedPageSlugs: ["crypto-invoice-generator", "trc20-invoice", "usdt-payment-request"],
  },

  "usdt-aed-converter": {
    slug: "usdt-aed-converter",
    path: "/tools/usdt-aed-converter",
    name: "USDT to AED converter",
    category: "crypto",
    title: "USDT to AED Converter — Live Reference Rate | VegaPal",
    description:
      "Convert USDT to AED and back at a live reference rate, for recording the dirham value of a stablecoin invoice. Reference only — VegaPal does not convert or hold funds.",
    h1: "USDT to AED converter",
    eyebrow: "Free tool",
    intro:
      "Convert between USDT and the UAE dirham using a live reference rate, in either direction. This is for working out what to record in your books when a stablecoin invoice settles — it is not a quote, and no conversion happens anywhere near VegaPal.",
    summary: "Live USDT and AED reference rate, both directions.",
    disclaimer:
      "A reference figure only. Rates come from public market data and are not a quote, an offer or a rate you can transact at. VegaPal does not convert, hold or exchange funds.",
    sections: [
      {
        heading: "Why the settlement date is the date that matters",
        body: [
          "If you invoice 2,400 USDT and the payment lands eleven days later, the dirham value your accountant wants is usually the value on the day the funds arrived rather than the day you issued. USDT tracks the dollar closely, and the dollar-dirham peg is stable, so the two figures are rarely far apart — but 'rarely far apart' is not a policy.",
          "Pick a convention, write it down, and apply it to every stablecoin invoice. Reconstructing rates months later, invoice by invoice, is the kind of task that turns a quarter-end into a weekend.",
        ],
      },
      {
        heading: "What VegaPal does with currency",
        body: [
          "Each document is denominated in one currency and the payment arrives in that currency. VegaPal does not convert anything, does not lock a rate, and does not hold a balance in any currency. If a client wants a reference figure in their own currency, add it as a note and keep one payable amount on the document.",
          "The homepage carries a fuller live converter across all the currencies VegaPal supports, including the other fiat options and stablecoins, if you need more than this pair.",
        ],
      },
    ],
    ctaHeading: "Invoice in the currency the client pays in",
    ctaBody:
      "VegaPal sets currency per document, from AED and USD to USDT, with payment instructions that match.",
    ctaLabel: "Create an invoice",
    faqs: [
      {
        question: "Where does the rate come from?",
        answer:
          "Public market data — the same sources as the converter on the VegaPal homepage. It is a reference figure, not a rate you can transact at.",
      },
      {
        question: "Which rate should I record for a USDT invoice?",
        answer:
          "Most accountants want the value on the date the payment settled. Agree a convention with yours and apply it consistently.",
      },
      {
        question: "Can VegaPal convert my USDT to AED?",
        answer:
          "No. VegaPal presents payment instructions and never holds, moves or converts funds. Conversion happens at your own exchange or bank.",
      },
    ],
    relatedToolSlugs: ["crypto-payment-qr-generator", "vat-calculator"],
    relatedPageSlugs: ["usdt-invoice", "multi-currency-invoice", "international-invoice"],
  },
};

export function isToolSlug(slug: string): slug is ToolSlug {
  return (TOOL_SLUGS as readonly string[]).includes(slug);
}

export function getTool(slug: ToolSlug): ToolDefinition {
  return TOOLS[slug];
}

export function listTools(): ToolDefinition[] {
  return TOOL_SLUGS.map((slug) => TOOLS[slug]);
}

export function listToolsByCategory(): Array<{
  category: ToolCategory;
  label: string;
  tools: ToolDefinition[];
}> {
  const categories: ToolCategory[] = ["invoice-maths", "invoice-admin", "crypto"];
  return categories.map((category) => ({
    category,
    label: TOOL_CATEGORY_LABELS[category],
    tools: listTools().filter((tool) => tool.category === category),
  }));
}

export const TOOLS_HUB_PATH = "/tools";

export const TOOLS_HUB_HEAD = {
  title: "Free Invoicing Tools — Calculators and Generators | VegaPal",
  description:
    "Eight free browser-based tools for invoicing: due dates, discounts, VAT, invoice numbering, payment terms, late fees, crypto payment QR codes and USDT to AED. No signup for results.",
  h1: "Free invoicing tools",
  intro:
    "Small calculators and generators for the arithmetic and wording that surrounds an invoice. Everything runs in your browser, every result is shown without signing in, and nothing you type is stored or sent anywhere.",
};

/** Individual tool pages only; the hub is added separately with its own priority. */
export function getToolsSitemapPaths(): string[] {
  return TOOL_SLUGS.map((slug) => TOOLS[slug].path);
}
