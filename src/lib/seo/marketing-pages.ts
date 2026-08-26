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
] as const;

export type MarketingPageSlug = (typeof MARKETING_PAGE_SLUGS)[number];

export type MarketingHub = "invoice" | "crypto" | "documents";

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
      "freelance-invoice",
      "multi-currency-invoice",
      "bank-transfer-invoice",
      "crypto-invoice",
    ],
  },

  "crypto-invoice": {
    slug: "crypto-invoice",
    path: "/crypto-invoice",
    title: "Crypto Invoice: What It Is and How to Send One | VegaPal",
    description:
      "A crypto invoice is an ordinary invoice with wallet payment instructions. Learn what belongs on one, how the workflow runs from issue to confirmation, and create yours with VegaPal.",
    h1: "Crypto invoices, explained end to end",
    eyebrow: "Crypto invoicing",
    intro:
      "A crypto invoice looks like any other invoice — client details, line items, totals, due date — except the payment block carries an asset, a network and a wallet address instead of, or alongside, a bank account. Here is what belongs on one and how the workflow runs from issue to confirmation.",
    intent: "hybrid",
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
      "usdt-invoice-generator",
      "bank-transfer-invoice",
      "invoice-generator",
    ],
  },

  "crypto-invoice-generator": {
    slug: "crypto-invoice-generator",
    path: "/crypto-invoice-generator",
    title: "Crypto Invoice Generator — Wallet Details and QR Codes | VegaPal",
    description:
      "Generate crypto invoices with the asset, network and wallet address already filled in, plus a QR code on the shareable payment page. Export the PDF and track status in VegaPal.",
    h1: "Crypto invoice generator with saved wallets and QR codes",
    eyebrow: "Crypto invoice generator",
    intro:
      "Save the wallets you receive on once, then generate invoices that carry the right asset, network and address every time. The payment page renders a QR code and a copy button, so nobody is retyping a 34-character string by hand.",
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
        id: "what-it-does-not-do",
        heading: "Where the generator stops",
        body: [
          "It does not custody funds, watch the chain for you, or auto-confirm receipt. You verify the incoming transfer in your own wallet and then mark the invoice paid.",
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
      "usdt-invoice",
      "invoice-generator",
      "multi-currency-invoice",
    ],
  },

  "usdt-invoice": {
    slug: "usdt-invoice",
    path: "/usdt-invoice",
    title: "USDT Invoice — Bill Clients in Tether the Right Way | VegaPal",
    description:
      "Create a USDT invoice with the network stated clearly, the amount due in Tether, and a payment page your client can scan. VegaPal shows your wallet details; you keep the funds.",
    h1: "USDT invoices with the network stated clearly",
    eyebrow: "USDT invoicing",
    intro:
      "USDT is the asset most cross-border clients already hold, which makes it a practical way to get paid without waiting on correspondent banks. The catch is that USDT lives on several networks, and an invoice that omits the network invites an expensive mistake.",
    intent: "hybrid",
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
        id: "boundaries",
        heading: "What VegaPal does and does not do",
        body: [
          "VegaPal creates the document, publishes the payment instructions and tracks the status you set. It does not hold your USDT, convert it, or act as an escrow.",
          "The payment goes wallet to wallet. You confirm it, then mark the invoice paid so your dashboard and the shared page agree.",
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
      "crypto-invoice",
      "crypto-invoice-generator",
      "multi-currency-invoice",
      "invoice-generator",
    ],
  },

  "usdt-invoice-generator": {
    slug: "usdt-invoice-generator",
    path: "/usdt-invoice-generator",
    title: "USDT Invoice Generator — Create a Tether Invoice Online | VegaPal",
    description:
      "Fill in the client, items and USDT amount, and the generator builds the invoice PDF plus a payment page with your wallet address, network and QR code. Free plan included.",
    h1: "USDT invoice generator you can finish in one sitting",
    eyebrow: "USDT invoice generator",
    intro:
      "This is the hands-on version: open the editor, pick the client, type the work, choose USDT and the wallet you receive on, and you have a document plus a shareable payment page. No template downloads, no spreadsheet formulas to repair.",
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
      "crypto-invoice",
      "invoice-generator",
      "freelance-invoice",
    ],
  },

  "proforma-invoice": {
    slug: "proforma-invoice",
    path: "/proforma-invoice",
    title: "Proforma Invoice — What It Is and When to Send One | VegaPal",
    description:
      "A proforma invoice requests payment before delivery and is not a tax document. Learn how it differs from a quotation and a tax invoice, then issue one in VegaPal.",
    h1: "Proforma invoices: what they are for and when to use one",
    eyebrow: "Proforma invoice",
    intro:
      "A proforma invoice is a request for payment issued before the goods ship or the work starts. It states the agreed amount and how to pay, but it is not the final tax document — that comes afterwards, once the sale is complete.",
    intent: "hybrid",
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
        id: "in-vegapal",
        heading: "How it works in VegaPal",
        body: [
          "Proforma invoice is a first-class document type, not a renamed invoice. It gets its own numbering series and prints with the correct heading, alongside quotations and tax invoices.",
          "Payment instructions work the same way as on any other document: bank transfer fields, a crypto wallet with its network, cash details, or a combination shown together.",
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
      "payment-request",
      "invoice-generator",
    ],
  },

  "proforma-invoice-generator": {
    slug: "proforma-invoice-generator",
    path: "/proforma-invoice-generator",
    title: "Proforma Invoice Generator — Create and Send in Minutes | VegaPal",
    description:
      "Create a proforma invoice with its own numbering, validity period and payment instructions, then share it as a PDF or link. Convert to a tax invoice once the sale completes.",
    h1: "Proforma invoice generator with its own numbering series",
    eyebrow: "Proforma invoice generator",
    intro:
      "Choose proforma invoice as the document type and VegaPal handles the heading, the numbering series and the wording, so you are not editing an invoice template and hoping nobody notices. Payment instructions, validity and deposit terms all sit on the same page.",
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
      "invoice-generator",
      "bank-transfer-invoice",
      "crypto-invoice",
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
      "invoice-generator",
      "bank-transfer-invoice",
      "usdt-invoice",
      "invoice-template",
      "freelance-invoice",
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
      "invoice-generator",
      "invoice-template",
      "multi-currency-invoice",
      "usdt-invoice-generator",
      "payment-request",
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
