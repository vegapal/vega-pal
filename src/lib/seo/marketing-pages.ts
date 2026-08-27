/**
 * Marketing landing page content for top-level SEO routes (/{slug}).
 *
 * Product truth these pages must respect:
 * - Document types are quotation | proforma_invoice | tax_invoice. There is no
 *   native "proposal" or "payment request" document, so those pages map honestly
 *   onto quotations and invoices.
 * - VegaPal does not custody funds or process payments. It presents bank, crypto
 *   and cash instructions on PDFs and public payment pages.
 * - The free monthly document allowance is interpolated from the product
 *   constant so this copy cannot drift from what the app enforces.
 */

import { FREE_PLAN_MONTHLY_INVOICE_LIMIT as FREE_LIMIT } from "@/lib/admin/plans";

export const MARKETING_PAGE_SLUGS = [
  "invoice-generator",
  "crypto-invoice",
  "crypto-invoice-generator",
  "usdt-invoice",
  "usdt-invoice-generator",
  "proforma-invoice",
  "proforma-invoice-generator",
  "quotation-generator",
  "quotation-template",
  "proposal-generator",
  "payment-request",
  "invoice-template",
  "multi-currency-invoice",
  "bank-transfer-invoice",
  "freelance-invoice",
  "international-invoice",
  "small-business-invoice",
  "consulting-invoice",
  "contractor-invoice",
  "trc20-invoice",
  "erc20-invoice",
  "bep20-invoice",
  "crypto-payment-request",
  "usdt-payment-request",
] as const;

export type MarketingPageSlug = (typeof MARKETING_PAGE_SLUGS)[number];

export type MarketingHub = "invoice" | "crypto" | "documents";

/**
 * Each hub is anchored on one existing pillar page rather than a separate
 * thin index page, so breadcrumbs and cluster links point at real content.
 */
export const MARKETING_HUBS: Record<
  MarketingHub,
  { id: MarketingHub; label: string; pillarSlug: MarketingPageSlug }
> = {
  invoice: { id: "invoice", label: "Invoicing", pillarSlug: "invoice-generator" },
  crypto: { id: "crypto", label: "Crypto invoicing", pillarSlug: "crypto-invoice" },
  documents: { id: "documents", label: "Business documents", pillarSlug: "proforma-invoice" },
};

export type MarketingPageIntent = "informational" | "transactional" | "hybrid";

export type MarketingSection = {
  id: string;
  heading: string;
  body: string[];
};

