import type { LearnArticleMeta, LearnRoutePath } from "@/lib/learn/types";

export const SPRINT1_ARTICLE_META: LearnArticleMeta[] = [
  {
    path: "/learn/what-is-an-invoice",
    title: "What Is an Invoice?",
    description:
      "An invoice is a formal payment request that records what you delivered, how much is owed, and when payment is due.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 10,
    publishedAt: "2025-06-01",
    updatedAt: "2025-06-20",
    keywords: ["invoice", "billing", "payment request", "freelancer", "small business"],
    featured: true,
  },
  {
    path: "/learn/what-is-a-bill",
    title: "What Is a Bill?",
    description:
      "A bill is a document that tells someone how much they owe for goods or services. Learn how bills work in everyday business.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 10,
    publishedAt: "2025-06-05",
    updatedAt: "2025-06-20",
    keywords: ["bill", "billing", "payment", "invoice", "receipt"],
    featured: true,
  },
  {
    path: "/learn/invoice-vs-bill",
    title: "Invoice vs Bill",
    description:
      "Invoices and bills both request payment, yet businesses use the terms differently. Compare definitions, timing, and when to use each.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 11,
    publishedAt: "2025-06-10",
    updatedAt: "2025-06-20",
    keywords: ["invoice vs bill", "difference", "billing", "terminology"],
    featured: true,
  },
  {
    path: "/learn/invoice-generator",
    title: "Invoice Generator",
    description:
      "An invoice generator turns your billing details into a polished document you can send to clients. Learn how to choose one.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 10,
    publishedAt: "2025-06-15",
    updatedAt: "2025-06-20",
    keywords: ["invoice generator", "pdf", "template", "online invoice"],
    featured: true,
  },
  {
    path: "/learn/invoice-software",
    title: "Invoice Software",
    description:
      "Invoice software centralizes documents, payment status, and reporting. Compare features before you commit to a platform.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 10,
    publishedAt: "2025-06-20",
    updatedAt: "2025-06-20",
    keywords: ["invoice software", "billing software", "tracking", "accounting"],
    featured: true,
  },
];

/** Sprint 2: comparison and reference guides. */
export const SPRINT2_ARTICLE_META: LearnArticleMeta[] = [
  {
    path: "/learn/invoice-vs-proforma-invoice",
    title: "Invoice vs Proforma Invoice",
    description:
      "A proforma invoice requests payment before delivery; a tax invoice records a completed sale. Compare timing, tax treatment, numbering and the mistakes that cause disputes.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 9,
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    keywords: [
      "invoice vs proforma invoice",
      "proforma invoice",
      "tax invoice",
      "advance payment",
      "deposit",
    ],
    featured: true,
  },
  {
    path: "/learn/quotation-vs-invoice",
    title: "Quotation vs Invoice",
    description:
      "A quotation offers a price the client can decline; an invoice states an amount owed. Compare purpose, validity, wording and conversion.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 9,
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    keywords: ["quotation vs invoice", "quotation", "estimate", "validity", "conversion"],
    featured: true,
  },
  {
    path: "/learn/invoice-payment-terms",
    title: "Invoice Payment Terms",
    description:
      "What net 7, net 30, due on receipt and end-of-month mean, how to choose terms a client can meet, and how to word deposits and late fees.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 10,
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    keywords: ["payment terms", "net 30", "due date", "late fee", "deposit"],
    featured: true,
  },
  {
    path: "/learn/proforma-invoice-example",
    title: "Proforma Invoice Example",
    description:
      "A worked proforma invoice with fictional figures, field by field, plus a services variant and the errors to avoid.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 9,
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    keywords: ["proforma invoice example", "proforma invoice format", "deposit", "template"],
    featured: true,
  },
  {
    path: "/learn/trc20-vs-erc20-for-usdt-payments",
    title: "TRC20 vs ERC20 for USDT",
    description:
      "TRON and Ethereum both carry USDT, with different fees, speeds and address formats. How to choose per invoice and why the network must be on the document.",
    category: "Payments",
    categoryPath: "/learn/payments",
    readingMinutes: 10,
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    keywords: ["trc20 vs erc20", "usdt network", "tron", "ethereum", "bep20", "stablecoin"],
    featured: true,
  },
];

