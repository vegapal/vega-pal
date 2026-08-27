import type { LearnRelatedArticle, LearnRoutePath } from "@/lib/learn/types";

export type { Sprint1ArticleConfig as LearnArticleConfig } from "@/lib/learn/sprint1/shared";
export { LearnInlineLink, LearnSection, Paragraphs } from "@/lib/learn/sprint1/shared";

/** Sprint 2 comparison and reference guides. */
export const SPRINT2_PATHS = [
  "/learn/invoice-vs-proforma-invoice",
  "/learn/quotation-vs-invoice",
  "/learn/invoice-payment-terms",
  "/learn/proforma-invoice-example",
  "/learn/trc20-vs-erc20-for-usdt-payments",
] as const satisfies readonly LearnRoutePath[];

export type Sprint2Path = (typeof SPRINT2_PATHS)[number];

const SPRINT2_TITLES: Record<Sprint2Path, string> = {
  "/learn/invoice-vs-proforma-invoice": "Invoice vs Proforma Invoice",
  "/learn/quotation-vs-invoice": "Quotation vs Invoice",
  "/learn/invoice-payment-terms": "Invoice Payment Terms",
  "/learn/proforma-invoice-example": "Proforma Invoice Example",
  "/learn/trc20-vs-erc20-for-usdt-payments": "TRC20 vs ERC20 for USDT",
};

const ANCHOR_ARTICLES: LearnRelatedArticle[] = [
  { path: "/learn/what-is-an-invoice", title: "What is an Invoice?" },
  { path: "/learn/invoice-vs-bill", title: "Invoice vs Bill" },
  { path: "/learn/invoice-generator", title: "Invoice Generator Guide" },
];

export function sprint2RelatedArticles(current: Sprint2Path): LearnRelatedArticle[] {
  const siblings = SPRINT2_PATHS.filter((path) => path !== current).map((path) => ({
    path,
    title: SPRINT2_TITLES[path],
  }));
  return [...siblings, ...ANCHOR_ARTICLES];
}