export type MarketingPage = {
  slug: MarketingPageSlug;
  path: `/${MarketingPageSlug}`;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  intent: MarketingPageIntent;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  /** In-page hash (e.g. "#how-it-works") or internal path (e.g. "/pricing"). */
  secondaryHref: string;
  documentTypeHint: "tax_invoice" | "proforma_invoice" | "quotation";
  hubs: MarketingHub[];
  sections: MarketingSection[];
  useCases: Array<{ title: string; body: string }>;
  steps: Array<{ title: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
  relatedSlugs: MarketingPageSlug[];
};

const MARKETING_PAGES: Record<MarketingPageSlug, MarketingPage> = {
  "invoice-generator": {
    slug: "invoice-generator",
    path: "/invoice-generator",
    title: "Invoice Generator — Create Invoices with Bank or Crypto Details | VegaPal",
    description:
      "Build a professional invoice in minutes: line items, tax, due dates, and bank transfer or crypto payment instructions. Download the PDF and share a payment page with VegaPal.",
    h1: "Invoice generator for bank transfer and crypto payments",
    eyebrow: "Invoice generator",
    intro:
      "Add your client, your line items and your payment details, and VegaPal turns them into a clean invoice you can download as a PDF or share as a link. The same document can carry a bank account, a crypto wallet address, or both, so nobody has to email you asking how to pay.",
    intent: "transactional",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "See how it works",
    secondaryHref: "#how-it-works",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "what-you-get",
        heading: "What you get from every invoice",
        body: [
          "Each document produces two things: a print-ready PDF and a public payment page you can send by email, WhatsApp or Telegram. Both show the same totals, the same due date and the same payment instructions, so there is nothing for your client to reconcile between the two.",
          "Line items handle quantity, unit price, discount and tax, and totals update as you type. Your logo, address and tax or trade licence number live in your settings once and appear on everything you issue afterwards.",
        ],
      },
      {
        id: "payment-instructions",
        heading: "Payment instructions, not a payment processor",
        body: [
          "VegaPal does not hold, move or convert money. What it does is present your instructions clearly: bank name, account name, account number, IBAN and SWIFT for transfers, or asset, network and wallet address for crypto, with a QR code on the payment page.",
          "Your client pays into your own bank account or your own wallet. When the funds arrive you mark the invoice as paid, and the status updates on the shared page too.",
        ],
      },
      {
        id: "document-types",
        heading: "Three document types, one editor",
        body: [
          "The generator covers quotations, proforma invoices and tax invoices. A quotation prices work before it is agreed, a proforma invoice asks for payment in advance, and a tax invoice records a sale that has already happened.",
          "Because they share one editor, you can price a job as a quotation and convert it into an invoice later instead of retyping the line items.",
        ],
      },
      {
        id: "worked-example",
        heading: "One invoice, start to finish (fictional)",
        body: [
          "Bramble & Co, a two-person branding studio, finishes a logo project. They open a tax invoice, select the client, and add two lines: 'Identity design — concepts and refinement — 1 × 4,500.00' and 'Brand guidelines PDF — 1 × 900.00'. Tax is switched on at 5%, so the document shows a 5,400.00 subtotal, 270.00 tax and 5,670.00 AED due.",
          "Issue date is 12 May, due date 26 May. They enable bank transfer with a note asking for the invoice number as the reference, then send the payment page link to their client and the PDF to the client's accounts inbox. Two weeks later the credit appears in their account and they mark INV-2026-0233 paid, which updates the shared page too.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common invoicing mistakes",
        body: [
          "No due date, or 'due on receipt' with nothing calendar-based behind it. Vague timing is the single most reliable way to be paid late, because there is no date for anyone to miss.",
          "Payment details in the email rather than on the document. Invoices get forwarded internally; covering emails do not. Whatever the client needs in order to pay you belongs on the invoice itself.",
          "Descriptions written as categories. 'Consulting' invites a question; 'April advisory retainer, 8 sessions' invites an approval.",
          "Numbering by hand. Two invoices issued on the same day is where manual sequences break, and gaps you cannot explain are exactly what an auditor asks about.",
        ],
      },
      {
        id: "free-plan",
        heading: "What the free plan covers",
        body: [
          `The free plan includes ${FREE_LIMIT} documents per month with PDF downloads, payment pages and the dashboard. Paid plans lift the limit when you are billing more often than that.`,
          "Documents you create stay in your account, and you can duplicate last month's invoice rather than starting from an empty form.",
        ],
      },
    ],
    useCases: [
      {
        title: "Consultants billing after delivery",
        body: "Issue a tax invoice with a due date, share the payment page, and mark it paid when the transfer lands.",
      },
      {
        title: "Agencies working with deposits",
        body: "Send a proforma invoice for the deposit, then a tax invoice for the balance once the work ships.",
      },
      {
        title: "Sellers who quote first",
        body: "Send a quotation, wait for approval, then convert it into an invoice without re-entering anything.",
      },
    ],
    steps: [
      {
        title: "Set up your business once",
        body: "Add your logo, address, tax or trade licence number and default currency in settings.",
      },
      {
        title: "Add the client and line items",
        body: "Enter who you are billing, then your services or products with quantities, prices, discounts and tax.",
      },
      {
        title: "Attach payment details",
        body: "Choose bank transfer, crypto, cash or a combination. Saved details appear on the PDF and the payment page.",
      },
      {
        title: "Send and track",
        body: "Download the PDF or share the link, then update the status when payment arrives.",
      },
    ],
    faqs: [
      {
        question: "Is the invoice generator free?",
        answer: `Yes. The free plan covers ${FREE_LIMIT} documents a month, including PDF export and shareable payment pages. Paid plans raise the monthly limit and add team features.`,
      },
      {
        question: "Do I need an account to create an invoice?",
        answer:
          "Yes, a free account. Your invoices, clients and payment details are saved so you can reuse them and keep a record of what you sent.",
      },
      {
        question: "Does VegaPal collect the payment for me?",
        answer:
          "No. VegaPal shows your own bank or wallet details on the invoice and payment page. Your client pays you directly and you confirm receipt yourself.",
      },
      {
        question: "Can I invoice in a currency other than my own?",
        answer:
          "Yes. Each document has its own currency, including USD, AED, EUR, SAR, CNY, RUB, INR and stablecoins such as USDT and USDC.",
      },
    ],
    relatedSlugs: [
      "invoice-template",
      "small-business-invoice",
      "freelance-invoice",
      "international-invoice",
      "bank-transfer-invoice",
      "crypto-invoice",
    ],
  },

  "crypto-invoice": {
    slug: "crypto-invoice",
    path: "/crypto-invoice",
    title: "Crypto Invoice: What Belongs On One | VegaPal",
    description:
      "A crypto invoice is an ordinary invoice with wallet payment instructions. This is the explainer: required fields, pricing volatile assets, confirming receipt, and the mistakes to avoid.",
    h1: "Crypto invoices, explained end to end",
    eyebrow: "Crypto invoicing",
    intro:
      "This page is the pillar explainer for the whole crypto side of VegaPal. A crypto invoice looks like any other invoice — client details, line items, totals, due date — except the payment block carries an asset, a network and a wallet address instead of, or alongside, a bank account. Here is what belongs on one, how to price it, and how the workflow runs from issue to confirmation.",
    intent: "informational",
    primaryCtaLabel: "Create a crypto invoice",
    secondaryCtaLabel: "What to include",
    secondaryHref: "#what-to-include",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto"],
    sections: [
      {
        id: "what-to-include",
        heading: "What belongs on a crypto invoice",
        body: [
          "Everything a conventional invoice needs still applies: your business details, the client's details, an invoice number, issue and due dates, itemised work and a total. Being paid in crypto does not remove the need for clean records.",
          "The payment block is the part that changes. State the asset, the network, the receiving address exactly as it should be copied, and the amount expected. Vagueness about the network is the most common reason a crypto payment goes to the wrong place.",
        ],
      },
      {
        id: "pricing-and-volatility",
        heading: "Handling price movement",
        body: [
          "If you invoice in a stablecoin such as USDT or USDC, the amount your client sends is the amount you expected. If you invoice in BTC or ETH, decide in advance whether the invoice is fixed in crypto units or fixed in fiat value, and write that choice on the document.",
          "A practical middle ground is to price the work in your accounting currency, state the crypto amount due, and give a short payment window so the figure stays fair to both sides.",
        ],
      },
      {
        id: "confirmation",
        heading: "Confirming that you were paid",
        body: [
          "Crypto settles on-chain, so confirmation is your own check: look at the receiving wallet, match the amount and the timing, then mark the invoice paid. VegaPal never touches the funds and never claims to have verified a transfer for you.",
          "Keeping the transaction hash beside the invoice in your own records makes end-of-quarter reconciliation far less painful.",
        ],
      },
      {
        id: "crypto-and-bank-together",
        heading: "Offering crypto and bank transfer together",
        body: [
          "Plenty of clients would rather pay by transfer, and finance teams often have no choice. One VegaPal invoice can show a bank account and a wallet address side by side, so you do not need two documents or a follow-up email.",
          "The public payment page lays out the bank fields for a manual transfer and gives the wallet a copy button and a QR code.",
        ],
      },
      {
        id: "worked-example",
        heading: "What a finished crypto invoice reads like (fictional)",
        body: [
          "Meridian Data Labs bills a client for a data pipeline build. The header is an ordinary tax invoice: their trade licence number, the client's registered name and address, invoice number INV-2026-0311, issued 2 June, due 16 June. Two line items: 'Pipeline architecture — 1 × 3,000.00' and 'Deployment and handover — 1 × 1,200.00'. Amount due 4,200.00 USDT.",
          "Underneath, the payment block has two halves. The bank half lists account holder, IBAN, SWIFT and a note asking the client to quote INV-2026-0311 as the reference. The crypto half reads 'USDT on TRON (TRC20)' with the address, and one line stating that the amount received must equal 4,200.00 USDT. The client's finance team picks whichever half suits them, and Meridian never has to explain the options in an email.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Where crypto invoices go wrong",
        body: [
          "Treating the crypto payment block as a substitute for the rest of the invoice. Wallet address and amount are not an invoice; you still need a number, dates, a description and your business details, or the document fails the same checks any other invoice would.",
          "Leaving the pricing basis unstated on a volatile asset. If the invoice is for BTC or ETH, say whether the figure is fixed in crypto units or fixed in fiat value at a stated rate, and give a payment window. Silence here becomes a dispute when the market moves.",
          "Naming an asset without the network. USDT, USDC and many other tokens exist on multiple chains with different address formats. The asset alone is an incomplete instruction.",
          "Claiming or assuming automatic confirmation. Nothing in VegaPal watches a chain. Reconciliation is you looking at your own wallet and then updating the document.",
        ],
      },
    ],
    useCases: [
      {
        title: "Freelancers with overseas clients",
        body: "Offer a wallet address next to your bank details when correspondent-bank delays keep pushing your payday back.",
      },
      {
        title: "Studios billing Web3 clients",
        body: "Invoice in USDT with the network written plainly, so the payment arrives on a chain you actually monitor.",
      },
      {
        title: "Businesses accepting either rail",
        body: "Publish one document that works for a treasury team paying by SWIFT and a founder paying from a wallet.",
      },
    ],
    steps: [
      {
        title: "Pick the document type",
        body: "Tax invoice for work already delivered, proforma invoice when you need payment up front.",
      },
      {
        title: "Save your wallet once",
        body: "Store the asset, network and address in payment methods so every future invoice reuses the same string.",
      },
      {
        title: "Issue and share",
        body: "Send the PDF or the payment page link. The QR code and copyable address are generated for you.",
      },
      {
        title: "Confirm and mark paid",
        body: "Check the wallet, match the amount, then update the invoice status so your records agree.",
      },
    ],
    faqs: [
      {
        question: "Is a crypto invoice valid?",
        answer:
          "The invoice is as valid as any other as long as it carries the information your jurisdiction requires. How the crypto you receive is treated for tax purposes depends on local rules, so confirm that with your accountant.",
      },
      {
        question: "Which network should I put on the invoice?",
        answer:
          "The one you can actually receive on. Write the asset and the network together, for example USDT on TRON TRC20, because similar-looking addresses exist on chains you may not be watching.",
      },
      {
        question: "Does VegaPal hold my crypto?",
        answer:
          "No. Payments go straight from your client's wallet to yours. VegaPal displays the instructions and tracks the status you set on the invoice.",
      },
      {
        question: "Can the same invoice show a bank account too?",
        answer:
          "Yes. Bank transfer, crypto and cash instructions can appear together on one document and one payment page.",
      },
    ],
    relatedSlugs: [
      "crypto-invoice-generator",
      "usdt-invoice",
      "trc20-invoice",
      "crypto-payment-request",
      "bank-transfer-invoice",
      "international-invoice",
    ],
  },

  "crypto-invoice-generator": {
    slug: "crypto-invoice-generator",
    path: "/crypto-invoice-generator",
    title: "Crypto Invoice Generator — Saved Wallets and QR Codes | VegaPal",
    description:
      "The generator side: save wallets once, then produce invoices that carry the right asset, network and address every time, with a QR code on the payment page and status tracking in VegaPal.",
    h1: "Crypto invoice generator with saved wallets and QR codes",
    eyebrow: "Crypto invoice generator",
    intro:
      "If you have read the explainer and just want the tool, this is it. Save the wallets you receive on once, then generate invoices that carry the right asset, network and address every time. The payment page renders a QR code and a copy button, so nobody is retyping a 34-character string by hand.",
    intent: "transactional",
    primaryCtaLabel: "Create a crypto invoice",
    secondaryCtaLabel: "See the workflow",
    secondaryHref: "#how-it-works",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto"],
    sections: [
      {
        id: "saved-wallets",
        heading: "Saved wallets mean fewer typos",
        body: [
          "Wallet addresses are the easiest thing in billing to get wrong, and a wrong one is not recoverable. Store each wallet in payment methods with its asset and network — TRON TRC20, Ethereum ERC20, BNB Smart Chain BEP20, Bitcoin or Solana — and pick it from a list when you build an invoice.",
          "Because the address comes from your saved list instead of a paste buffer, the identical string appears on the PDF, on the payment page and inside the QR code.",
        ],
      },
      {
        id: "generator-fields",
        heading: "What the generator asks for",
        body: [
          "Client, currency, line items, discount and tax, due date, then the payment methods you want shown. You can set the invoice currency to USDT, USDC, BTC or ETH directly, or price in fiat and show the crypto amount you expect to receive.",
          "For repeat clients, duplicating last month's invoice and changing the dates is usually faster than filling the form again.",
        ],
      },
      {
        id: "sharing-and-followup",
        heading: "Sharing and following up",
        body: [
          "Every invoice gets a public link that opens without a login, which is what most clients forward internally for approval, and a PDF for accounting inboxes that will not open links.",
          "Statuses move from draft to issued to paid, so working through what is still outstanding at the end of the week is a short job rather than a spreadsheet exercise.",
        ],
      },
      {
        id: "sample-run",
        heading: "A pass through the generator (fictional)",
        body: [
          "Kestrel Motion, a small animation studio, is billing a client 2 ETH for a title sequence. They open a new tax invoice, select the client, and add one line item: 'Title sequence — 12 seconds, two revision rounds'. They set the currency to ETH and the amount to 2.",
          "In the payment step they choose the saved wallet labelled 'Ether — Ethereum (ERC20) — studio'. Because the invoice is in a volatile asset, they add a terms note: priced at 2 ETH, payable within seven days of the issue date. The review screen shows the amount, the network under the address and the due date; they issue, then send the payment page link. Kestrel checks the wallet on receipt and marks the invoice paid themselves.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Setup mistakes worth avoiding",
        body: [
          "Pasting a fresh address for every invoice instead of saving it. Saved wallets exist precisely so the same verified string reaches the PDF, the payment page and the QR code without passing through your clipboard again.",
          "Mixing up which wallet a label refers to when you hold the same asset on two chains. Include the network in the label, not just the asset.",
          "Sending only a PDF to a client who pays from a phone. The payment page gives them the QR code and the copy button; the PDF gives their accountant a file. Send both when you can.",
          "Expecting the status column to move on its own. Draft, issued and paid are states you set. The generator produces documents; it does not observe payments.",
        ],
      },
      {
        id: "what-it-does-not-do",
        heading: "Where the generator stops",
        body: [
          "It does not custody funds, connect to a wallet, request a signature, watch the chain for you, or auto-confirm receipt. You verify the incoming transfer in your own wallet and then mark the invoice paid.",
          "That boundary is deliberate: your keys and your bank stay yours, and VegaPal stays a document and payment-instruction tool.",
        ],
      },
    ],
    useCases: [
      {
        title: "Developers paid in stablecoins",
        body: "Bill a monthly retainer in USDT with the network fixed, and keep every issued invoice in one place.",
      },
      {
        title: "Design studios with international retainers",
        body: "Generate the same invoice each month from a duplicate, changing only the period and the dates.",
      },
      {
        title: "Anyone tired of address screenshots",
        body: "Replace pasted addresses in chat threads with a payment page that shows the QR code and the exact amount.",
      },
    ],
    steps: [
      {
        title: "Add your wallets",
        body: "In payment methods, save each asset, network and address with a label you will recognise later.",
      },
      {
        title: "Build the invoice",
        body: "Pick the client, add line items, choose the currency and set the due date.",
      },
      {
        title: "Select the crypto method",
        body: "Choose the saved wallet, or enable crypto and bank together if the client may pay either way.",
      },
      {
        title: "Share and reconcile",
        body: "Send the link or PDF, confirm the transfer in your wallet, then mark the invoice paid.",
      },
    ],
    faqs: [
      {
        question: "Which assets and networks are supported?",
        answer:
          "USDT, USDC, BTC and ETH as invoice currencies, with networks including TRON TRC20, Ethereum ERC20, BNB Smart Chain BEP20, Bitcoin and Solana.",
      },
      {
        question: "Is there a QR code for the wallet?",
        answer:
          "Yes. The public payment page renders a QR code for the receiving address alongside a copy button, and the PDF carries the address in text.",
      },
      {
        question: "Can I still send a normal fiat invoice?",
        answer:
          "Yes. The same generator produces fiat invoices with bank transfer or cash instructions — crypto is one payment method among several.",
      },
      {
        question: "How many invoices can I generate for free?",
        answer: `The free plan covers ${FREE_LIMIT} documents a month, with PDFs, payment pages and saved payment methods included.`,
      },
    ],
    relatedSlugs: [
      "crypto-invoice",
      "usdt-invoice-generator",
      "erc20-invoice",
      "bep20-invoice",
      "crypto-payment-request",
      "multi-currency-invoice",
    ],
  },

  "usdt-invoice": {
    slug: "usdt-invoice",
    path: "/usdt-invoice",
    title: "USDT Invoice: Rules, Networks and Record-Keeping | VegaPal",
    description:
      "A reference for billing in Tether: which network to name, how to word the amount due, what to keep for your bookkeeper, and the mistakes that lose money. Guide, not a form.",
    h1: "USDT invoicing: the rules worth knowing before you send one",
    eyebrow: "USDT invoicing",
    intro:
      "This is the reference page rather than the editor. USDT is the asset most cross-border clients already hold, which makes it a practical way to get paid without waiting on correspondent banks — but USDT lives on several networks, and the wording on your invoice decides whether the right amount lands on a chain you actually watch.",
    intent: "informational",
    primaryCtaLabel: "Create a USDT invoice",
    secondaryCtaLabel: "Why the network matters",
    secondaryHref: "#network-matters",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto"],
    sections: [
      {
        id: "network-matters",
        heading: "Why the network belongs on the document",
        body: [
          "The same USDT balance can sit on TRON TRC20, Ethereum ERC20 or BNB Smart Chain BEP20, and each has its own address format and fee profile. If your invoice says only USDT, a client may send on a chain your wallet does not watch.",
          "VegaPal keeps the network attached to the saved wallet, so it prints next to the address on the PDF and on the payment page rather than living in a separate message you forgot to send.",
        ],
      },
      {
        id: "amounts-and-fees",
        heading: "Amounts, fees and what actually arrives",
        body: [
          "Because USDT tracks the dollar, a 2,400 USDT invoice should land as 2,400 USDT. Network fees are paid by the sender, but it is still worth writing on the invoice that the amount received must match the amount due, so nobody nets the fee out of your payment.",
          "If your books run in AED, EUR or another currency, record the fiat equivalent on the day the payment lands — that figure, not the invoice date rate, is usually what your accountant needs.",
        ],
      },
      {
        id: "records",
        heading: "Keeping records a bookkeeper will accept",
        body: [
          "A USDT invoice is still an invoice: sequential number, issue date, due date, itemised work, totals and tax where it applies. Getting paid on-chain is not a reason to keep looser paperwork than a bank-paid client would get.",
          "Store the transaction hash with your copy of the invoice. It is the crypto equivalent of a bank reference and answers most questions before they are asked.",
        ],
      },
      {
        id: "worked-example",
        heading: "A worked example (fictional)",
        body: [
          "Suppose Northwind Studio in Dubai delivers a website audit for a client in Istanbul. The invoice reads: tax invoice INV-2026-0087, issued 4 March, due 18 March, one line item 'Technical SEO audit and report — 1 × 2,400.00 USDT', amount due 2,400.00 USDT.",
          "The payment block reads 'USDT on TRON (TRC20)' above the receiving address, with a single sentence underneath: network fees are paid by the sender, so the amount received must equal 2,400.00 USDT. When 2,400 USDT arrives, Northwind files the transaction hash next to its copy of the invoice, marks the document paid, and records the AED equivalent using the rate on 11 March, the day the payment landed.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes that cost real money",
        body: [
          "Writing only 'USDT' with no network. This is the expensive one: a client sends on BNB Smart Chain to an address you only monitor on TRON, and the balance sits somewhere you may not be able to reach. Name the asset and the network together, every time.",
          "Letting the client net the network fee out of the payment. If you invoice 2,400 USDT and receive 2,398.20, you now have a partial payment and an awkward email. One sentence on the invoice prevents it.",
          "Copying an address from a chat thread instead of your saved payment methods. Truncated addresses, autocorrected characters and stale wallets all come from the same habit. Save the wallet once and select it.",
          "Recording the fiat value using the invoice date rather than the settlement date. Your accountant almost always wants the value on the day the funds arrived, and reconstructing that rate months later is unpleasant.",
        ],
      },
      {
        id: "boundaries",
        heading: "What VegaPal does and does not do",
        body: [
          "VegaPal creates the document and publishes your payment instructions on a PDF and a public page. It does not hold your USDT, convert it, watch the chain, verify a transaction, or act as an escrow — there is no wallet connection and no signature request anywhere in the product.",
          "The payment goes wallet to wallet. You confirm it yourself, then mark the invoice paid so your dashboard and the shared page agree. Any status you see in VegaPal is a status you or your teammate set.",
        ],
      },
    ],
    useCases: [
      {
        title: "Cross-border service work",
        body: "Bill a client three time zones away without a five-day wire and two intermediary fees.",
      },
      {
        title: "Dubai-based businesses with regional clients",
        body: "Quote in AED for your own books while accepting USDT from clients who prefer to settle in stablecoins.",
      },
      {
        title: "Recurring monthly retainers",
        body: "Send the same USDT amount every month from a duplicated invoice, with the network unchanged.",
      },
    ],
    steps: [
      {
        title: "Save the receiving wallet",
        body: "Add the USDT address with its network so the pair travels together on every document.",
      },
      {
        title: "Set the invoice up",
        body: "Choose USDT as the currency, add line items, and set a payment window that suits the work.",
      },
      {
        title: "Send the payment page",
        body: "Your client scans the QR code or copies the address, and sees exactly how much is due.",
      },
      {
        title: "Confirm and close",
        body: "Match the incoming amount in your wallet, mark the invoice paid, and file the transaction hash.",
      },
    ],
    faqs: [
      {
        question: "Which USDT networks can I invoice on?",
        answer:
          "TRON TRC20, Ethereum ERC20 and BNB Smart Chain BEP20 are all available as saved networks, so pick whichever your wallet receives on.",
      },
      {
        question: "Can I show the fiat value next to the USDT amount?",
        answer:
          "Yes. You can price the work in your own currency and issue in USDT, or add the fiat equivalent as a note on the invoice for your client's records.",
      },
      {
        question: "What if the client sends slightly less than the invoice?",
        answer:
          "That is a conversation between you and the client. VegaPal lets you keep the invoice open or mark it paid, but it does not adjust balances automatically.",
      },
      {
        question: "Does VegaPal need access to my wallet?",
        answer:
          "No. You paste a receiving address. There are no keys, no connections and no permissions involved.",
      },
    ],
    relatedSlugs: [
      "usdt-invoice-generator",
      "trc20-invoice",
      "erc20-invoice",
      "bep20-invoice",
      "crypto-invoice",
      "usdt-payment-request",
    ],
  },

  "usdt-invoice-generator": {
    slug: "usdt-invoice-generator",
    path: "/usdt-invoice-generator",
    title: "USDT Invoice Generator — Build a Tether Invoice in the Editor | VegaPal",
    description:
      "Step through the VegaPal editor: client, line items, USDT amount, saved wallet. Out comes an invoice PDF plus a payment page with the address, network and QR code. Free plan included.",
    h1: "USDT invoice generator: the editor, step by step",
    eyebrow: "USDT invoice generator",
    intro:
      "If you already know how you want the invoice worded, this page is the walkthrough of the tool that produces it. Open the editor, pick the client, type the work, choose USDT and the wallet you receive on, and you have a document plus a shareable payment page. No template downloads, no spreadsheet formulas to repair.",
    intent: "transactional",
    primaryCtaLabel: "Create a USDT invoice",
    secondaryCtaLabel: "Steps in the editor",
    secondaryHref: "#how-it-works",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto"],
    sections: [
      {
        id: "editor-flow",
        heading: "How the editor is laid out",
        body: [
          "The wizard walks through client, items, payment and review, and shows a live total as you go. Discounts and tax are optional switches rather than fields you have to zero out.",
          "The review step is where you catch the things that matter: the network next to the address, the due date, and whether the amount reads the way you want it to on the PDF.",
        ],
      },
      {
        id: "reuse",
        heading: "Built for the second invoice, not just the first",
        body: [
          "Clients, wallets and business details are saved, so the tenth USDT invoice takes under a minute. Duplicating an earlier one keeps the items and swaps only the period.",
          "Invoice numbers continue in sequence automatically, which keeps your records tidy without you tracking the last number used.",
        ],
      },
      {
        id: "client-experience",
        heading: "What your client actually receives",
        body: [
          "A link that opens on a phone, shows the amount due in USDT, the network, a QR code and a copy button, and states who the payment is going to. If they prefer a file, the PDF matches it line for line.",
          "Because the page is public and read-only, it can be forwarded to whoever approves payments without anyone needing a VegaPal login.",
        ],
      },
      {
        id: "sample-run",
        heading: "What one pass through the editor looks like (fictional)",
        body: [
          "Aster Localisation needs to bill a client 1,150 USDT for two weeks of subtitling. In the client step they pick an existing record. In the items step they add 'Subtitle localisation — EN to AR, 4 episodes' at 287.50 × 4. Currency is set to USDT, due date to 21 days out.",
          "In the payment step they select the saved wallet labelled 'Tether — TRON (TRC20) — main', which fills the asset, network and address from one choice. The review screen shows 1,150.00 USDT due, the network under the address, and the invoice number that will be assigned. They issue, copy the payment link into the client's Slack channel, and the whole pass takes about ninety seconds.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Mistakes the editor cannot catch for you",
        body: [
          "Issuing before the review step. The preview is where a wrong network, a missing due date or a typo in the amount is still cheap to fix. Once the link is with the client, corrections cost a conversation.",
          "Saving a wallet with a vague label. 'Wallet 2' tells you nothing in six months. Label wallets by asset and network so the right one is obvious in the picker.",
          "Editing a duplicated invoice but forgetting the period in the line description. Duplicating is the fastest route to the next invoice and also the easiest way to bill February twice.",
          "Assuming the paid status means the software checked. Marking an invoice paid is a manual step you take after seeing funds in your own wallet — nothing in VegaPal reads the chain.",
        ],
      },
      {
        id: "plans",
        heading: "Free plan and limits",
        body: [
          `The free plan covers ${FREE_LIMIT} documents a month, including PDFs, payment pages and saved wallets. Paid plans raise that limit and add seats when more than one person is issuing invoices.`,
          "There is no per-invoice fee and no cut taken from your payment, because the payment never passes through VegaPal.",
        ],
      },
    ],
    useCases: [
      {
        title: "First USDT invoice ever",
        body: "You have an address and a client waiting, and you need a document that looks professional today.",
      },
      {
        title: "Switching from a spreadsheet",
        body: "Stop maintaining a template where the totals break every time you insert a row.",
      },
      {
        title: "Small teams sharing billing",
        body: "Keep numbering, wallets and client records in one account instead of three laptops.",
      },
    ],
    steps: [
      {
        title: "Open the editor",
        body: "Start a new document and choose tax invoice, or proforma invoice if you are billing in advance.",
      },
      {
        title: "Choose USDT and the wallet",
        body: "Set the currency to USDT and select the saved address with the network you receive on.",
      },
      {
        title: "Review the totals",
        body: "Check the amount, due date and payment block on the preview before you issue.",
      },
      {
        title: "Share it",
        body: "Copy the payment link or download the PDF, then track the status until it is paid.",
      },
    ],
    faqs: [
      {
        question: "Can I use the generator without connecting a wallet?",
        answer:
          "Yes. You type or paste a receiving address. Nothing is connected and no signature is ever requested.",
      },
      {
        question: "Does it work on a phone?",
        answer:
          "Yes. The editor and the payment page are both built for small screens, which matters when you are invoicing between meetings.",
      },
      {
        question: "Can I add my logo and trade licence number?",
        answer:
          "Yes. Set them once in settings and they appear on every invoice you issue after that.",
      },
      {
        question: "What happens after I mark an invoice paid?",
        answer:
          "The status updates on your dashboard and on the public payment page, so the client sees that the payment was received.",
      },
    ],
    relatedSlugs: [
      "usdt-invoice",
      "crypto-invoice-generator",
      "trc20-invoice",
      "usdt-payment-request",
      "invoice-generator",
    ],
  },

  "proforma-invoice": {
    slug: "proforma-invoice",
    path: "/proforma-invoice",
    title: "Proforma Invoice — Meaning, Uses and What Goes On It | VegaPal",
    description:
      "A proforma invoice requests payment before delivery and is not a tax document. The explainer: how it differs from a quotation and a tax invoice, what to include, and where it goes wrong.",
    h1: "Proforma invoices: what they are for and when to use one",
    eyebrow: "Proforma invoice",
    intro:
      "This is the reference page for the document type, and the pillar for everything VegaPal publishes about business paperwork. A proforma invoice is a request for payment issued before the goods ship or the work starts. It states the agreed amount and how to pay, but it is not the final tax document — that comes afterwards, once the sale is complete.",
    intent: "informational",
    primaryCtaLabel: "Create a proforma invoice",
    secondaryCtaLabel: "Proforma vs tax invoice",
    secondaryHref: "#proforma-vs-tax-invoice",
    documentTypeHint: "proforma_invoice",
    hubs: ["documents"],
    sections: [
      {
        id: "proforma-vs-tax-invoice",
        heading: "Proforma invoice, quotation and tax invoice",
        body: [
          "A quotation is an offer: here is what the work would cost, and you are free to decline. A proforma invoice comes after agreement and asks for payment ahead of delivery. A tax invoice records a completed sale and is the document your client's accounts department files.",
          "The practical difference is timing and finality. A proforma can be revised, and it should not be treated as a booked sale in your accounts. The tax invoice that follows is what gets recorded.",
        ],
      },
      {
        id: "when-to-send",
        heading: "When a proforma is the right document",
        body: [
          "Use one when a deposit is required before you begin, when a new client has no payment history with you, or when your client's finance team needs a document to raise a payment before receiving goods.",
          "It is also the document customs brokers and freight forwarders usually ask for on cross-border shipments, because it declares the value and terms before anything moves.",
        ],
      },
      {
        id: "what-to-include",
        heading: "What to put on it",
        body: [
          "Label it clearly as a proforma invoice, give it its own number, and include your details, the client's details, itemised goods or services, totals, the validity period and the payment instructions. Note that it is not a tax invoice so nobody files it as one.",
          "If a deposit is being requested, spell out the split: what is due now, what is due on delivery, and what happens if the order changes.",
        ],
      },
      {
        id: "worked-example",
        heading: "A proforma invoice in words (fictional)",
        body: [
          "Harbour Fabrication quotes, then wins, a run of 40 aluminium brackets. Before cutting metal they issue proforma invoice PI-2026-0044, dated 9 April, valid for 21 days. The body reads 'Aluminium bracket, 6082-T6, drawing HB-114 — 40 × 46.00' with a subtotal of 1,840.00, 5% tax shown separately, and a total of 1,932.00 AED.",
          "The terms field carries the split in plain words: 50% (966.00 AED) due to start production, balance due on collection, pricing held for 21 days from the issue date. A line under the heading states that this document is a proforma invoice and not a tax invoice. When the deposit lands, Harbour marks PI-2026-0044 paid and, on collection, issues tax invoice INV-2026-0512 for the balance.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common proforma mistakes",
        body: [
          "Sending a proforma and never following it with a tax invoice. The proforma is a request; the tax invoice is the record of the completed sale that your client's accounts department needs. Skipping the second document leaves both sides with incomplete books.",
          "Omitting the validity period. Without an expiry you have promised a price indefinitely, which matters most in exactly the businesses that use proformas — manufacturing, freight, anything with input costs that move.",
          "Reusing your tax invoice numbering series. Mixed series are hard to explain to an auditor. VegaPal keeps a separate sequence per document type for this reason.",
          "Letting the client treat it as a VAT document. Say on the face of the document that it is a proforma invoice and not a tax invoice, so nobody files it as one.",
        ],
      },
      {
        id: "in-vegapal",
        heading: "How it works in VegaPal",
        body: [
          "Proforma invoice is a first-class document type, not a renamed invoice. It gets its own numbering series and prints with the correct heading, alongside quotations and tax invoices.",
          "Payment instructions work the same way as on any other document: bank transfer fields, a crypto wallet with its network, cash details, or a combination shown together. VegaPal presents those instructions — it does not take the deposit or hold it for either party.",
        ],
      },
    ],
    useCases: [
      {
        title: "Deposits before production",
        body: "Ask for 50% up front on a build, then invoice the balance when the work is delivered.",
      },
      {
        title: "New clients with no history",
        body: "Request advance payment politely, with a document their finance team can process.",
      },
      {
        title: "Cross-border shipments",
        body: "Give a broker the value and terms in writing before the goods leave your warehouse.",
      },
    ],
    steps: [
      {
        title: "Pick proforma invoice",
        body: "Choose the document type so the heading, numbering and wording are correct from the start.",
      },
      {
        title: "State the amount and validity",
        body: "Itemise what is being supplied, set the total, and add how long the terms stay open.",
      },
      {
        title: "Send it for payment",
        body: "Share the PDF or payment page with the bank or wallet details your client needs.",
      },
      {
        title: "Follow with a tax invoice",
        body: "Once the sale completes, issue the tax invoice that your client files.",
      },
    ],
    faqs: [
      {
        question: "Is a proforma invoice legally binding?",
        answer:
          "It is generally treated as a good-faith statement of terms rather than a demand for payment on a completed sale. Local rules vary, so confirm how your jurisdiction treats it.",
      },
      {
        question: "Can a proforma invoice include tax?",
        answer:
          "You can show the expected tax so the total is realistic, but the proforma itself is not the tax document your client claims from. The tax invoice that follows is.",
      },
      {
        question: "Do I need to send a tax invoice afterwards?",
        answer:
          "In most cases yes, once the goods or services are delivered. VegaPal keeps both documents in the same account so the pair is easy to find.",
      },
      {
        question: "What is the difference from a quotation?",
        answer:
          "A quotation prices work that has not been agreed yet. A proforma invoice assumes agreement and asks for payment before delivery.",
      },
    ],
    relatedSlugs: [
      "proforma-invoice-generator",
      "quotation-generator",
      "quotation-template",
      "international-invoice",
      "payment-request",
      "invoice-generator",
    ],
  },

  "proforma-invoice-generator": {
    slug: "proforma-invoice-generator",
    path: "/proforma-invoice-generator",
    title: "Proforma Invoice Generator — Deposits and Staged Payments | VegaPal",
    description:
      "The tool for issuing proformas: own numbering series, validity period, deposit terms and payment instructions, shared as a PDF or link. Follow with a tax invoice once the sale completes.",
    h1: "Proforma invoice generator with its own numbering series",
    eyebrow: "Proforma invoice generator",
    intro:
      "This page covers the mechanics rather than the definition. Choose proforma invoice as the document type and VegaPal handles the heading, the numbering series and the wording, so you are not editing an invoice template and hoping nobody notices. Payment instructions, validity and deposit terms all sit on the same page.",
    intent: "transactional",
    primaryCtaLabel: "Create a proforma invoice",
    secondaryCtaLabel: "See the steps",
    secondaryHref: "#how-it-works",
    documentTypeHint: "proforma_invoice",
    hubs: ["documents"],
    sections: [
      {
        id: "correct-by-default",
        heading: "Correct document, not a relabelled invoice",
        body: [
          "Because proforma is a real document type, the output says proforma invoice, carries its own number sequence and keeps your tax invoice numbering clean. Auditors and finance teams notice when those series are mixed.",
          "Everything else behaves like the rest of the editor: line items with quantity and unit price, optional discount and tax, notes and terms.",
        ],
      },
      {
        id: "deposit-terms",
        heading: "Deposits and staged payments",
        body: [
          "Use the notes and terms fields to set out the split — what is due to start, what is due on delivery, and how long the pricing holds. Written terms save the awkward conversation later.",
          "If you take a deposit now and the balance in a month, issue the proforma for the first amount and a tax invoice for the rest, so each document matches one payment.",
        ],
      },
      {
        id: "payment-block",
        heading: "How the client pays",
        body: [
          "Attach bank transfer details with account name, number, IBAN and SWIFT, a crypto wallet with its network, or cash instructions. The public page shows the same details as the PDF, with a QR code where the payment method supports one.",
          "VegaPal is not in the payment path — the money moves from your client to your account, and you record it once you see it.",
        ],
      },
      {
        id: "sample-run",
        heading: "Issuing a deposit proforma (fictional)",
        body: [
          "Lantern Interiors has agreed a 12,000 AED fit-out and wants half up front. They start a new document, choose proforma invoice, and the heading and PI numbering series are set before they type anything.",
          "They itemise the deposit as one line — 'Fit-out deposit, 50% of agreed scope (see terms)' at 6,000.00 — then use the terms field for the detail: what the deposit covers, that the balance of 6,000.00 is due on completion, and that pricing holds for 30 days. Bank transfer is enabled with a note asking for the PI number as the reference. On completion they issue a separate tax invoice for the balance, so each document lines up with exactly one payment.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Mistakes when generating proformas",
        body: [
          "Putting the full contract value on a deposit proforma. If you are asking for 50% now, issue the document for that amount and describe the balance in the terms. One document, one payment.",
          "Leaving the validity field empty because the client is friendly. Costs move, and a stated expiry is easier than renegotiating later.",
          "Editing an issued proforma without telling the client. Editing is allowed and often correct, but the shared link always shows the current version — so mention the change rather than letting them discover a different total.",
          `Forgetting that every document type draws on the same free allowance. A deposit proforma plus its balance invoice uses two of the ${FREE_LIMIT} monthly documents on the free plan.`,
        ],
      },
      {
        id: "after-payment",
        heading: "What happens after it is paid",
        body: [
          "Mark the proforma as paid and issue the tax invoice for the completed sale. Both documents stay in your account, linked to the same client record.",
          `On the free plan this counts toward the ${FREE_LIMIT} documents a month included, so a deposit and its balance use two of them.`,
        ],
      },
    ],
    useCases: [
      {
        title: "Manufacturers and workshops",
        body: "Request a production deposit with the specification itemised and the validity period stated.",
      },
      {
        title: "Consultants starting a retained engagement",
        body: "Ask for the first month up front, then invoice normally once the work is underway.",
      },
      {
        title: "Exporters preparing paperwork",
        body: "Produce the value declaration a broker needs before the shipment is booked.",
      },
    ],
    steps: [
      {
        title: "Select the document type",
        body: "Start a new document and choose proforma invoice so the numbering and heading are right.",
      },
      {
        title: "Itemise and price",
        body: "Add goods or services with quantities, apply tax or discount if relevant, and set the total.",
      },
      {
        title: "Add terms and payment details",
        body: "State validity and deposit terms, then attach bank, crypto or cash instructions.",
      },
      {
        title: "Share and convert later",
        body: "Send the PDF or link, and issue a tax invoice once the sale is complete.",
      },
    ],
    faqs: [
      {
        question: "Does the proforma use the same numbers as my invoices?",
        answer:
          "No. Proforma invoices have their own series, which keeps your tax invoice numbering continuous and easy to explain.",
      },
      {
        question: "Can I edit a proforma after sending it?",
        answer:
          "Yes, that is part of what makes it a proforma. Update it and reshare the link, which always shows the current version.",
      },
      {
        question: "Can I include a deposit percentage?",
        answer:
          "Issue the proforma for the deposit amount and describe the remaining balance in the terms, so each document corresponds to one payment.",
      },
      {
        question: "Is a proforma invoice included in the free plan?",
        answer: `Yes. Every document type counts toward the same monthly allowance of ${FREE_LIMIT} on the free plan.`,
      },
    ],
    relatedSlugs: [
      "proforma-invoice",
      "quotation-generator",
      "payment-request",
      "small-business-invoice",
      "invoice-generator",
      "bank-transfer-invoice",
    ],
  },

  "quotation-generator": {
    slug: "quotation-generator",
    path: "/quotation-generator",
    title: "Quotation Generator — Send Priced Offers and Convert to Invoices | VegaPal",
    description:
      "Create a quotation with itemised pricing and a validity period, share it as a PDF or link, and convert it to an invoice when the client says yes. Free plan available.",
    h1: "Quotation generator that turns approvals into invoices",
    eyebrow: "Quotation generator",
    intro:
      "Price the work, set how long the offer stands, and send a quotation your client can read on a phone or forward to whoever signs off. When it is approved, convert it into an invoice instead of typing the same line items twice.",
    intent: "transactional",
    primaryCtaLabel: "Create a quotation",
    secondaryCtaLabel: "How conversion works",
    secondaryHref: "#convert-to-invoice",
    documentTypeHint: "quotation",
    hubs: ["documents"],
    sections: [
      {
        id: "what-a-good-quote-does",
        heading: "What a quotation has to do",
        body: [
          "It has to make the price defensible and the scope obvious. Itemising the work — rather than giving one lump sum — is what lets a client remove an option instead of rejecting the whole thing.",
          "It also has to have an expiry. A quotation with no validity date is a price you have promised forever, and costs move.",
        ],
      },
      {
        id: "convert-to-invoice",
        heading: "Converting an approved quotation",
        body: [
          "When the client agrees, convert the quotation into a tax invoice in a couple of clicks. Line items, client details and totals carry across, and you choose whether the new invoice starts as a draft or is issued straight away.",
          "The original quotation stays in your records, so you can see what was offered next to what was eventually billed.",
        ],
      },
      {
        id: "presentation",
        heading: "Presentation without a design tool",
        body: [
          "Quotations print with your logo, address and registration details, and the same layout as your invoices, which makes the pair look like they came from the same business.",
          "Notes and terms fields cover assumptions, exclusions and timelines, the three things clients argue about most once work starts.",
        ],
      },
      {
        id: "tracking",
        heading: "Keeping track of what is outstanding",
        body: [
          "Quotations appear in your dashboard with their own status, so you can see what is waiting on a decision rather than searching your sent folder.",
          "Sending a nudge is easier when you can see the date it went out and the expiry you set.",
        ],
      },
      {
        id: "worked-example",
        heading: "A phased quotation (fictional)",
        body: [
          "Sable Web quotes a site rebuild in three lines rather than one: 'Discovery and information architecture — 1 × 2,000.00', 'Design and build, 8 templates — 1 × 7,500.00', 'Launch support, 30 days — 1 × 1,200.00'. Total 10,700.00 USD, quotation QTN-2026-0119, valid 21 days.",
          "The terms field names the assumptions that usually cause arguments: copy and images supplied by the client, hosting billed separately, one revision round per template. The client approves the first two lines and declines launch support — which is only possible because the offer was itemised. Sable converts the accepted quotation into a tax invoice, and the 8,300.00 they bill is visibly the 8,300.00 that was agreed.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common quotation mistakes",
        body: [
          "A single lump sum. Clients who cannot see the components can only accept or reject the whole thing, so a small objection kills the entire quote.",
          "No expiry date. An open-ended price is a promise you did not mean to make, and it gets quoted back to you months later.",
          "No stated way to say yes. If the document does not say what acceptance looks like, you get a reply asking a question instead of an approval.",
          "Rebuilding the invoice from scratch after approval. Retyping is how the billed figure drifts from the agreed figure; converting the quotation keeps the two identical.",
        ],
      },
    ],
    useCases: [
      {
        title: "Studios pitching scoped work",
        body: "Break a project into phases so the client can approve stage one without committing to everything.",
      },
      {
        title: "Suppliers quoting on request",
        body: "Answer a request for pricing with a document that has a number, a date and an expiry.",
      },
      {
        title: "Anyone who bills after approval",
        body: "Quote first, convert to an invoice on acceptance, and skip the retyping.",
      },
    ],
    steps: [
      {
        title: "Start a quotation",
        body: "Choose quotation as the document type so the heading and numbering series are correct.",
      },
      {
        title: "Itemise the offer",
        body: "Add each element with quantity and price, then set validity, notes and terms.",
      },
      {
        title: "Send it for a decision",
        body: "Share the link or PDF and track the status while you wait.",
      },
      {
        title: "Convert on approval",
        body: "Turn the accepted quotation into an invoice, as a draft or issued immediately.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between a quotation and an estimate?",
        answer:
          "In everyday use a quotation is a firm price for defined scope, while an estimate signals an approximate figure. VegaPal issues quotations, so state clearly in the terms if any figure is indicative.",
      },
      {
        question: "Can I convert a quotation into an invoice?",
        answer:
          "Yes. Conversion creates a tax invoice from the quotation, carrying over the client and line items, and you decide whether it starts as a draft.",
      },
      {
        question: "Should a quotation show payment details?",
        answer:
          "It can, and it saves a round trip if the client wants to pay a deposit immediately. Nothing is payable until they accept.",
      },
      {
        question: "Do quotations count toward the free plan limit?",
        answer: `Yes, all document types share the same allowance of ${FREE_LIMIT} per month on the free plan.`,
      },
    ],
    relatedSlugs: [
      "quotation-template",
      "proposal-generator",
      "proforma-invoice",
      "proforma-invoice-generator",
      "payment-request",
    ],
  },

  "quotation-template": {
    slug: "quotation-template",
    path: "/quotation-template",
    title: "Quotation Template — Structure, Wording and a Working Alternative | VegaPal",
    description:
      "See what a solid quotation template contains, section by section, and why generating quotations beats maintaining a document file. Create yours in VegaPal.",
    h1: "Quotation template: every section, and what to write in it",
    eyebrow: "Quotation template",
    intro:
      "Most quotation templates fail in the same places: no expiry, vague scope, and a total that stops matching the line items after the third edit. Here is the structure that holds up, and a way to produce it without maintaining a file.",
    intent: "informational",
    primaryCtaLabel: "Create a quotation",
    secondaryCtaLabel: "Template structure",
    secondaryHref: "#template-structure",
    documentTypeHint: "quotation",
    hubs: ["documents"],
    sections: [
      {
        id: "template-structure",
        heading: "The sections a quotation needs",
        body: [
          "A header with your business name, address and registration or tax number. The client's name and address. A quotation number, an issue date and a validity date. Then the itemised offer: description, quantity, unit price and line total, followed by subtotal, discount, tax and grand total.",
          "Close with terms — payment schedule, lead time, what is excluded — and how to accept. A quote that does not say how to say yes gets replied to with a question instead of an approval.",
        ],
      },
      {
        id: "wording",
        heading: "Wording that prevents arguments",
        body: [
          "Write scope as deliverables rather than activities: 'three landing page designs, two revision rounds' says more than 'design work'. Exclusions matter just as much — name the things you are not doing.",
          "For validity, a plain sentence is enough: this quotation is valid for 14 days from the issue date. For payment, state the split and the method rather than leaving 'terms to be agreed'.",
        ],
      },
      {
        id: "why-files-break",
        heading: "Why a document file stops working",
        body: [
          "A spreadsheet or word processor template has no numbering, no record of what you sent, and no protection against a formula that silently stops summing a new row. The tenth version is never the one you meant to send.",
          "Generating the document instead means the number is sequential, the totals are calculated, and the version your client is looking at is the one in your account.",
        ],
      },
      {
        id: "worked-example",
        heading: "The structure filled in (fictional)",
        body: [
          "Header: Ridgeline Surveying, Unit 4 Al Quoz, TRN 100xxxxxxxxxx03. Client: Cobalt Developments, Business Bay. Quotation QTN-2026-0207, issued 3 February, valid until 24 February.",
          "Offer: 'Topographic survey, plot 118 — 1 × 5,400.00', 'CAD deliverable and site marks — 1 × 1,100.00'. Subtotal 6,500.00, tax 5% 325.00, total 6,825.00 AED. Terms: access to the plot arranged by the client, one mobilisation included, additional visits charged at 800.00 each, 50% due on instruction. Acceptance: reply confirming this quotation number, or return a signed copy. Every field above is a field on the generated document rather than a line you have to remember to type.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Where template files fail",
        body: [
          "A subtotal formula that stopped including the last row. This is the classic spreadsheet failure and it always favours the client.",
          "Two people using two slightly different copies of the same file, so the terms your client received are not the terms you think you sent.",
          "Overwriting last month's quote rather than issuing a new numbered one, which leaves no record of what was originally offered.",
          "Exclusions kept in your head. If it is not in the terms field, it was not excluded.",
        ],
      },
      {
        id: "from-template-to-invoice",
        heading: "From accepted quote to invoice",
        body: [
          "The point of a good quotation is that it becomes an invoice with no retyping. In VegaPal an accepted quotation converts into a tax invoice, keeping the items and client details intact.",
          "That also means the offer and the bill can be compared later, which is useful when someone asks why the final figure differs.",
        ],
      },
    ],
    useCases: [
      {
        title: "Replacing a spreadsheet template",
        body: "Keep the structure you like, drop the broken formulas and the manual numbering.",
      },
      {
        title: "Standardising across a small team",
        body: "Give everyone the same layout, terms and numbering instead of three personal versions.",
      },
      {
        title: "Quoting quickly on mobile",
        body: "Answer a pricing request from your phone with a document that still looks deliberate.",
      },
    ],
    steps: [
      {
        title: "Fill in your business details once",
        body: "Logo, address and registration number are saved and reused on every quotation.",
      },
      {
        title: "Build the itemised offer",
        body: "Add each deliverable with quantity and price so the client can see how the total is made up.",
      },
      {
        title: "Set validity and terms",
        body: "Add an expiry date, the payment split and any exclusions you want on record.",
      },
      {
        title: "Send, then convert",
        body: "Share the PDF or link, and convert to an invoice once it is accepted.",
      },
    ],
    faqs: [
      {
        question: "Can I download a blank quotation template?",
        answer:
          "VegaPal generates finished quotations rather than blank files, because a generated document keeps its numbering, totals and record of what you sent. The structure above is the same one it produces.",
      },
      {
        question: "How long should a quotation stay valid?",
        answer:
          "Seven to thirty days suits most service work. Shorter if your input costs move, longer if the client has a slow approval chain.",
      },
      {
        question: "Should the quotation include tax?",
        answer:
          "If you are registered for tax, show it as a separate line so the client sees both the net and the gross figure.",
      },
      {
        question: "Can I reuse a quotation for a similar job?",
        answer:
          "Yes. Duplicate the earlier one, adjust the items and dates, and send it with a new number.",
      },
    ],
    relatedSlugs: [
      "quotation-generator",
      "proposal-generator",
      "invoice-template",
      "proforma-invoice",
      "payment-request",
    ],
  },

  "proposal-generator": {
    slug: "proposal-generator",
    path: "/proposal-generator",
    title: "Proposal Generator — Present Priced Offers as Quotations | VegaPal",
    description:
      "VegaPal builds priced, itemised quotations you can send as a proposal, with scope in the terms and conversion to an invoice on approval. No separate proposal document type.",
    h1: "Send priced proposals as professional quotations",
    eyebrow: "Proposals",
    intro:
      "To be straight with you: VegaPal has no separate proposal document. What it does have is quotations — itemised, priced, dated offers with terms and a validity period — which is exactly the part of a proposal a client has to approve before work starts.",
    intent: "hybrid",
    primaryCtaLabel: "Create a quotation",
    secondaryCtaLabel: "What this covers",
    secondaryHref: "#what-this-covers",
    documentTypeHint: "quotation",
    hubs: ["documents"],
    sections: [
      {
        id: "what-this-covers",
        heading: "What a quotation covers, and what it does not",
        body: [
          "A quotation carries the commercial part of a proposal: the deliverables, the price for each, the total, the timeline in your terms, and the date the offer expires. For a lot of service work that is the whole document the client needs.",
          "What it is not is a long-form pitch deck with case studies, team bios and a narrative. If your sales process needs that, write it separately and attach the quotation as the pricing your client signs off.",
        ],
      },
      {
        id: "structure-a-priced-proposal",
        heading: "Structuring a priced proposal",
        body: [
          "Break the engagement into phases or workstreams as separate line items. Discovery, build, launch support — each with its own price. Clients approve faster when they can see what they are paying for and can drop an item instead of the whole project.",
          "Put assumptions and exclusions in the terms field. 'Copy supplied by client' and 'hosting billed separately' belong in writing, not in your memory of a call.",
        ],
      },
      {
        id: "approval-to-invoice",
        heading: "From approval to getting paid",
        body: [
          "Once the client accepts, convert the quotation into a tax invoice. Nothing is retyped, so the amount you bill matches the amount you offered.",
          "If you need money before starting, issue a proforma invoice for the deposit instead, and keep the quotation as the record of the agreed scope.",
        ],
      },
      {
        id: "presentation-details",
        heading: "Details that make it read as professional",
        body: [
          "Your logo, full business details and a sequential document number do most of the work. A document that looks like part of a system reads as a business rather than an improvised email.",
          "Sharing matters too: a link that opens on any device gets forwarded internally more often than an attachment that has to be downloaded first.",
        ],
      },
      {
        id: "worked-example",
        heading: "A priced proposal as a quotation (fictional)",
        body: [
          "Orrery Analytics pitches a six-week engagement. The quotation has four lines: 'Phase 1 — data audit and stakeholder interviews — 1 × 3,200.00', 'Phase 2 — dashboard build — 1 × 6,400.00', 'Phase 3 — team training, 2 sessions — 1 × 1,500.00', and 'Optional: monthly retainer, first month — 1 × 2,000.00'.",
          "The terms field carries the narrative that a quotation cannot: timeline by phase, that phase 2 begins on written sign-off of phase 1, data access requirements, and that the optional retainer can be dropped without affecting the rest. The client accepts phases 1 to 3 and defers the retainer. Orrery keeps the quotation as the agreed scope and issues a proforma invoice for the phase 1 deposit before starting.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Mistakes when a proposal carries the pricing",
        body: [
          "Expecting VegaPal to produce a pitch deck. It produces commercial documents. Case studies and team bios belong in a separate file if your sales process needs them.",
          "Burying the price in prose. A figure inside a paragraph is hard to approve and easy to dispute; a line item with a quantity and a unit price is neither.",
          "Presenting options as alternative documents. Two quotations for the same job invites comparison shopping against yourself. Use optional line items in one document instead.",
          "Treating the proposal as the record of scope and then billing from memory. Convert the accepted quotation so the invoice inherits the same items.",
        ],
      },
    ],
    useCases: [
      {
        title: "Freelancers pitching a project",
        body: "Send a phased, priced quotation instead of a paragraph in an email thread.",
      },
      {
        title: "Agencies presenting options",
        body: "Offer good, better and best as separate line items and let the client choose.",
      },
      {
        title: "Consultants scoping a retainer",
        body: "Price the monthly engagement, set the validity, and convert to invoices as it runs.",
      },
    ],
    steps: [
      {
        title: "Start a quotation",
        body: "This is the document that carries your priced offer, its number and its expiry date.",
      },
      {
        title: "Itemise the engagement",
        body: "One line per phase or deliverable, so the client can see and adjust the shape of the work.",
      },
      {
        title: "Write scope into the terms",
        body: "Assumptions, exclusions, timeline and payment schedule go here, in plain language.",
      },
      {
        title: "Convert once accepted",
        body: "Turn the approved quotation into an invoice, or a proforma invoice if you need a deposit first.",
      },
    ],
    faqs: [
      {
        question: "Does VegaPal have a proposal document type?",
        answer:
          "No. The document types are quotation, proforma invoice and tax invoice. Proposals are handled as quotations, which cover the priced, itemised offer your client approves.",
      },
      {
        question: "Can I add a long narrative or case studies?",
        answer:
          "The notes and terms fields take substantial text, but this is a commercial document rather than a design tool. Keep the storytelling in a separate file if your process needs it.",
      },
      {
        question: "How do I show optional extras?",
        answer:
          "List them as separate line items and describe in the terms which are optional, so the client can accept a subset.",
      },
      {
        question: "What happens when the client says yes?",
        answer:
          "Convert the quotation into a tax invoice, or issue a proforma invoice first if you are taking a deposit before starting.",
      },
    ],
    relatedSlugs: [
      "quotation-generator",
      "quotation-template",
      "consulting-invoice",
      "proforma-invoice",
      "payment-request",
      "invoice-generator",
    ],
  },

  "payment-request": {
    slug: "payment-request",
    path: "/payment-request",
    title: "Payment Request — Send an Invoice with a Shareable Payment Page | VegaPal",
    description:
      "Request payment with a numbered invoice and a public payment page showing your bank or crypto details. VegaPal presents the instructions; the money goes straight to you.",
    h1: "Request payment with an invoice and a shareable payment page",
    eyebrow: "Payment requests",
    intro:
      "A payment request in VegaPal is a real invoice plus a public page your client can open on any device. The page shows the amount, the due date and exactly how to pay — bank fields, wallet address with its network, or both — so a request stops being a message and becomes a document.",
    intent: "transactional",
    primaryCtaLabel: "Create a payment request",
    secondaryCtaLabel: "How the payment page works",
    secondaryHref: "#payment-page",
    documentTypeHint: "tax_invoice",
    hubs: ["documents"],
    sections: [
      {
        id: "payment-page",
        heading: "What the payment page shows",
        body: [
          "Who is requesting payment, the amount and currency, the due date, the itemised reason for the charge, and the payment instructions. Crypto methods get a QR code and a copy button; bank transfers get the account name, number, IBAN and SWIFT laid out for manual entry.",
          "The page needs no login, so it can be forwarded to whoever actually releases funds. When you mark the invoice paid, the page reflects that too.",
        ],
      },
      {
        id: "not-a-processor",
        heading: "Honest about what happens to the money",
        body: [
          "VegaPal does not take the payment. There is no checkout, no card form, no escrow and no wallet held on your behalf. The page publishes your instructions and the client pays you directly.",
          "That is why there is no percentage taken from what you receive, and why confirming payment is a step you do rather than something the software claims to know.",
        ],
      },
      {
        id: "chasing-politely",
        heading: "Chasing without being awkward",
        body: [
          "A numbered document with a due date changes the tone of a follow-up. You are referencing an invoice rather than asking for a favour, and the link shows the amount is unchanged.",
          "Your dashboard lists what is outstanding, which makes a weekly pass through unpaid items a five-minute job.",
        ],
      },
      {
        id: "before-or-after",
        heading: "Requesting before or after delivery",
        body: [
          "If the work is done, a tax invoice is the right document. If you need payment before starting, issue a proforma invoice — same payment page, correct paperwork for money taken in advance.",
          "For work not yet agreed, send a quotation first and request payment once it is accepted.",
        ],
      },
      {
        id: "worked-example",
        heading: "A one-off request (fictional)",
        body: [
          "Pell Translation is owed 640.00 EUR for an urgent overnight job with no prior paperwork. Rather than sending bank details in a message, they issue tax invoice INV-2026-0091 with one line — 'Certified translation, 8 pages, overnight — 1 × 80.00' — dated 6 July, due 13 July.",
          "The payment page shows Pell as the payee, 640.00 EUR due by 13 July, the itemised reason, and a bank block with account holder, IBAN, SWIFT and a note asking for INV-2026-0091 as the reference. The client's finance team opens the link without a login, releases the payment, and Pell marks the invoice paid once the credit clears.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes with payment requests",
        body: [
          "Describing it as a payment link. This is not a checkout: there is no card form and no processor. Calling it one sets an expectation the page will not meet.",
          "Requesting money before delivery on a tax invoice. Advance payments belong on a proforma invoice, otherwise your paperwork records a sale that has not happened.",
          "Sending the request without an itemised reason. 'Amount due 640.00' with no explanation gets queried; a line item does not.",
          "Chasing without referencing the document. A follow-up that names an invoice number and a due date reads as process; one that does not reads as a favour being asked.",
        ],
      },
    ],
    useCases: [
      {
        title: "One-off charges",
        body: "Send a single numbered request with a due date instead of a bank screenshot in a chat.",
      },
      {
        title: "Deposits before starting",
        body: "Use a proforma invoice so the advance payment is documented correctly.",
      },
      {
        title: "Clients who pay in different ways",
        body: "Show bank and crypto details on one page and let the client pick a rail.",
      },
    ],
    steps: [
      {
        title: "Create the invoice",
        body: "Pick tax invoice for completed work or proforma invoice for an advance, and itemise the charge.",
      },
      {
        title: "Add your payment details",
        body: "Attach the bank account, wallet or cash instructions you want shown, or several together.",
      },
      {
        title: "Share the link",
        body: "Send the public payment page by email or messaging app, and the PDF where a file is required.",
      },
      {
        title: "Confirm receipt",
        body: "Check your bank or wallet, then mark the invoice paid so both sides can see the status.",
      },
    ],
    faqs: [
      {
        question: "Is this a payment link that takes card payments?",
        answer:
          "No. It is a page that displays your bank and crypto payment instructions. VegaPal does not process payments or hold funds at any point.",
      },
      {
        question: "Does my client need an account to see it?",
        answer:
          "No. The payment page is public and read-only, so it can be opened or forwarded by anyone with the link.",
      },
      {
        question: "How does the client know the payment arrived?",
        answer:
          "You confirm it in your own bank or wallet and mark the invoice paid. The status then shows on the shared page.",
      },
      {
        question: "Can I request payment in a stablecoin?",
        answer:
          "Yes. Set the currency to USDT or USDC and attach the wallet with the network you receive on.",
      },
    ],
    relatedSlugs: [
      "crypto-payment-request",
      "usdt-payment-request",
      "invoice-generator",
      "bank-transfer-invoice",
      "proforma-invoice",
      "quotation-generator",
    ],
  },

  "invoice-template": {
    slug: "invoice-template",
    path: "/invoice-template",
    title: "Invoice Template — What to Include, Field by Field | VegaPal",
    description:
      "The fields a compliant invoice needs, the wording that avoids disputes, and why generating invoices beats maintaining a template file. Create yours with VegaPal.",
    h1: "Invoice template: the fields that matter and why",
    eyebrow: "Invoice template",
    intro:
      "Most invoice problems are template problems: a missing number, no due date, or payment details buried in a footer. This is the field list a clean invoice needs, what to write in each one, and how to stop maintaining the file by hand.",
    intent: "informational",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "Field checklist",
    secondaryHref: "#field-checklist",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "field-checklist",
        heading: "The field checklist",
        body: [
          "Your business name, address and tax or trade licence number. The client's legal name and address. A unique invoice number, the issue date and the due date. Line items with description, quantity, unit price and line total. Subtotal, discount, tax and the amount due, with the currency stated.",
          "Then the payment block: how to pay, with enough detail to complete the transfer without asking you a question. That is where most templates are thinnest and where most delays start.",
        ],
      },
      {
        id: "wording",
        heading: "Wording that prevents disputes",
        body: [
          "Describe what was delivered, not the category of work: 'April social media management, 12 posts' beats 'marketing services'. A description a client recognises is a description they approve quickly.",
          "Write payment terms explicitly — due on receipt, or within 14 days — and say what the amount due includes. Assumptions cost more time than sentences.",
        ],
      },
      {
        id: "numbering",
        heading: "Numbering and record-keeping",
        body: [
          "Invoice numbers should be unique and sequential, with no gaps you cannot explain. Manual templates break this the first time two invoices go out on the same day.",
          "Keeping every issued document in one place also means you can answer 'what did we bill in March' without opening a folder of near-identical files.",
        ],
      },
      {
        id: "worked-example",
        heading: "The checklist filled in (fictional)",
        body: [
          "From: Kiln & Ash Ceramics, Warehouse 12 Al Serkal, TRN 100xxxxxxxxxx77. To: Verdant Hotels FZ-LLC, JLT. Invoice INV-2026-0164. Issued 18 August. Due 1 September. PO reference VH-4471.",
          "Items: 'Stoneware dinner plate, 27cm — 120 × 34.00 = 4,080.00' and 'Delivery, Dubai — 1 × 150.00 = 150.00'. Subtotal 4,230.00. Discount 5% (211.50). Tax 5% (200.93). Amount due 4,219.43 AED. Payment: bank transfer, account holder Kiln & Ash Ceramics, IBAN and SWIFT shown in full, reference INV-2026-0164. Terms: payment within 14 days of the invoice date. That is every field in the checklist above, in the order a finance team reads them.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Template mistakes that delay payment",
        body: [
          "Omitting the client's legal entity name in favour of a contact's name. Accounts payable cannot match an invoice to a supplier record that way.",
          "Showing a tax-inclusive total with no tax line. Registered buyers need the tax split out to reclaim it, and a missing line means the invoice comes back.",
          "Leaving the PO or reference field off when the client's system requires one. This is a silent blocker: the invoice is never rejected, it just never gets scheduled.",
          "Hiding payment details in a footer in six-point type. If it is hard to read on a phone, it is hard to pay.",
        ],
      },
      {
        id: "generated-vs-file",
        heading: "Generated documents beat template files",
        body: [
          "A generated invoice calculates its own totals, takes the next number automatically, applies your saved business details and produces both a PDF and a shareable payment page from the same data.",
          "You still control the layout options — whether to show tax, discounts, notes, terms, PO or reference numbers — so it fits how your clients expect to be billed.",
        ],
      },
    ],
    useCases: [
      {
        title: "Moving off a spreadsheet",
        body: "Keep the fields you rely on and lose the manual numbering and broken sum formulas.",
      },
      {
        title: "Getting invoices approved faster",
        body: "Give a finance team every field it checks for, so nothing bounces back for a correction.",
      },
      {
        title: "Standardising a small team",
        body: "One layout, one numbering series, one set of saved payment details for everyone.",
      },
    ],
    steps: [
      {
        title: "Save your business details",
        body: "Logo, address, tax number and default currency are entered once and reused.",
      },
      {
        title: "Choose which fields to show",
        body: "Turn on tax, discount, notes, terms, PO or reference numbers to match your clients' expectations.",
      },
      {
        title: "Add items and dates",
        body: "Describe what was delivered, set the issue and due dates, and check the totals.",
      },
      {
        title: "Issue and share",
        body: "Download the PDF or send the payment page link, then track the status.",
      },
    ],
    faqs: [
      {
        question: "Do you provide a downloadable invoice template?",
        answer:
          "VegaPal generates finished invoices rather than blank files. The generated document handles numbering, totals and payment instructions that a static template cannot.",
      },
      {
        question: "What makes an invoice a tax invoice?",
        answer:
          "Usually your tax registration number, the tax amount shown separately, and the specific wording your jurisdiction requires. Check the local rules that apply to your registration.",
      },
      {
        question: "Can I hide fields I do not use?",
        answer:
          "Yes. Tax, discount, notes, terms, reference and project fields can each be shown or hidden per document.",
      },
      {
        question: "How should I number invoices?",
        answer:
          "Sequentially, with no gaps. VegaPal assigns the next number in the series for each document type so you do not have to track it.",
      },
    ],
    relatedSlugs: [
      "invoice-generator",
      "quotation-template",
      "small-business-invoice",
      "freelance-invoice",
      "bank-transfer-invoice",
      "multi-currency-invoice",
    ],
  },

  "multi-currency-invoice": {
    slug: "multi-currency-invoice",
    path: "/multi-currency-invoice",
    title: "Multi-Currency Invoicing — Bill in USD, AED, EUR or USDT | VegaPal",
    description:
      "Invoice each client in the currency they pay in, from USD and AED to EUR, SAR, CNY, RUB, INR and stablecoins, with matching payment instructions on every document.",
    h1: "Invoice each client in the currency they actually pay in",
    eyebrow: "Multi-currency invoicing",
    intro:
      "Asking a client to convert before paying you adds friction and gives them a reason to delay. VegaPal lets each document carry its own currency — USD, AED, EUR, SAR, CNY, RUB, INR, or USDT, USDC, BTC and ETH — with payment instructions that match.",
    intent: "hybrid",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "Currencies available",
    secondaryHref: "#currencies",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "currencies",
        heading: "Currencies you can invoice in",
        body: [
          "Fiat options cover the US dollar, UAE dirham, euro, Saudi riyal, Chinese yuan, Russian ruble and Indian rupee. Crypto options cover USDT, USDC, BTC and ETH, each with the network attached to the wallet you receive on.",
          "Currency is set per document, not per account, so one client can be billed in AED and the next in USDT without changing any global setting.",
        ],
      },
      {
        id: "matching-payment-rails",
        heading: "Match the currency to the payment rail",
        body: [
          "There is no point invoicing in euros if the only account on the document takes dirhams. Attach the bank account that can actually receive the invoiced currency, and name the currency in the bank details so the client's bank does not guess.",
          "For stablecoin invoices the equivalent step is the network. USDT on the wrong chain is a support ticket, not a payment.",
        ],
      },
      {
        id: "rates-and-books",
        heading: "Rates, records and your own books",
        body: [
          "VegaPal does not convert money or lock in an exchange rate — the invoice is denominated in the currency you chose. For accounting, record the value in your reporting currency using the rate on the date the payment lands.",
          "If a client wants a reference figure in their own currency, add it as a note on the invoice and make clear which amount is payable.",
        ],
      },
      {
        id: "regional-practice",
        heading: "Practical notes for cross-border billing",
        body: [
          "Businesses invoicing from Dubai often quote in AED for local clients, USD for regional ones and USDT where transfers are slow — three currencies, one workflow, no separate templates.",
          "Whatever mix you use, keep numbering in a single series per document type. Currency is a field on the invoice, not a reason to start a new set of books.",
        ],
      },
      {
        id: "worked-example",
        heading: "Three clients, three currencies (fictional)",
        body: [
          "Solstice Media issues three invoices in the same week. INV-2026-0301 bills a Dubai retailer 18,900.00 AED with the AED bank account attached. INV-2026-0302 bills a Riyadh agency 4,200.00 USD with the USD account attached and a note that intermediary charges are for the sender. INV-2026-0303 bills a remote client 2,750.00 USDT with the TRON (TRC20) wallet attached.",
          "The numbering runs in one unbroken tax invoice series regardless of currency. When each payment lands, Solstice records the AED value on the settlement date in its own books — VegaPal does not convert anything, so the reporting figure is theirs to enter.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Multi-currency mistakes",
        body: [
          "Invoicing in a currency the attached account cannot receive. The client tries, the bank converts at a rate nobody agreed, and the shortfall becomes your problem.",
          "Showing two payable amounts on one document. Two figures means two interpretations; keep one payable amount and add any reference figure as a note.",
          "Starting a separate numbering series per currency. Currency is a field, not a set of books, and split series are hard to reconcile at year end.",
          "Recording revenue at the invoice-date rate on a currency that moved before settlement. Use the rate on the day the funds arrived.",
        ],
      },
    ],
    useCases: [
      {
        title: "Regional businesses with mixed clients",
        body: "Bill locally in AED and internationally in USD without maintaining two systems.",
      },
      {
        title: "Exporters and importers",
        body: "Issue in the currency of the contract and attach the account that can receive it.",
      },
      {
        title: "Teams paid in stablecoins",
        body: "Invoice in USDT where bank transfers are slow, and in fiat where they are not.",
      },
    ],
    steps: [
      {
        title: "Set a default currency",
        body: "Choose the one you use most so new documents start in the right place.",
      },
      {
        title: "Override per invoice",
        body: "Pick the currency this particular client pays in when you create the document.",
      },
      {
        title: "Attach a matching account",
        body: "Select the bank account or wallet that can receive that currency, and label it clearly.",
      },
      {
        title: "Record the settled value",
        body: "When payment arrives, note the value in your reporting currency for your own books.",
      },
    ],
    faqs: [
      {
        question: "Does VegaPal convert currencies?",
        answer:
          "No. Each invoice is denominated in the currency you select and the payment arrives in that currency. Conversion, if any, happens at your bank or exchange.",
      },
      {
        question: "Can one invoice show two currencies?",
        answer:
          "One payable amount in one currency keeps things unambiguous. If a client needs an indicative figure in another currency, add it as a note.",
      },
      {
        question: "Which currency should I use for a new client?",
        answer:
          "The one they hold, if you can receive it. Reducing their conversion work is one of the cheapest ways to get paid faster.",
      },
      {
        question: "Do crypto and fiat invoices work the same way?",
        answer:
          "Yes, apart from the payment block. Crypto documents carry the asset, network and address; fiat documents carry the bank fields.",
      },
    ],
    relatedSlugs: [
      "international-invoice",
      "bank-transfer-invoice",
      "usdt-invoice",
      "invoice-generator",
      "invoice-template",
    ],
  },

  "bank-transfer-invoice": {
    slug: "bank-transfer-invoice",
    path: "/bank-transfer-invoice",
    title: "Bank Transfer Invoice — Put Complete Payment Details on Every Bill | VegaPal",
    description:
      "Create invoices with account name, number, IBAN, SWIFT and reference so transfers arrive without follow-up questions. Add crypto details alongside if the client prefers.",
    h1: "Bank transfer invoices with details a client can actually use",
    eyebrow: "Bank transfer invoices",
    intro:
      "Transfers get delayed for boring reasons: a missing IBAN, no SWIFT code, an account name that does not match the beneficiary. Putting the full set of fields on the invoice, every time, removes most of the back-and-forth before it starts.",
    intent: "transactional",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "Fields to include",
    secondaryHref: "#fields-to-include",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "fields-to-include",
        heading: "The bank fields to include",
        body: [
          "Bank name, account holder name exactly as the bank has it, account number, IBAN where it applies, and SWIFT or BIC for international transfers. Add the currency the account accepts, and any instruction the client needs, such as a reference to quote.",
          "VegaPal keeps these in your saved payment methods, so they print identically on every invoice instead of being retyped from memory.",
        ],
      },
      {
        id: "references",
        heading: "References and reconciliation",
        body: [
          "Ask the client to quote the invoice number as the transfer reference. Without it, a payment from a holding company you have never heard of takes an afternoon to match.",
          "Optional PO, reference and project code fields can be shown on the document when a client's accounts payable system needs them to release a payment.",
        ],
      },
      {
        id: "international",
        heading: "International transfers and what arrives",
        body: [
          "Cross-border transfers can lose value to intermediary fees. State on the invoice who bears the charges, so the amount that lands is the amount you both expected.",
          "If delays are routine on a corridor, offering a stablecoin option next to the bank details gives the client a faster route without you chasing anyone.",
        ],
      },
      {
        id: "worked-example",
        heading: "A complete bank block (fictional)",
        body: [
          "Beneficiary: Halcyon Engineering Consultants FZ-LLC. Bank: Emirates NBD, Dubai. Account number: 101xxxxxxxx09. IBAN: AE07 0331 2345 6789 0123 456. SWIFT/BIC: EBILAEAD. Account currency: AED. Reference to quote: INV-2026-0428.",
          "Underneath, one instruction line: please quote the invoice number as the transfer reference, and note that intermediary bank charges are for the sender's account. Those two sentences are the difference between a payment you can match on arrival and a credit from an unfamiliar holding company that takes an afternoon to identify.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Why transfers stall",
        body: [
          "An account holder name that does not match the beneficiary on the client's payment form. Banks reject on name mismatch more often than on anything else.",
          "IBAN present but no SWIFT/BIC on an international payment, or the reverse. Cross-border transfers usually need both.",
          "No reference instruction, so the payment arrives with no way to tie it to an invoice.",
          "Silence on who bears intermediary charges, which is how a 4,200.00 invoice becomes a 4,168.00 credit and an awkward conversation.",
        ],
      },
      {
        id: "both-methods",
        heading: "Bank and crypto on one document",
        body: [
          "Enable both methods and the invoice shows the bank block and the wallet block together, with the payment page rendering a QR code for the crypto option.",
          "Either way, funds go directly to your account or wallet. VegaPal presents the instructions and records the status you set; it never sits in the middle of the payment.",
        ],
      },
    ],
    useCases: [
      {
        title: "Suppliers billing corporate clients",
        body: "Give accounts payable every field it needs, including PO and reference numbers.",
      },
      {
        title: "Businesses with several accounts",
        body: "Save one account per currency and choose the right one per invoice.",
      },
      {
        title: "Slow corridors",
        body: "Keep the bank details as the default and add a stablecoin option for clients in a hurry.",
      },
    ],
    steps: [
      {
        title: "Save the account once",
        body: "Enter bank name, account name, number, IBAN, SWIFT and currency in payment methods.",
      },
      {
        title: "Create the invoice",
        body: "Add the client, items and dates, then enable bank transfer as the payment method.",
      },
      {
        title: "Add a reference instruction",
        body: "Ask for the invoice number as the transfer reference so matching payments is trivial.",
      },
      {
        title: "Send and reconcile",
        body: "Share the PDF or link, then mark the invoice paid when the credit shows in your account.",
      },
    ],
    faqs: [
      {
        question: "Which bank fields does VegaPal store?",
        answer:
          "Bank name, account holder name, account number, IBAN, SWIFT, the account currency and free-text instructions. All of them print on the invoice and the payment page.",
      },
      {
        question: "Can I have more than one bank account?",
        answer:
          "Yes. Save the accounts you use and select the appropriate one when creating each invoice.",
      },
      {
        question: "Is it safe to show bank details on a public payment page?",
        answer:
          "The fields shown are the same ones you would put on an emailed invoice, which is what a client needs to pay you. Share the link with the people who should have it, as you would any invoice.",
      },
      {
        question: "Can I offer crypto as well?",
        answer: "Yes. Enable both and the invoice shows bank and wallet instructions side by side.",
      },
    ],
    relatedSlugs: [
      "invoice-generator",
      "multi-currency-invoice",
      "international-invoice",
      "invoice-template",
      "payment-request",
      "crypto-invoice",
    ],
  },

  "freelance-invoice": {
    slug: "freelance-invoice",
    path: "/freelance-invoice",
    title: "Freelance Invoice — Bill Clients and Get Paid Faster | VegaPal",
    description: `Create freelance invoices with hourly or fixed line items, clear payment terms, and bank or crypto details. The free plan includes ${FREE_LIMIT} documents a month with PDFs and payment pages.`,
    h1: "Freelance invoices that get approved and paid",
    eyebrow: "Freelance invoicing",
    intro:
      "Freelance billing has two failure modes: an invoice that looks improvised, and one that leaves the client guessing how to pay. Both are fixable in about five minutes, and neither requires accounting software you will never fully use.",
    intent: "transactional",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "Getting paid faster",
    secondaryHref: "#getting-paid-faster",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "hourly-or-fixed",
        heading: "Hourly, fixed or milestone billing",
        body: [
          "For hourly work, put the rate as the unit price and the hours as the quantity — the client can check the arithmetic, which is exactly what you want. For fixed-price work, one line per deliverable reads better than a single lump sum.",
          "For milestones, invoice each one as it completes rather than saving everything for the end of the project. Smaller, more frequent invoices are approved faster and hurt less when one is late.",
        ],
      },
      {
        id: "getting-paid-faster",
        heading: "The things that actually speed up payment",
        body: [
          "A due date rather than 'on receipt'. Payment details on the document itself, not in the covering email. A description the client recognises from the work you agreed. An invoice number they can quote as a reference.",
          "Sending a link as well as a PDF helps more than it sounds: whoever approves the payment is often not the person you emailed, and a link forwards cleanly.",
        ],
      },
      {
        id: "deposits-and-new-clients",
        heading: "Deposits and first-time clients",
        body: [
          "With a new client, a deposit up front is normal and easier to ask for with a document than a message. Issue a proforma invoice for the advance, then a tax invoice when the work is delivered.",
          "If the job needs pricing first, send a quotation and convert it to an invoice once it is accepted, so the amount billed matches the amount agreed.",
        ],
      },
      {
        id: "worked-example",
        heading: "A freelance invoice in full (fictional)",
        body: [
          "From: Nadia Rahman, freelance UX writer. To: Torrent Fintech Ltd. Invoice INV-2026-0058, issued 1 October, due 15 October. Items: 'Onboarding copy audit — 6 hours × 95.00 = 570.00' and 'Rewritten onboarding flow, 14 screens — 1 × 1,250.00 = 1,250.00'. Amount due 1,820.00 USD.",
          "Terms: payment within 14 days; work is licensed to the client on receipt of payment. Payment block: bank transfer with full IBAN and SWIFT, plus a USDT (TRC20) wallet for the client's overseas entity. Nadia sends the payment page link to her day-to-day contact and the PDF to the accounts address, because the person she talks to is not the person who releases money.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Freelance billing mistakes",
        body: [
          "Waiting until the project ends to invoice anything. Milestone invoices are approved faster and a late one hurts less when it is not the whole fee.",
          "Charging an hourly rate without showing hours and rate separately. Clients check arithmetic they can see and query totals they cannot.",
          "Starting work for a new client with no deposit and no document. A proforma invoice for the advance is a normal ask and much easier to make in writing.",
          "Raising late fees for the first time after the due date has passed. If you want the term, put it in the terms field before you send.",
        ],
      },
      {
        id: "records",
        heading: "Keeping records without a bookkeeping habit",
        body: [
          "Every document stays in your account with its number, date, client and status, so year-end is a matter of reading a list rather than reconstructing one from your sent mail.",
          `The free plan covers ${FREE_LIMIT} documents a month with PDFs and payment pages, which is enough to try a full billing cycle before deciding whether to upgrade.`,
        ],
      },
    ],
    useCases: [
      {
        title: "Designers and developers",
        body: "Bill per milestone with itemised deliverables and a due date the client cannot misread.",
      },
      {
        title: "Writers and translators",
        body: "Invoice per piece or per word with the rate visible, and get paid without a rate conversation.",
      },
      {
        title: "Remote freelancers with foreign clients",
        body: "Offer a bank transfer and a stablecoin option so a slow corridor is not your problem.",
      },
    ],
    steps: [
      {
        title: "Add your details once",
        body: "Name, address, logo and any registration number, plus your default currency.",
      },
      {
        title: "Save how you get paid",
        body: "Add your bank account, your wallet with its network, or both.",
      },
      {
        title: "Invoice the work",
        body: "Enter hours or deliverables, set the due date, and check the total before issuing.",
      },
      {
        title: "Share and follow up",
        body: "Send the link or PDF, watch the unpaid list, and mark it paid when the money lands.",
      },
    ],
    faqs: [
      {
        question: "Do I need a registered company to invoice?",
        answer:
          "Requirements vary by country. Many freelancers invoice as individuals, so check what your jurisdiction expects on the document and whether you need a tax number.",
      },
      {
        question: "How many free invoices do I get?",
        answer: `${FREE_LIMIT} documents per month on the free plan, including PDF downloads and shareable payment pages. Pro and Business raise the limit.`,
      },
      {
        question: "Should I charge late fees?",
        answer:
          "You can state a late-payment term in the notes or terms field. Being explicit up front works better than raising it after the due date has passed.",
      },
      {
        question: "Can I bill a client in crypto?",
        answer:
          "Yes. Set the currency to USDT or USDC and attach the wallet with its network, or show bank and crypto details together.",
      },
    ],
    relatedSlugs: [
      "consulting-invoice",
      "contractor-invoice",
      "small-business-invoice",
      "invoice-generator",
      "invoice-template",
      "usdt-invoice-generator",
    ],
  },

  "international-invoice": {
    slug: "international-invoice",
    path: "/international-invoice",
    title: "International Invoice — Billing Clients in Another Country | VegaPal",
    description:
      "What changes when the client is abroad: entity names, tax treatment questions, transfer charges, corridor delays and the fields overseas finance teams check before they pay.",
    h1: "International invoices: what changes when the client is abroad",
    eyebrow: "International invoicing",
    intro:
      "The arithmetic on a cross-border invoice is the same as a domestic one. What changes is everything around it: which legal entity is being billed, whose tax rules apply, who absorbs the transfer charges, and how many days sit between your client pressing send and money reaching your account.",
    intent: "hybrid",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "Fields overseas clients check",
    secondaryHref: "#fields-that-matter",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "fields-that-matter",
        heading: "The fields overseas finance teams check first",
        body: [
          "Both legal entity names in full, not trading names — an overseas accounts payable system matches on the registered name and rejects anything it cannot find. Both country addresses. Your tax or trade licence number, because many buyers cannot onboard a supplier without one. A unique invoice number they can quote as a reference.",
          "Then the money: one currency, one payable amount, and a payment block complete enough to finish the transfer without asking you a question. On a domestic invoice a missing SWIFT code is an inconvenience. On an international one it is a week.",
        ],
      },
      {
        id: "charges-and-corridors",
        heading: "Transfer charges and slow corridors",
        body: [
          "Cross-border payments pass through correspondent banks, and each one can take a cut. If you invoice 5,000 USD and 4,962 arrives, you either absorb it or start an awkward conversation. Say on the invoice who bears the charges, in one sentence, before it happens.",
          "Some corridors are simply slow — the Gulf to parts of Africa and South Asia, anything routed through a compliance review. Where you know a corridor drags, offering a stablecoin option next to the bank details gives the client a faster route without you chasing anyone. That is a choice you offer, not something VegaPal arranges.",
        ],
      },
      {
        id: "tax-questions",
        heading: "Tax questions you should ask, not assume",
        body: [
          "Whether you charge tax on an export of services, whether the client accounts for it themselves under a reverse-charge mechanism, and whether your invoice needs specific wording to support either position — these are jurisdiction-specific and they change. VegaPal shows tax as a line you control; it does not decide your treatment for you.",
          "The practical step is to ask your accountant once per client country and then encode the answer in your document. If a client is entitled to a zero-rated invoice, the wording that justifies it belongs in the notes or terms field rather than in an email nobody keeps.",
        ],
      },
      {
        id: "worked-example",
        heading: "One cross-border invoice (fictional)",
        body: [
          "Marlowe Studio FZ-LLC (Dubai) bills Fenwick Retail GmbH (Hamburg) for a product photography shoot. Invoice INV-2026-0212, issued 5 May, due 4 June — 30 days, because the client's payment run is monthly. One line: 'Product photography, 60 SKUs, retouched — 1 × 7,800.00'. Amount due 7,800.00 EUR.",
          "The document carries Marlowe's trade licence number, Fenwick's registered name and Hamburg address, and Fenwick's purchase order reference FR-2026-889 because their system will not schedule an invoice without it. The payment block gives the EUR account with IBAN and SWIFT, asks for the invoice number as the reference, and states that intermediary charges are for the sender. A USDT (TRC20) option sits below it for Fenwick's Singapore entity, which pays that way.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes on cross-border invoices",
        body: [
          "Billing the group rather than the entity. 'Fenwick Retail' and 'Fenwick Retail GmbH' are not the same payer, and the wrong one means the invoice is never matched.",
          "Missing the client's PO or cost-centre reference. This blocks payment silently: nothing is rejected, the invoice simply never enters a payment run.",
          "Leaving transfer charges unstated, then absorbing the difference every quarter without noticing.",
          "Assuming your domestic tax wording travels. Ask once per country and write the answer onto the document.",
          "Offering a crypto option without naming the network, which converts a fast route into a lost payment.",
        ],
      },
    ],
    useCases: [
      {
        title: "Service exporters",
        body: "Bill an overseas client in their currency with the entity name and references their system needs.",
      },
      {
        title: "Businesses on slow corridors",
        body: "Keep the bank block as default and add a stablecoin option where transfers routinely take a week.",
      },
      {
        title: "Suppliers onboarding a foreign buyer",
        body: "Produce a document carrying licence numbers and full entity details so supplier onboarding passes first time.",
      },
    ],
    steps: [
      {
        title: "Confirm who you are billing",
        body: "Get the registered entity name, country address and any PO or supplier reference before you issue.",
      },
      {
        title: "Pick the currency and matching account",
        body: "Choose the currency the client pays in and attach an account or wallet that can actually receive it.",
      },
      {
        title: "Write the charge and tax position",
        body: "State who bears transfer charges and include whatever tax wording your accountant confirmed for that country.",
      },
      {
        title: "Send both formats and reconcile",
        body: "Link for the approver, PDF for the accounts inbox, then mark it paid when the credit clears.",
      },
    ],
    faqs: [
      {
        question: "Which currency should I invoice an overseas client in?",
        answer:
          "The one they hold, provided you have an account or wallet that can receive it. Making the client convert adds friction and gives them a reason to delay.",
      },
      {
        question: "Do I charge tax on an international invoice?",
        answer:
          "It depends on your registration, the client's country and the type of supply. VegaPal lets you show or hide tax and add supporting wording, but the treatment is a question for your accountant.",
      },
      {
        question: "Does VegaPal handle the currency conversion?",
        answer:
          "No. The invoice is denominated in the currency you choose and the payment arrives in that currency. Any conversion happens at your bank or exchange, not in VegaPal.",
      },
      {
        question: "Can I offer crypto to clients in countries with slow transfers?",
        answer:
          "Yes. Attach a wallet with its asset and network alongside the bank details. The client chooses; the funds go directly to you and you confirm receipt yourself.",
      },
    ],
    relatedSlugs: [
      "multi-currency-invoice",
      "bank-transfer-invoice",
      "usdt-invoice",
      "invoice-generator",
      "proforma-invoice",
      "small-business-invoice",
    ],
  },

  "small-business-invoice": {
    slug: "small-business-invoice",
    path: "/small-business-invoice",
    title: "Small Business Invoicing — A Billing Routine That Holds Up | VegaPal",
    description:
      "How a small business can run billing without accounting software: numbering, a weekly unpaid review, terms that get honoured, and documents an auditor can follow.",
    h1: "Small business invoicing: a routine, not a one-off document",
    eyebrow: "Small business invoicing",
    intro:
      "A freelancer can get away with issuing invoices when they remember. A business with staff, a landlord and a tax registration cannot. The difference is not better templates — it is a routine: when you issue, how you number, who chases, and what a bookkeeper can reconstruct twelve months later.",
    intent: "hybrid",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "Build the routine",
    secondaryHref: "#the-routine",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "the-routine",
        heading: "The billing routine worth copying",
        body: [
          "Issue on a fixed day rather than when you remember. A weekly or fortnightly billing slot means work is invoiced while the client still recognises it, and it stops the end-of-quarter scramble where three months of small jobs go out at once.",
          "Then a second, shorter slot for the unpaid list: who is overdue, by how many days, and who gets a follow-up naming the invoice number and the due date. Fifteen minutes a week beats an afternoon a quarter, and it changes your cash position more than any pricing decision you will make this year.",
        ],
      },
      {
        id: "numbering-and-audit",
        heading: "Numbering, series and what an auditor asks",
        body: [
          "One unbroken series per document type, no gaps you cannot explain. VegaPal assigns the next number per type, so tax invoices, proforma invoices and quotations each run their own sequence and none of them collide.",
          "The question an auditor actually asks is 'show me invoice 0147' and then 'why is there no 0148'. If your answer involves searching a shared drive and a WhatsApp thread, the routine is the problem rather than the paperwork.",
        ],
      },
      {
        id: "more-than-one-person",
        heading: "When more than one person bills",
        body: [
          "The moment two people issue documents, three things must be shared: the numbering, the client records and the payment details. Otherwise you get two invoices numbered 0092 and a client paying into an account you closed last year.",
          "Keeping business details, saved bank accounts and wallets in one account means a new colleague issues a document that looks and behaves like everyone else's. Paid plans add seats when you get to that point; the free plan is a single user.",
        ],
      },
      {
        id: "worked-example",
        heading: "A billing week (fictional)",
        body: [
          "Cedarline Facilities Management bills 14 clients monthly. Every Tuesday morning one person issues the documents due that week: recurring service invoices are duplicated from the previous month with the period updated in the line description, and ad-hoc call-outs are added as separate invoices while the job sheets are still fresh.",
          "The same person then opens the unpaid list. Two invoices are 9 days past due, so both clients get a short message quoting the invoice number, the amount and the original due date. One client asks for a copy; the payment page link is forwarded in seconds because it does not need a login. Total time: under forty minutes, every week, with no month-end panic.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common small business billing mistakes",
        body: [
          "Invoicing in batches when you remember. Late invoices are queried more often, because the client no longer remembers the work.",
          "Terms nobody enforces. 14-day terms with no follow-up until day 60 are 60-day terms, and your suppliers are not that patient with you.",
          "Personal payment details on a business invoice. It creates reconciliation problems and reads as less established than you are.",
          "Discounting to close a slow payer. A discount is permanent; a payment-terms conversation is not.",
          `Outgrowing the free plan without noticing. If you are issuing more than ${FREE_LIMIT} documents a month, the limit will interrupt you at exactly the wrong moment.`,
        ],
      },
    ],
    useCases: [
      {
        title: "Service businesses with recurring clients",
        body: "Duplicate last month's invoice, update the period, and keep the numbering continuous.",
      },
      {
        title: "Trades and facilities teams",
        body: "Invoice call-outs while the job sheet is fresh instead of reconstructing the month later.",
      },
      {
        title: "Businesses with a tax registration",
        body: "Show tax as its own line with your registration number on every document you issue.",
      },
    ],
    steps: [
      {
        title: "Set the business record once",
        body: "Logo, registered name, address, tax or trade licence number and default currency.",
      },
      {
        title: "Save clients and payment details",
        body: "Add the clients you bill repeatedly and the accounts or wallets you receive into.",
      },
      {
        title: "Pick a billing day",
        body: "Issue on a fixed slot each week or fortnight so nothing waits for a reminder.",
      },
      {
        title: "Review the unpaid list",
        body: "Work the overdue items with a short message quoting the invoice number and due date.",
      },
    ],
    faqs: [
      {
        question: "Do I need accounting software to invoice properly?",
        answer:
          "Not to issue correct documents. VegaPal handles numbering, totals, tax lines, PDFs and payment pages. What it is not is a general ledger, so most businesses still hand documents to a bookkeeper or accounting package.",
      },
      {
        question: "How many documents does the free plan cover?",
        answer: `${FREE_LIMIT} per month across all document types, including PDFs and shareable payment pages. Paid plans raise the limit and add seats.`,
      },
      {
        question: "Can two people in my business issue invoices?",
        answer:
          "Paid plans add team seats so numbering, clients and saved payment details stay in one account rather than on separate laptops.",
      },
      {
        question: "Should I show tax on every invoice?",
        answer:
          "If you are registered, show it as a separate line with your registration number so a registered buyer can reclaim it. Tax can be hidden per document when it does not apply.",
      },
    ],
    relatedSlugs: [
      "invoice-generator",
      "invoice-template",
      "consulting-invoice",
      "contractor-invoice",
      "bank-transfer-invoice",
      "proforma-invoice-generator",
    ],
  },

  "consulting-invoice": {
    slug: "consulting-invoice",
    path: "/consulting-invoice",
    title: "Consulting Invoice — Billing Advice, Retainers and Day Rates | VegaPal",
    description:
      "How to invoice consulting work: day rates versus retainers versus fixed scope, describing advisory output on a line item, and terms that survive a slow approval chain.",
    h1: "Consulting invoices: billing advice that has no deliverable",
    eyebrow: "Consulting invoices",
    intro:
      "Consulting has a specific billing problem: often the deliverable is a conversation. There is no file to point at, the value was in a decision the client made, and the person approving the invoice may not have been in the room. That shapes how the line items should read and how the terms should be written.",
    intent: "hybrid",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "Describing advisory work",
    secondaryHref: "#describing-the-work",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "describing-the-work",
        heading: "Describing advisory work on a line item",
        body: [
          "Name the engagement, the period and the form the work took. 'Strategy advisory' is a category and gets queried. 'Q3 pricing review — 3 workshops, model and recommendation memo' is a description an approver who was not present can still recognise and sign off.",
          "Where an output exists, name it, even if it is short. A one-page memo is easier to reference than four hours of discussion, and it gives the client something to file against the invoice number.",
        ],
      },
      {
        id: "rate-structures",
        heading: "Day rate, retainer or fixed scope",
        body: [
          "A day rate belongs on the invoice as unit price and quantity — rate 1,800.00, quantity 4 days — so the arithmetic is visible. Consultants who hide the day count behind a total invite exactly the scrutiny they were trying to avoid.",
          "A retainer works better as one line naming the period and what it entitles the client to: 'October advisory retainer — up to 6 hours, priority response'. If you exceed the retainer, bill the overage as a second line rather than quietly inflating the first.",
          "Fixed scope is the simplest to invoice and the hardest to price. Where you use it, keep the quotation that defined the scope, and convert that quotation into the invoice so the billed figure is visibly the agreed figure.",
        ],
      },
      {
        id: "advance-and-approval",
        heading: "Advance payment and slow approval chains",
        body: [
          "Consulting is often invoiced to organisations where the buyer and the payer are different people. Build for that: put payment instructions on the document, use a share link that forwards without a login, and give a calendar due date rather than 'on receipt'.",
          "For a new client, or an engagement that starts before any invoice would normally be due, a proforma invoice for the first month or the mobilisation fee is the honest document. It requests payment in advance and is not the tax invoice, which follows once the work is delivered.",
        ],
      },
      {
        id: "worked-example",
        heading: "A retainer month invoiced (fictional)",
        body: [
          "Ashgrove Advisory bills a manufacturing client for October. Invoice INV-2026-0173, issued 1 November, due 30 November because the client's payable terms are 30 days. Two lines: 'October advisory retainer — up to 8 hours, includes monthly board note — 1 × 4,000.00' and 'Additional hours beyond retainer — 3 × 250.00 = 750.00'.",
          "Amount due 4,750.00 USD. The notes field lists the dates of the sessions held and names the board note delivered on 28 October, so the finance controller — who attended none of it — has something to match. Terms restate the retainer scope and the overage rate that produced the second line. Ashgrove sends the link to their sponsor and the PDF to the accounts inbox.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common consulting invoice mistakes",
        body: [
          "One line reading 'Consulting services' with a large number next to it. This is the most-queried line item in professional services, and the query always arrives at the end of the payment cycle.",
          "Hiding the day count. If the client is paying a day rate, show the rate and the days; the total alone looks arbitrary.",
          "Billing overage inside the retainer line. Two different things at two different rates need two lines, or the retainer price appears to have changed.",
          "Starting a new engagement with no deposit and no quotation. Use a quotation to fix scope and a proforma invoice for the advance.",
          "Assuming the person you work with can pay you. Address the document to the entity, include any PO reference, and send it where invoices actually get processed.",
        ],
      },
    ],
    useCases: [
      {
        title: "Independent advisers on day rates",
        body: "Show rate and days as unit price and quantity so the arithmetic answers the question before it is asked.",
      },
      {
        title: "Monthly retainers",
        body: "Bill the retainer as one line and any overage as a second, with the scope restated in the terms.",
      },
      {
        title: "Advisers billing corporate finance teams",
        body: "Carry PO references and entity details so the invoice enters the payment run first time.",
      },
    ],
    steps: [
      {
        title: "Fix the scope in a quotation",
        body: "Price the engagement as an itemised quotation with a validity period before work begins.",
      },
      {
        title: "Take the advance on a proforma",
        body: "Where payment is due before delivery, issue a proforma invoice for that amount.",
      },
      {
        title: "Invoice the period",
        body: "Convert or create a tax invoice naming the period, sessions and any output delivered.",
      },
      {
        title: "Send it where it gets paid",
        body: "Link to your sponsor, PDF to the accounts address, then mark it paid on receipt.",
      },
    ],
    faqs: [
      {
        question: "How do I invoice consulting work with no physical deliverable?",
        answer:
          "Describe the engagement, the period and the form the work took — sessions held, decisions supported, any memo or model produced. An approver who was not in the room needs something recognisable to sign off.",
      },
      {
        question: "Should a retainer invoice be issued before or after the month?",
        answer:
          "Both are common. Billing in advance is a proforma invoice if payment is due before the period starts; billing after delivery is a tax invoice. Pick one and keep it consistent per client.",
      },
      {
        question: "Can I convert my scoping quotation into the invoice?",
        answer:
          "Yes. Converting an accepted quotation carries the client and line items into a tax invoice, so the amount billed matches the amount agreed.",
      },
      {
        question: "Does VegaPal track my hours?",
        answer:
          "No. It is a document and payment-instruction tool, not a time tracker. You enter hours or days as quantity and your rate as unit price.",
      },
    ],
    relatedSlugs: [
      "contractor-invoice",
      "freelance-invoice",
      "quotation-generator",
      "proposal-generator",
      "small-business-invoice",
      "invoice-generator",
    ],
  },

  "contractor-invoice": {
    slug: "contractor-invoice",
    path: "/contractor-invoice",
    title: "Contractor Invoice — Progress Claims, Retention and Variations | VegaPal",
    description:
      "Invoicing as a contractor: progress claims against a schedule, variations documented separately, retention shown honestly, and payment terms tied to a certified date.",
    h1: "Contractor invoices: progress claims, variations and retention",
    eyebrow: "Contractor invoices",
    intro:
      "Contracting bills differently from consulting. Work is claimed in stages against an agreed schedule, changes arrive as variations that have to be priced separately, and a percentage of the money is often held back until the job is signed off. An invoice that ignores any of those three gets disputed.",
    intent: "hybrid",
    primaryCtaLabel: "Create an invoice",
    secondaryCtaLabel: "How progress claims work",
    secondaryHref: "#progress-claims",
    documentTypeHint: "tax_invoice",
    hubs: ["invoice"],
    sections: [
      {
        id: "progress-claims",
        heading: "Claiming in stages against a schedule",
        body: [
          "A progress claim invoices what has been completed to date rather than the whole contract. The clearest way to write it is one line per stage with the stage named, the agreed stage value, and the percentage being claimed this time — so the client can check it against the same schedule you both signed.",
          "Keep the claim number and period on the document. 'Progress claim 3, period to 31 May' means the client can file it in sequence, and it means you can answer 'what have we billed on this job' without adding up PDFs.",
        ],
      },
      {
        id: "variations",
        heading: "Variations belong on their own lines",
        body: [
          "A variation is work outside the original scope, and it should never be folded into a stage line. Give it its own line with a reference — 'Variation VO-04, additional trenching 12m, approved 14 May' — and the approved amount.",
          "Where a variation is not yet approved in writing, it is not on the invoice. Chase the approval as its own conversation, because an unapproved amount on a progress claim is the fastest way to have the entire claim held up rather than just that item.",
        ],
      },
      {
        id: "retention",
        heading: "Retention and what is actually payable now",
        body: [
          "If the contract holds back a retention percentage, show it: gross claim, less retention, equals amount payable now. Hiding retention in the arithmetic produces an invoice total that does not match what the client intends to pay, and a payment that looks short when it is correct.",
          "Retention released later is its own invoice, referencing the job and the release condition. Two documents, two payments, no ambiguity — the same principle that applies to deposits and balances.",
        ],
      },
      {
        id: "worked-example",
        heading: "A progress claim (fictional)",
        body: [
          "Ferrow Contracting issues progress claim 3 on a fit-out. Invoice INV-2026-0288, 'Progress claim 3 — period to 31 May', issued 2 June, due 2 July per the contract's 30-day terms.",
          "Lines: 'Stage 2 — MEP rough-in, stage value 60,000.00, 100% claimed to date, 40% claimed previously — 1 × 24,000.00'; 'Stage 3 — ceilings and partitions, stage value 45,000.00, 50% claimed — 1 × 22,500.00'; 'Variation VO-04, additional trenching 12m, approved 14 May — 1 × 3,200.00'. Gross claim 49,700.00, less 5% retention (2,485.00), amount payable now 47,215.00 AED. The terms note states that retention is released on practical completion and will be invoiced separately, and the payment block asks for the invoice number as the transfer reference.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common contractor invoicing mistakes",
        body: [
          "Claiming a stage as complete when it is not signed off. One optimistic percentage can freeze an entire claim while it is argued.",
          "Bundling variations into stage lines, which makes the stage value look wrong and invites a line-by-line audit of everything.",
          "Invoicing unapproved variations. Get the approval in writing first; put the reference on the line when you do.",
          "Omitting retention so the total does not match what will be paid, then treating the difference as a late payment.",
          "No claim number or period, leaving both sides unable to say what has been billed to date on the job.",
        ],
      },
    ],
    useCases: [
      {
        title: "Fit-out and build contractors",
        body: "Claim by stage against the agreed schedule with retention shown as its own deduction.",
      },
      {
        title: "Subcontractors billing a main contractor",
        body: "Number your claims and carry the job reference so your invoice matches their cost report.",
      },
      {
        title: "Trades with approved variations",
        body: "Put each variation on its own line with its approval reference and date.",
      },
    ],
    steps: [
      {
        title: "Set out the stages up front",
        body: "Use a quotation to record the schedule of stages and values before work starts.",
      },
      {
        title: "Claim what is complete",
        body: "One line per stage with the stage value and the percentage claimed this period.",
      },
      {
        title: "Add approved variations only",
        body: "Give each variation its own line, reference and approval date.",
      },
      {
        title: "Show retention and invoice it later",
        body: "Deduct retention on the claim, then issue a separate invoice on release.",
      },
    ],
    faqs: [
      {
        question: "Can VegaPal produce a progress claim?",
        answer:
          "Yes, as a tax invoice with one line per stage and the claim number and period in the document title or notes. There is no dedicated progress-claim document type; the invoice carries the structure.",
      },
      {
        question: "How should retention appear on the invoice?",
        answer:
          "As a visible deduction so the amount payable now is unambiguous. A negative or discount line keeps the gross claim, the retention and the payable figure all on the document.",
      },
      {
        question: "Should unapproved variations go on the claim?",
        answer:
          "No. An unapproved amount can hold up the whole claim. Invoice it once you have the approval reference to put on the line.",
      },
      {
        question: "Can I invoice a main contractor in a different currency?",
        answer:
          "Yes. Currency is set per document, and you attach a bank account or wallet that can receive it.",
      },
    ],
    relatedSlugs: [
      "consulting-invoice",
      "small-business-invoice",
      "quotation-generator",
      "proforma-invoice",
      "bank-transfer-invoice",
      "invoice-generator",
    ],
  },

  "trc20-invoice": {
    slug: "trc20-invoice",
    path: "/trc20-invoice",
    title: "TRC20 Invoice — Billing USDT on TRON, Done Properly | VegaPal",
    description:
      "How to invoice USDT on TRON: address format, why TRC20 is the default for stablecoin billing, the energy and fee model, and what to write so the payment lands correctly.",
    h1: "TRC20 invoices: USDT on TRON, written so it arrives",
    eyebrow: "TRC20 invoicing",
    intro:
      "TRC20 is the TRON token standard, and it is where most USDT invoicing actually happens — low fees, fast confirmation, and near-universal support on the exchanges your clients already use. It is VegaPal's default crypto network for that reason. This page covers what belongs on a TRC20 invoice and what makes one go wrong.",
    intent: "hybrid",
    primaryCtaLabel: "Create a TRC20 invoice",
    secondaryCtaLabel: "What to put on it",
    secondaryHref: "#what-to-write",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto"],
    sections: [
      {
        id: "what-to-write",
        heading: "What to write on a TRC20 invoice",
        body: [
          "Write the asset and the network as one phrase — 'USDT on TRON (TRC20)' — directly above the receiving address. Not 'USDT', not 'Tron', not 'TRC-20' in a footnote. The pair is the instruction; either half alone is incomplete.",
          "Then the amount due in USDT, and a line stating that the amount received must equal the amount due so nobody deducts the network fee from your payment. Everything else on the document is an ordinary invoice: number, dates, itemised work, totals, your business details.",
        ],
      },
      {
        id: "addresses-and-fees",
        heading: "Addresses, fees and confirmation",
        body: [
          "TRON addresses start with T and are 34 characters. They look nothing like an Ethereum address, which is the one small mercy of this ecosystem: a client pasting a TRON address into an ERC20 withdrawal usually gets stopped by their exchange.",
          "Fees on TRON are paid by the sender in TRX, or covered by staked energy, and they are typically small enough that clients do not negotiate over them. Confirmation is fast — usually under a minute — but 'fast' still means you check your own wallet. Nothing in VegaPal watches the chain or confirms a transfer for you.",
        ],
      },
      {
        id: "why-default",
        heading: "Why TRC20 is the sensible default",
        body: [
          "For an invoice denominated in USDT, the three things that matter to your client are fee, speed and whether their exchange supports the withdrawal. TRON scores well on all three, which is why it has become the default rail for stablecoin invoicing across the Gulf, South and Southeast Asia.",
          "That does not make it the only choice. A client whose treasury lives on Ethereum will want ERC20, and one paying from a BNB Smart Chain wallet will want BEP20. Save whichever wallets you can genuinely receive on, and put the matching one on each invoice rather than asking the client to adapt.",
        ],
      },
      {
        id: "worked-example",
        heading: "A TRC20 invoice in words (fictional)",
        body: [
          "Halden Systems bills a client for a security review. Tax invoice INV-2026-0146, issued 8 July, due 22 July. One line: 'Application security review and remediation report — 1 × 3,600.00'. Amount due 3,600.00 USDT.",
          "The payment block reads, in order: 'USDT on TRON (TRC20)', then the receiving address on its own line, then 'Amount received must equal 3,600.00 USDT — network fees are paid by the sender.' The public payment page shows the same three things with a QR code and a copy button. When 3,600 USDT appears in Halden's wallet, they file the transaction hash with their copy of the invoice and mark it paid.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "TRC20 mistakes worth avoiding",
        body: [
          "Writing 'USDT' and assuming TRC20. Your client may default to whatever chain their exchange puts first, which is not always TRON.",
          "Reusing a wallet you no longer control, or one belonging to an exchange account you have since closed. Confirm the address is live before it goes on a document.",
          "Accepting a payment net of fees. State the required received amount; it costs one sentence.",
          "Truncating the address for tidiness on the PDF. The whole string or nothing — a client who has to ask for the rest of it will paste something wrong.",
          "Treating a fast confirmation as a confirmation you have seen. Check your own wallet, then update the invoice.",
        ],
      },
    ],
    useCases: [
      {
        title: "Freelancers paid in stablecoins",
        body: "Bill in USDT on the network your client's exchange withdraws from by default.",
      },
      {
        title: "Regional businesses on slow banking corridors",
        body: "Offer TRC20 next to the bank block where a wire would take a week.",
      },
      {
        title: "Monthly retainers in USDT",
        body: "Duplicate last month's invoice; the saved wallet keeps the asset and network unchanged.",
      },
    ],
    steps: [
      {
        title: "Save the TRON wallet",
        body: "Add the address in payment methods with the asset USDT and the network TRON (TRC20).",
      },
      {
        title: "Set the invoice to USDT",
        body: "Create the document, itemise the work, and set the currency to USDT with a due date.",
      },
      {
        title: "Attach the wallet and state the amount",
        body: "Select the saved TRC20 wallet and note that the received amount must match the amount due.",
      },
      {
        title: "Share, then confirm yourself",
        body: "Send the payment page or PDF, check your own wallet on arrival, and mark the invoice paid.",
      },
    ],
    faqs: [
      {
        question: "What does TRC20 mean on an invoice?",
        answer:
          "TRC20 is the token standard on the TRON network. On an invoice it tells your client which chain to send the asset over, which is what decides whether the funds reach a wallet you can actually access.",
      },
      {
        question: "Is TRC20 the default network in VegaPal?",
        answer:
          "TRC20 is the default crypto network, because it is the most widely supported rail for USDT. You can save and select other assets and networks per invoice.",
      },
      {
        question: "Who pays the TRON network fee?",
        answer:
          "The sender. It is worth stating on the invoice that the amount you receive must equal the amount due, so the fee is not deducted from your payment.",
      },
      {
        question: "Does VegaPal verify that a TRC20 payment arrived?",
        answer:
          "No. VegaPal displays your address and the amount due. You check the incoming transfer in your own wallet and set the invoice status yourself.",
      },
    ],
    relatedSlugs: [
      "erc20-invoice",
      "bep20-invoice",
      "usdt-invoice",
      "usdt-invoice-generator",
      "crypto-invoice",
      "usdt-payment-request",
    ],
  },

  "erc20-invoice": {
    slug: "erc20-invoice",
    path: "/erc20-invoice",
    title: "ERC20 Invoice — Billing USDT on Ethereum | VegaPal",
    description:
      "When to invoice USDT on Ethereum rather than TRON: gas costs, treasury and audit reasons clients insist on ERC20, address format, and what belongs in the payment block.",
    h1: "ERC20 invoices: USDT on Ethereum, and when it is the right call",
    eyebrow: "ERC20 invoicing",
    intro:
      "ERC20 is the Ethereum token standard. For invoicing it is usually the more expensive option — gas is paid in ETH and can move sharply — so the honest question is not whether ERC20 is better but whether your client has a reason to insist on it. Often they do, and it is a good one.",
    intent: "hybrid",
    primaryCtaLabel: "Create an ERC20 invoice",
    secondaryCtaLabel: "When ERC20 makes sense",
    secondaryHref: "#when-erc20",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto"],
    sections: [
      {
        id: "when-erc20",
        heading: "When a client will insist on ERC20",
        body: [
          "Treasuries that hold on Ethereum, funds and protocols with on-chain accounting, and anyone whose custody or multisig setup lives there. For those clients, moving funds to another chain to pay you means a bridge, an extra approval and a line in an audit trail they would rather not add.",
          "There are also clients who simply cannot withdraw on TRON from their custodian. When the constraint is on their side and it is real, the cheaper network is not the better one — an invoice they cannot pay is worth nothing.",
        ],
      },
      {
        id: "gas-and-amounts",
        heading: "Gas costs and who absorbs them",
        body: [
          "Ethereum fees are paid by the sender in ETH and vary with network conditions. That is the client's cost, not yours, but it becomes your problem if they try to net it out of the payment. The same single sentence applies: the amount received must equal the amount due.",
          "Because gas can be meaningful on smaller amounts, ERC20 tends to suit larger invoices. For a 200 USDT invoice, asking a client to pay Ethereum gas is a favour you are extracting; for a 20,000 USDT invoice nobody notices.",
        ],
      },
      {
        id: "addresses",
        heading: "Addresses, and the risk of looking alike",
        body: [
          "Ethereum addresses start with 0x and are 42 characters. The problem is that BNB Smart Chain uses the identical format, so an address that is correct on one chain looks equally correct on the other — and a payment sent to the wrong one of the two lands somewhere you may not be able to reach.",
          "This is precisely why the network must be written next to the address rather than assumed. 'USDT on Ethereum (ERC20)' and 'USDT on BNB Smart Chain (BEP20)' are visually distinguishable in a way that two 0x strings are not.",
        ],
      },
      {
        id: "worked-example",
        heading: "An ERC20 invoice in words (fictional)",
        body: [
          "Verity Audit Labs bills a protocol client 24,000 USDT for a smart contract review. Tax invoice INV-2026-0092, issued 12 September, due 26 September. Two lines: 'Contract review, 4 modules — 1 × 20,000.00' and 'Remediation re-review — 1 × 4,000.00'.",
          "The payment block reads 'USDT on Ethereum (ERC20)', the 0x address in full on its own line, and 'Amount received must equal 24,000.00 USDT — Ethereum gas is paid by the sender.' The client's treasury pays from a multisig on Ethereum, which is why ERC20 was requested in the first place. Verity checks the wallet, files the transaction hash, and marks the invoice paid.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "ERC20 mistakes worth avoiding",
        body: [
          "Putting a 0x address on an invoice without naming the chain. ERC20 and BEP20 share the format, and the network is the only thing distinguishing them.",
          "Using ERC20 for small invoices out of habit. Gas on a small amount is a real deterrent; ask whether the client actually needs Ethereum.",
          "Letting the client deduct gas from the payment. State the required received amount.",
          "Offering ERC20 when you cannot actually receive on Ethereum. Only save wallets you control on that chain.",
          "Assuming a pending transaction is a paid invoice. Wait for it in your own wallet before you change the status.",
        ],
      },
    ],
    useCases: [
      {
        title: "Suppliers to on-chain treasuries",
        body: "Invoice a client whose funds and approvals already live on Ethereum.",
      },
      {
        title: "Larger stablecoin invoices",
        body: "Use ERC20 where the amount is big enough that gas is immaterial to the payer.",
      },
      {
        title: "Clients with custody constraints",
        body: "Bill on the one network their custodian will actually let them withdraw from.",
      },
    ],
    steps: [
      {
        title: "Confirm the client's network",
        body: "Ask which chain they pay from before you issue, rather than assuming the cheapest one.",
      },
      {
        title: "Save the Ethereum wallet",
        body: "Add the 0x address with the asset and the network Ethereum (ERC20), labelled clearly.",
      },
      {
        title: "Issue in USDT",
        body: "Itemise the work, set the currency, and state that gas is paid by the sender.",
      },
      {
        title: "Confirm in your own wallet",
        body: "Check the transfer arrived in full, then mark the invoice paid.",
      },
    ],
    faqs: [
      {
        question: "Should I invoice on ERC20 or TRC20?",
        answer:
          "TRC20 is cheaper and faster and suits most invoices. Use ERC20 when the client's treasury or custodian is on Ethereum, or when they cannot withdraw on TRON. Ask before you issue.",
      },
      {
        question: "Why do ERC20 and BEP20 addresses look the same?",
        answer:
          "Both use the 0x format inherited from Ethereum. That is exactly why the network has to be written next to the address on the invoice.",
      },
      {
        question: "Who pays Ethereum gas on an ERC20 invoice?",
        answer:
          "The sender. State on the invoice that the amount received must equal the amount due so the fee is not deducted from your payment.",
      },
      {
        question: "Can one invoice offer both ERC20 and TRC20?",
        answer:
          "You can show more than one payment method, but keep it deliberate. Two crypto options with one payable amount is fine; three is usually a way to invite the wrong choice.",
      },
    ],
    relatedSlugs: [
      "trc20-invoice",
      "bep20-invoice",
      "usdt-invoice",
      "crypto-invoice",
      "crypto-invoice-generator",
      "crypto-payment-request",
    ],
  },

  "bep20-invoice": {
    slug: "bep20-invoice",
    path: "/bep20-invoice",
    title: "BEP20 Invoice — Billing USDT on BNB Smart Chain | VegaPal",
    description:
      "Invoicing USDT on BNB Smart Chain: why the 0x address format makes naming the network essential, where BEP20 sits between TRON and Ethereum, and what to put on the document.",
    h1: "BEP20 invoices: USDT on BNB Smart Chain",
    eyebrow: "BEP20 invoicing",
    intro:
      "BEP20 is the token standard on BNB Smart Chain. It sits between TRON and Ethereum on cost, and it is common among clients who keep balances on Binance and withdraw from there by default. It also carries the single most dangerous quirk in stablecoin invoicing: its addresses are indistinguishable from Ethereum's.",
    intent: "hybrid",
    primaryCtaLabel: "Create a BEP20 invoice",
    secondaryCtaLabel: "The address problem",
    secondaryHref: "#address-problem",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto"],
    sections: [
      {
        id: "address-problem",
        heading: "The 0x problem, stated plainly",
        body: [
          "BNB Smart Chain uses the same 42-character 0x address format as Ethereum. A client looking at your invoice cannot tell from the address which chain you meant, and neither can you when you come back to it in three months.",
          "The consequence is real: USDT sent on BNB Smart Chain to an address you only hold on Ethereum, or the reverse, lands at a place your wallet may not be watching. Naming the network next to the address is not a formatting preference on a BEP20 invoice — it is the only thing preventing the mistake.",
        ],
      },
      {
        id: "where-bep20-fits",
        heading: "Where BEP20 fits between the other two",
        body: [
          "Fees are low, though paid in BNB rather than TRX or ETH, so a client without a BNB balance can be stuck holding USDT they cannot move. Worth checking before you nominate it.",
          "The clients who genuinely want BEP20 are usually the ones whose funds sit on Binance and who withdraw on the chain the exchange offers first. If that is your client, invoicing BEP20 removes a step for them; if it is not, TRC20 is the better default.",
        ],
      },
      {
        id: "document-wording",
        heading: "Wording that removes the ambiguity",
        body: [
          "Write 'USDT on BNB Smart Chain (BEP20)' above the address. Spell out BNB Smart Chain rather than abbreviating to BSC, because plenty of finance staff processing the payment have never seen the abbreviation.",
          "Add the received-amount sentence as on any crypto invoice, and keep the rest of the document conventional: number, issue and due dates, itemised work, totals, business details. The network line is the only part that is special, and it is special because it is easy to get wrong.",
        ],
      },
      {
        id: "worked-example",
        heading: "A BEP20 invoice in words (fictional)",
        body: [
          "Tessellate Games bills a publisher 5,400 USDT for a porting milestone. Tax invoice INV-2026-0231, issued 3 October, due 17 October. One line: 'Console port milestone 2 — build delivery and QA pass — 1 × 5,400.00'.",
          "The payment block reads 'USDT on BNB Smart Chain (BEP20)', then the 0x address in full, then 'Amount received must equal 5,400.00 USDT — network fees (BNB) are paid by the sender.' The publisher withdraws from Binance on BEP20, which is why that network was chosen rather than TRON. Tessellate confirms arrival in its own wallet, records the transaction hash, and marks the invoice paid.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "BEP20 mistakes worth avoiding",
        body: [
          "Putting a 0x address on the document with no network named. On BEP20 this is the mistake that actually loses funds.",
          "Writing BSC instead of BNB Smart Chain. Abbreviations help people who already know; the payment is often processed by someone who does not.",
          "Nominating BEP20 for a client with no BNB for fees. They can receive USDT and still be unable to move it.",
          "Saving one wallet labelled just 'USDT 0x…' and using it for both Ethereum and BNB Smart Chain invoices. One label, one chain.",
          "Letting fees come out of the invoiced amount instead of stating the required received figure.",
        ],
      },
    ],
    useCases: [
      {
        title: "Clients paying from an exchange balance",
        body: "Invoice on the network their exchange withdraws from, so nothing has to be bridged.",
      },
      {
        title: "Mid-sized stablecoin invoices",
        body: "Keep fees low without asking a client to move funds off BNB Smart Chain.",
      },
      {
        title: "Teams holding USDT on two chains",
        body: "Label wallets per network so the picker cannot hand you the wrong 0x address.",
      },
    ],
    steps: [
      {
        title: "Ask which chain the client uses",
        body: "Confirm BNB Smart Chain before issuing, and check they hold BNB for fees.",
      },
      {
        title: "Save the wallet with its network",
        body: "Store the 0x address labelled with the asset and BNB Smart Chain (BEP20).",
      },
      {
        title: "Write the network above the address",
        body: "Spell out BNB Smart Chain (BEP20) in full on the invoice and payment page.",
      },
      {
        title: "Confirm and close",
        body: "Match the received amount in your own wallet, then mark the invoice paid.",
      },
    ],
    faqs: [
      {
        question: "Is a BEP20 address the same as an ERC20 address?",
        answer:
          "They share the same 0x format, which is why they look identical, but they are addresses on different chains. Always name the network on the invoice next to the address.",
      },
      {
        question: "Which fee token does BEP20 use?",
        answer:
          "BNB. A client with USDT but no BNB may be unable to send, so it is worth confirming before you nominate the network.",
      },
      {
        question: "Should I abbreviate BNB Smart Chain to BSC on an invoice?",
        answer:
          "Better not to. The person processing the payment may not recognise the abbreviation, and the whole point of the line is to remove ambiguity.",
      },
      {
        question: "Does VegaPal check which chain a payment arrived on?",
        answer:
          "No. VegaPal presents the address and network you saved. Verifying the incoming transfer is something you do in your own wallet.",
      },
    ],
    relatedSlugs: [
      "trc20-invoice",
      "erc20-invoice",
      "usdt-invoice",
      "crypto-invoice",
      "crypto-invoice-generator",
      "multi-currency-invoice",
    ],
  },

  "crypto-payment-request": {
    slug: "crypto-payment-request",
    path: "/crypto-payment-request",
    title: "Crypto Payment Request — A Document, Not a Wallet Address | VegaPal",
    description:
      "Request a crypto payment with a numbered invoice and a public page showing asset, network, address and QR code. VegaPal presents the instructions; funds go wallet to wallet.",
    h1: "Crypto payment requests that are documents, not messages",
    eyebrow: "Crypto payment requests",
    intro:
      "Most crypto payment requests are a wallet address pasted into a chat. That works exactly until something goes wrong — the amount is disputed, the client's finance team wants paperwork, or nobody can remember what the payment was for. In VegaPal a crypto payment request is an invoice with a public payment page, which is the same thing with a record attached.",
    intent: "transactional",
    primaryCtaLabel: "Create a payment request",
    secondaryCtaLabel: "What the client sees",
    secondaryHref: "#what-the-client-sees",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto", "documents"],
    sections: [
      {
        id: "what-the-client-sees",
        heading: "What the client actually sees",
        body: [
          "A public page, no login, that names who is requesting payment, the amount and asset due, the due date, the itemised reason for the charge, and the payment instructions: asset, network, receiving address, a copy button and a QR code.",
          "Because it is a page rather than a message, it forwards cleanly to whoever releases funds — which in most organisations is not the person you have been talking to. If they need a file instead, the PDF carries the same content line for line.",
        ],
      },
      {
        id: "honest-mapping",
        heading: "There is no separate 'payment request' document",
        body: [
          "To be direct about the product: VegaPal has three document types — quotation, proforma invoice and tax invoice. A payment request is not a fourth. What you create is a real invoice, and the shareable payment page is what makes it feel like a request.",
          "That mapping is deliberate rather than a limitation. A numbered document with dates and line items is what a finance team can process and what your own records need; a bare request is neither.",
        ],
      },
      {
        id: "not-a-processor",
        heading: "What happens to the money",
        body: [
          "Nothing passes through VegaPal. There is no checkout, no escrow, no custody, no wallet connection and no chain monitoring. The page publishes the instructions you saved and the client sends funds from their wallet to yours.",
          "That is why no percentage is taken from what you receive, and why confirming payment is a step you perform rather than something the software claims to know. You look at your wallet, then you set the status.",
        ],
      },
      {
        id: "worked-example",
        heading: "A crypto request in practice (fictional)",
        body: [
          "Pike & Vale, a small legal consultancy, is owed 1,800 USDT for a contract review with no prior paperwork. Instead of sending an address, they issue tax invoice INV-2026-0074 with one line — 'Commercial contract review, 22 pages, with markup — 1 × 1,800.00' — issued 14 August, due 21 August.",
          "The payment page shows Pike & Vale as payee, 1,800.00 USDT due by 21 August, the line item, and a payment block reading 'USDT on TRON (TRC20)' with the address, a QR code and a copy button. Their contact forwards the link to the client's finance manager, who pays it that afternoon. Pike & Vale check the wallet, mark it paid, and the shared page updates.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes with crypto requests",
        body: [
          "Sending an address with no amount, so a rounded-down payment becomes your problem to argue about.",
          "Requesting payment in advance on a tax invoice. Money before delivery belongs on a proforma invoice.",
          "Omitting the network, which is the one mistake in crypto billing that is not recoverable.",
          "Describing the page as a payment link. There is no processor behind it; calling it one sets an expectation it will not meet.",
          "Screenshotting an address into a chat. Screenshots cannot be copied, so the client retypes — and retyping addresses is how funds get lost.",
        ],
      },
    ],
    useCases: [
      {
        title: "One-off charges with no prior paperwork",
        body: "Turn an ad-hoc ask into a numbered document with a due date and a shareable page.",
      },
      {
        title: "Clients whose approver is someone else",
        body: "Send a link that forwards internally without needing anyone to sign in.",
      },
      {
        title: "Requests that need a record",
        body: "Keep the itemised reason, amount and status attached to the request rather than in a chat thread.",
      },
    ],
    steps: [
      {
        title: "Choose the right document",
        body: "Tax invoice for delivered work, proforma invoice when you are asking for payment in advance.",
      },
      {
        title: "Itemise the charge",
        body: "Say what the payment is for, set the amount and asset, and give a calendar due date.",
      },
      {
        title: "Attach the wallet",
        body: "Select the saved wallet so the asset, network and address travel together onto the page.",
      },
      {
        title: "Share and confirm",
        body: "Send the link or PDF, check your own wallet, then mark it paid so both sides agree.",
      },
    ],
    faqs: [
      {
        question: "Is this a crypto payment link with a checkout?",
        answer:
          "No. It is a public page that displays your asset, network, address, amount due and a QR code. VegaPal does not process payments, hold funds or verify transactions.",
      },
      {
        question: "Does my client need an account to pay?",
        answer:
          "No. The payment page is public and read-only, so it can be opened or forwarded by anyone holding the link.",
      },
      {
        question: "Which document type should I use for a crypto request?",
        answer:
          "A tax invoice if the work is delivered, a proforma invoice if you are requesting payment before delivery. There is no separate payment-request document type.",
      },
      {
        question: "How does the client know the payment was received?",
        answer:
          "You confirm it in your own wallet and mark the invoice paid. The status then shows on the shared page.",
      },
    ],
    relatedSlugs: [
      "usdt-payment-request",
      "payment-request",
      "crypto-invoice",
      "trc20-invoice",
      "crypto-invoice-generator",
      "proforma-invoice",
    ],
  },

  "usdt-payment-request": {
    slug: "usdt-payment-request",
    path: "/usdt-payment-request",
    title: "USDT Payment Request — Ask for Tether With a Real Document | VegaPal",
    description:
      "Request a USDT payment as a numbered invoice with a public page showing the exact amount, the network, the address and a QR code. Your wallet, your funds, your confirmation.",
    h1: "USDT payment requests with the amount and network pinned down",
    eyebrow: "USDT payment requests",
    intro:
      "Asking for USDT is easy to do badly. The two failure modes are an amount nobody agreed and a network nobody named, and both come from requesting payment in a message instead of on a document. This page is about the narrow, practical version: one stablecoin, one exact figure, one chain.",
    intent: "transactional",
    primaryCtaLabel: "Create a payment request",
    secondaryCtaLabel: "Pinning down the amount",
    secondaryHref: "#exact-amount",
    documentTypeHint: "tax_invoice",
    hubs: ["crypto", "documents"],
    sections: [
      {
        id: "exact-amount",
        heading: "Pinning down the amount",
        body: [
          "USDT tracks the dollar, so unlike a BTC or ETH request there is no rate to argue about — a 1,450 USDT request should land as 1,450 USDT. That makes the failure mode narrower and easier to close: state the figure to two decimals and state that the received amount must equal it.",
          "The only leak left is the network fee. Senders sometimes deduct it, leaving you 1,448.30 and a partial payment. One sentence on the document prevents the entire conversation.",
        ],
      },
      {
        id: "network-line",
        heading: "The network line does the heavy lifting",
        body: [
          "Write the asset and the chain together — 'USDT on TRON (TRC20)', 'USDT on Ethereum (ERC20)', 'USDT on BNB Smart Chain (BEP20)' — immediately above the address. USDT exists on all three, ERC20 and BEP20 addresses are visually identical, and the network is the only instruction distinguishing them.",
          "In VegaPal the network is attached to the saved wallet rather than typed per document, so the pair cannot drift apart between the PDF, the payment page and the QR code.",
        ],
      },
      {
        id: "boundaries",
        heading: "Where VegaPal stops",
        body: [
          "VegaPal issues the document and publishes your instructions. It does not hold USDT, convert it, connect to a wallet, watch a chain, or verify that a transfer happened. There is no fee taken from what you receive because nothing you receive passes through it.",
          "Confirmation is you: look at the wallet, match the amount and the timing, mark the invoice paid. Keeping the transaction hash beside your copy of the invoice is the crypto equivalent of a bank reference and answers most later questions before they are asked.",
        ],
      },
      {
        id: "worked-example",
        heading: "A USDT request in practice (fictional)",
        body: [
          "Orsett Freight is owed 1,450 USDT for a customs clearance fee they fronted. They issue tax invoice INV-2026-0119 with one line — 'Customs clearance disbursement, AWB 176-44821 — 1 × 1,450.00' — issued 19 November, due 26 November.",
          "The payment page reads: Orsett Freight, 1,450.00 USDT due 26 November, the line item with the airway bill number so the client can match it to their own file, then 'USDT on TRON (TRC20)', the address with a copy button and QR code, and 'Amount received must equal 1,450.00 USDT — network fees are paid by the sender.' The client pays from their exchange the same day. Orsett confirms in their wallet, files the hash, and marks it paid.",
        ],
      },
      {
        id: "common-mistakes",
        heading: "Common mistakes on USDT requests",
        body: [
          "Rounding the amount 'for convenience'. Two decimals removes any question about what was owed.",
          "Naming the asset but not the chain. USDT alone is an incomplete instruction on every network.",
          "Letting the sender net the fee. State the required received figure explicitly.",
          "Requesting in advance on a tax invoice rather than a proforma invoice, which misrecords a sale that has not happened.",
          "Pasting the address rather than selecting a saved wallet, which is how a stale or truncated string reaches a client.",
        ],
      },
    ],
    useCases: [
      {
        title: "Disbursements and pass-through costs",
        body: "Request the exact figure with a reference the client can match in their own records.",
      },
      {
        title: "Short-notice requests",
        body: "Issue a numbered document in a minute instead of sending an address and hoping.",
      },
      {
        title: "Clients settling from an exchange",
        body: "Name the network their exchange withdraws on so nothing needs bridging.",
      },
    ],
    steps: [
      {
        title: "Pick the document type",
        body: "Tax invoice for something delivered or already incurred, proforma invoice for an advance.",
      },
      {
        title: "State the exact figure",
        body: "Set the currency to USDT and enter the amount to two decimals with a due date.",
      },
      {
        title: "Attach the saved wallet",
        body: "Select the USDT wallet whose network you actually receive on, so the pair stays together.",
      },
      {
        title: "Send, then verify yourself",
        body: "Share the page or PDF, confirm the full amount in your wallet, and mark it paid.",
      },
    ],
    faqs: [
      {
        question: "How do I request an exact USDT amount?",
        answer:
          "Set the invoice currency to USDT, enter the amount to two decimals, and state on the document that the amount received must equal the amount due so network fees are not deducted.",
      },
      {
        question: "Which network should I request USDT on?",
        answer:
          "The one you can genuinely receive on, named in full next to the address. TRC20 is the most widely supported default; ERC20 and BEP20 suit clients whose funds already live there.",
      },
      {
        question: "Is a USDT payment request the same as an invoice?",
        answer:
          "Yes, in VegaPal it is. There is no separate payment-request document type — you issue a tax invoice or proforma invoice and share its public payment page.",
      },
      {
        question: "Does VegaPal hold the USDT until I confirm?",
        answer:
          "No. There is no escrow and no custody. Funds move from your client's wallet to yours, and you set the invoice status once you have seen them.",
      },
    ],
    relatedSlugs: [
      "crypto-payment-request",
      "usdt-invoice",
      "usdt-invoice-generator",
      "trc20-invoice",
      "payment-request",
      "crypto-invoice",
    ],
  },
};

export function isMarketingPageSlug(slug: string): slug is MarketingPageSlug {
  return (MARKETING_PAGE_SLUGS as readonly string[]).includes(slug);
}

export function getMarketingPage(slug: MarketingPageSlug): MarketingPage {
  return MARKETING_PAGES[slug];
}

export function listMarketingPages(): MarketingPage[] {
  return MARKETING_PAGE_SLUGS.map((slug) => MARKETING_PAGES[slug]);
}

export function getMarketingSitemapPaths(): string[] {
  return MARKETING_PAGE_SLUGS.map((slug) => MARKETING_PAGES[slug].path);
}

/**
 * Primary hub for a page, used for breadcrumbs and cluster links. Returns null
 * when the page is itself the hub pillar, so breadcrumbs do not self-reference.
 */
export function getPrimaryHubFor(page: MarketingPage): {
  label: string;
  path: `/${MarketingPageSlug}`;
} | null {
  const hubId = page.hubs[0];
  if (!hubId) return null;
  const hub = MARKETING_HUBS[hubId];
  if (hub.pillarSlug === page.slug) return null;
  return { label: hub.label, path: MARKETING_PAGES[hub.pillarSlug].path };
}

/** Sibling pages in the same hub, excluding the current page. */
export function listHubSiblings(page: MarketingPage, limit = 6): MarketingPage[] {
  const hubId = page.hubs[0];
  if (!hubId) return [];
  return MARKETING_PAGE_SLUGS.map((slug) => MARKETING_PAGES[slug])
    .filter((candidate) => candidate.slug !== page.slug && candidate.hubs.includes(hubId))
    .slice(0, limit);
}