export const CATEGORY_ARTICLE_META: LearnArticleMeta[] = [
  {
    path: "/learn/getting-started",
    title: "Getting Started",
    description: "Set up your VegaPal account and send your first invoice in minutes.",
    category: "Getting Started",
    categoryPath: "/learn/getting-started",
    readingMinutes: 5,
    publishedAt: "2025-05-01",
    updatedAt: "2025-06-01",
    keywords: ["getting started", "account", "dashboard", "first invoice"],
  },
  {
    path: "/learn/invoice",
    title: "Invoice",
    description: "Create professional invoices, customize line items, currencies, and PDF exports.",
    category: "Invoice & Billing",
    categoryPath: "/learn/invoice",
    readingMinutes: 6,
    publishedAt: "2025-05-05",
    updatedAt: "2025-06-01",
    keywords: ["invoice", "pdf", "excel", "export", "line items"],
  },
  {
    path: "/learn/payments",
    title: "Payments",
    description: "Accept USDT, bank transfers, and shareable payment links with VegaPal.",
    category: "Payments",
    categoryPath: "/learn/payments",
    readingMinutes: 6,
    publishedAt: "2025-05-10",
    updatedAt: "2025-06-01",
    keywords: ["usdt", "crypto", "bank transfer", "payment link", "tron", "erc20"],
  },
  {
    path: "/learn/security",
    title: "Security",
    description: "How VegaPal protects your data and secures payment pages.",
    category: "Security",
    categoryPath: "/learn/security",
    readingMinutes: 5,
    publishedAt: "2025-05-12",
    updatedAt: "2025-06-01",
    keywords: ["security", "secure invoice", "data protection", "trust"],
  },
  {
    path: "/learn/business",
    title: "Business",
    description: "Best practices for freelancers and teams managing clients and crypto billing.",
    category: "Business",
    categoryPath: "/learn/business",
    readingMinutes: 6,
    publishedAt: "2025-05-15",
    updatedAt: "2025-06-01",
    keywords: ["business", "freelancer", "recurring", "subscription"],
  },
  {
    path: "/learn/faq",
    title: "FAQ",
    description: "Answers to common questions about USDT payments, invoices, and wallets.",
    category: "FAQ",
    categoryPath: "/learn/faq",
    readingMinutes: 8,
    publishedAt: "2025-05-20",
    updatedAt: "2025-06-01",
    keywords: ["faq", "help", "usdt", "iban", "tron", "erc20", "bep20"],
  },
];

export const GUIDE_ARTICLE_META: LearnArticleMeta[] = [
  ...SPRINT1_ARTICLE_META,
  ...SPRINT2_ARTICLE_META,
];

export const LEARN_ARTICLE_REGISTRY: LearnArticleMeta[] = [
  ...GUIDE_ARTICLE_META,
  ...CATEGORY_ARTICLE_META,
];

export const FEATURED_GUIDES = GUIDE_ARTICLE_META.filter((a) => a.featured);

export const LATEST_ARTICLES = [...GUIDE_ARTICLE_META].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
);

export function learnArticleByPath(path: LearnRoutePath): LearnArticleMeta | undefined {
  return LEARN_ARTICLE_REGISTRY.find((a) => a.path === path);
}

export function searchLearnArticles(query: string): LearnArticleMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return LEARN_ARTICLE_REGISTRY.filter((article) => {
    const haystack = [article.title, article.description, article.category, ...article.keywords]
      .join(" ")
      .toLowerCase();
    return (
      haystack.includes(q) ||
      q.split(/\s+/).some((word) => word.length > 1 && haystack.includes(word))
    );
  }).slice(0, 8);
}

export function sprint1NavFor(path: LearnRoutePath): {
  prev?: { path: LearnRoutePath; title: string };
  next?: { path: LearnRoutePath; title: string };
} {
  const idx = SPRINT1_ARTICLE_META.findIndex((a) => a.path === path);
  if (idx === -1) return {};
  return {
    prev:
      idx > 0
        ? { path: SPRINT1_ARTICLE_META[idx - 1].path, title: SPRINT1_ARTICLE_META[idx - 1].title }
        : undefined,
    next:
      idx < SPRINT1_ARTICLE_META.length - 1
        ? { path: SPRINT1_ARTICLE_META[idx + 1].path, title: SPRINT1_ARTICLE_META[idx + 1].title }
        : undefined,
  };
}

export function sprint2NavFor(path: LearnRoutePath): {
  prev?: { path: LearnRoutePath; title: string };
  next?: { path: LearnRoutePath; title: string };
} {
  const idx = SPRINT2_ARTICLE_META.findIndex((a) => a.path === path);
  if (idx === -1) return {};
  const prev = idx > 0 ? SPRINT2_ARTICLE_META[idx - 1] : undefined;
  const next = idx < SPRINT2_ARTICLE_META.length - 1 ? SPRINT2_ARTICLE_META[idx + 1] : undefined;
  return {
    prev: prev ? { path: prev.path, title: prev.title } : undefined,
    next: next ? { path: next.path, title: next.title } : undefined,
  };
}

export function formatLearnDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
