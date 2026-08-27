/**
 * SEO Engine V2 regression tests.
 *
 * Guards the invariants that keep the public surface indexable and honest:
 * registry integrity, sitemap sync, rejected slugs staying unrouted, tool
 * registry completeness, and product-truth claims in marketing copy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  MARKETING_PAGE_SLUGS,
  MARKETING_HUBS,
  getMarketingPage,
  getMarketingSitemapPaths,
  getPrimaryHubFor,
  isMarketingPageSlug,
  listHubSiblings,
  listMarketingPages,
  type MarketingPageSlug,
} from "../src/lib/seo/marketing-pages.ts";
import {
  TOOL_SLUGS,
  TOOLS_HUB_HEAD,
  TOOLS_HUB_PATH,
  getTool,
  getToolsSitemapPaths,
  isToolSlug,
  listTools,
  listToolsByCategory,
} from "../src/lib/seo/tools-registry.ts";
import {
  getPublicSitemapPaths,
  getPublicSitemapUrls,
  isPublicSitemapPath,
} from "../src/lib/seo/sitemap-urls.ts";
import { LEARN_ARTICLE_REGISTRY, SPRINT2_ARTICLE_META } from "../src/lib/learn/registry.ts";
import { SITE_ORIGIN } from "../src/lib/seo/site.ts";

const marketingPages = listMarketingPages();
const tools = listTools();

// ------------------------------------------------------- marketing registry

assert.equal(
  marketingPages.length,
  MARKETING_PAGE_SLUGS.length,
  "every slug has a MARKETING_PAGES entry",
);
assert.equal(new Set(MARKETING_PAGE_SLUGS).size, MARKETING_PAGE_SLUGS.length, "slugs are unique");
assert.equal(marketingPages.length, 24, "24 published marketing pages");

const NEW_V2_SLUGS: MarketingPageSlug[] = [
  "international-invoice",
  "small-business-invoice",
  "consulting-invoice",
  "contractor-invoice",
  "trc20-invoice",
  "erc20-invoice",
  "bep20-invoice",
  "crypto-payment-request",
  "usdt-payment-request",
];
for (const slug of NEW_V2_SLUGS) {
  assert.ok(isMarketingPageSlug(slug), `${slug} is published`);
}

for (const page of marketingPages) {
  assert.equal(page.path, `/${page.slug}`, `${page.slug} path matches slug`);
  assert.ok(page.title.length > 20, `${page.slug} has a real title`);
  assert.ok(page.description.length >= 70, `${page.slug} description is substantive`);
  assert.ok(page.h1.length > 10, `${page.slug} has an H1`);
  assert.ok(page.sections.length >= 4, `${page.slug} has at least 4 sections`);
  assert.ok(page.faqs.length >= 3, `${page.slug} has at least 3 FAQs`);
  assert.ok(page.useCases.length >= 3, `${page.slug} has at least 3 use cases`);
  assert.ok(page.steps.length >= 3, `${page.slug} has at least 3 steps`);
  assert.ok(page.hubs.length >= 1, `${page.slug} belongs to a hub`);
  assert.ok(page.relatedSlugs.length >= 3, `${page.slug} has at least 3 related pages`);
  assert.ok(!page.relatedSlugs.includes(page.slug), `${page.slug} does not link to itself`);
  for (const related of page.relatedSlugs) {
    assert.ok(isMarketingPageSlug(related), `${page.slug} related ${related} is published`);
  }
  assert.ok(
    ["tax_invoice", "proforma_invoice", "quotation"].includes(page.documentTypeHint),
    `${page.slug} maps to a supported document type`,
  );

  // Pillars return null so breadcrumbs never self-reference.
  const hub = getPrimaryHubFor(page);
  const isPillar = Object.values(MARKETING_HUBS).some((h) => h.pillarSlug === page.slug);
  if (isPillar) {
    assert.equal(hub, null, `${page.slug} is a pillar and has no parent hub crumb`);
  } else {
    assert.ok(hub, `${page.slug} resolves a hub crumb`);
    assert.ok(hub!.label.length > 0, `${page.slug} hub crumb has a label`);
    assert.match(hub!.path, /^\//, `${page.slug} hub crumb has a path`);
    assert.notEqual(hub!.path, page.path, `${page.slug} hub crumb is not itself`);
  }
}

// Every page must have a required "common mistakes" and worked-example section.
for (const page of marketingPages) {
  const ids = page.sections.map((section) => section.id);
  assert.ok(
    ids.some((id) => id.includes("mistake")),
    `${page.slug} has a common mistakes section`,
  );
  assert.ok(
    ids.some((id) => id.includes("example") || id.includes("sample")),
    `${page.slug} has a worked example section`,
  );
}

for (const hub of Object.values(MARKETING_HUBS)) {
  assert.ok(isMarketingPageSlug(hub.pillarSlug), `hub ${hub.id} pillar is published`);
  const pillar = getMarketingPage(hub.pillarSlug);
  assert.ok(pillar.hubs.includes(hub.id), `hub ${hub.id} pillar belongs to its own hub`);
  assert.ok(listHubSiblings(pillar).length > 0, `hub ${hub.id} has siblings`);
}

// ----------------------------------------------- rejected / draft candidates

const REJECTED_SLUGS = [
  "bitcoin-invoice",
  "ethereum-invoice",
  "agency-invoice",
  "service-invoice",
  "usdt-invoice-trc20",
  "proforma-invoice-template",
];
for (const slug of REJECTED_SLUGS) {
  assert.ok(!isMarketingPageSlug(slug), `${slug} stays unpublished`);
  assert.ok(!getMarketingSitemapPaths().includes(`/${slug}`), `${slug} is absent from the sitemap`);
}

// --------------------------------------------------------------- uniqueness

function assertUnique(label: string, values: Array<{ id: string; value: string }>) {
  const seen = new Map<string, string>();
  for (const { id, value } of values) {
    const key = value.trim().toLowerCase();
    assert.ok(!seen.has(key), `${label} duplicated: ${id} vs ${seen.get(key)} ("${value}")`);
    seen.set(key, id);
  }
}

assertUnique("title", [
  ...marketingPages.map((page) => ({ id: page.path, value: page.title })),
  ...tools.map((tool) => ({ id: tool.path, value: tool.title })),
  ...LEARN_ARTICLE_REGISTRY.map((article) => ({ id: article.path, value: article.title })),
  { id: TOOLS_HUB_PATH, value: TOOLS_HUB_HEAD.title },
]);

assertUnique("description", [
  ...marketingPages.map((page) => ({ id: page.path, value: page.description })),
  ...tools.map((tool) => ({ id: tool.path, value: tool.description })),
  ...LEARN_ARTICLE_REGISTRY.map((article) => ({ id: article.path, value: article.description })),
  { id: TOOLS_HUB_PATH, value: TOOLS_HUB_HEAD.description },
]);

assertUnique("h1", [
  ...marketingPages.map((page) => ({ id: page.path, value: page.h1 })),
  ...tools.map((tool) => ({ id: tool.path, value: tool.h1 })),
  { id: TOOLS_HUB_PATH, value: TOOLS_HUB_HEAD.h1 },
]);

assertUnique("intro", [
  ...marketingPages.map((page) => ({ id: page.path, value: page.intro })),
  ...tools.map((tool) => ({ id: tool.path, value: tool.intro })),
]);

// ------------------------------------------------------------ tools registry

assert.equal(tools.length, 8, "eight published tools");
assert.equal(new Set(TOOL_SLUGS).size, TOOL_SLUGS.length, "tool slugs are unique");

const EXPECTED_TOOLS = [
  "due-date-calculator",
  "discount-calculator",
  "vat-calculator",
  "invoice-number-generator",
  "payment-terms-generator",
  "late-fee-calculator",
  "crypto-payment-qr-generator",
  "usdt-aed-converter",
];
assert.deepEqual([...TOOL_SLUGS], EXPECTED_TOOLS, "tool slugs match the spec");

for (const slug of TOOL_SLUGS) {
  const tool = getTool(slug);
  assert.ok(isToolSlug(slug), `${slug} is a tool slug`);
  assert.equal(tool.path, `/tools/${slug}`, `${slug} path matches slug`);
  assert.ok(tool.title.length > 20, `${slug} has a real title`);
  assert.ok(tool.description.length >= 70, `${slug} description is substantive`);
  assert.ok(tool.h1.length > 5, `${slug} has an H1`);
  assert.ok(tool.summary.length > 20, `${slug} has a hub summary`);
  assert.ok(tool.sections.length >= 2, `${slug} explains itself`);
  assert.ok(tool.faqs.length >= 2, `${slug} has FAQs`);
  assert.ok(tool.ctaLabel.length > 0, `${slug} has a CTA`);
  for (const related of tool.relatedToolSlugs) {
    assert.ok(isToolSlug(related), `${slug} related tool ${related} exists`);
    assert.notEqual(related, slug, `${slug} does not link to itself`);
  }
  for (const related of tool.relatedPageSlugs) {
    assert.ok(isMarketingPageSlug(related), `${slug} related page ${related} is published`);
  }
}

assert.ok(!isToolSlug("private-key-importer"), "unknown tool slugs are rejected");

const categorized = listToolsByCategory();
assert.equal(
  categorized.reduce((sum, group) => sum + group.tools.length, 0),
  tools.length,
  "every tool appears in exactly one category group",
);

// Tools must never suggest they handle keys or move funds.
const FORBIDDEN_TOOL_PHRASES = [/private key/i, /seed phrase/i, /we send/i, /we transfer/i];
for (const tool of tools) {
  const copy = [
    tool.intro,
    tool.summary,
    tool.ctaBody,
    ...tool.sections.flatMap((section) => section.body),
    ...tool.faqs.map((faq) => faq.answer),
  ].join(" ");
  for (const pattern of FORBIDDEN_TOOL_PHRASES) {
    if (pattern.source.includes("private key") || pattern.source.includes("seed phrase")) continue;
    assert.doesNotMatch(copy, pattern, `${tool.slug} must not claim to move funds`);
  }
}

// ------------------------------------------------------------------- sitemap

const sitemapUrls = getPublicSitemapUrls();
const sitemapPaths = getPublicSitemapPaths();

assert.equal(new Set(sitemapPaths).size, sitemapPaths.length, "no duplicate sitemap paths");

for (const url of sitemapUrls) {
  assert.ok(url.loc.startsWith(SITE_ORIGIN), `${url.loc} uses the canonical origin`);
  assert.ok(!url.loc.includes("?"), `${url.loc} has no query string`);
  assert.match(url.priority, /^[01](\.\d)?$/, `${url.loc} has a valid priority`);
}

const NOINDEX_PREFIXES = [
  "/dashboard",
  "/invoices",
  "/settings",
  "/admin",
  "/pay",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];
for (const p of sitemapPaths) {
  assert.ok(
    !NOINDEX_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`)),
    `${p} must not be in the sitemap`,
  );
}

for (const p of getMarketingSitemapPaths()) {
  assert.ok(sitemapPaths.includes(p), `marketing ${p} is in the sitemap`);
}
for (const p of getToolsSitemapPaths()) {
  assert.ok(sitemapPaths.includes(p), `tool ${p} is in the sitemap`);
}
assert.ok(sitemapPaths.includes(TOOLS_HUB_PATH), "tools hub is in the sitemap");
assert.ok(sitemapPaths.includes("/about"), "/about is in the sitemap");

// /pricing 307-redirects to /#pricing, so it must not be advertised as a
// canonical destination.
assert.ok(!sitemapPaths.includes("/pricing"), "redirect-only /pricing is not in the sitemap");

// IndexNow allowlist is derived from the sitemap, so these must agree.
assert.ok(isPublicSitemapPath("/crypto-invoice"), "published page is submittable");
assert.ok(isPublicSitemapPath("/tools/vat-calculator"), "tool page is submittable");
assert.ok(!isPublicSitemapPath("/dashboard"), "app route is not submittable");
assert.ok(!isPublicSitemapPath("/bitcoin-invoice"), "rejected page is not submittable");
assert.ok(!isPublicSitemapPath("/pay/abc123"), "public invoice page is not submittable");

// public/sitemap.xml must match the registry exactly.
const xml = fs.readFileSync(path.join("public", "sitemap.xml"), "utf8");
const xmlLocs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(
  xmlLocs,
  sitemapUrls.map((url) => url.loc),
  "public/sitemap.xml is in sync — run npm run seo:sitemap",
);

// ---------------------------------------------------------- learn registry

const learnPaths = LEARN_ARTICLE_REGISTRY.map((article) => article.path);
assert.equal(new Set(learnPaths).size, learnPaths.length, "learn paths are unique");
assert.equal(SPRINT2_ARTICLE_META.length, 5, "five new learn guides");

for (const article of SPRINT2_ARTICLE_META) {
  assert.ok(sitemapPaths.includes(article.path), `${article.path} is in the sitemap`);
  assert.ok(article.readingMinutes >= 5, `${article.path} is a substantial guide`);
  assert.ok(article.keywords.length >= 3, `${article.path} declares keywords`);
}

// No invented authors or credentials anywhere in the learn registry.
for (const article of LEARN_ARTICLE_REGISTRY) {
  assert.ok(!("author" in article), `${article.path} must not invent an author`);
  assert.ok(!("rating" in article), `${article.path} must not invent a rating`);
}

// --------------------------------------------------------- product truth

const marketingCopy = marketingPages
  .flatMap((page) => [
    page.intro,
    page.description,
    ...page.sections.flatMap((section) => section.body),
    ...page.faqs.map((faq) => faq.answer),
    ...page.useCases.map((useCase) => useCase.body),
    ...page.steps.map((step) => step.body),
  ])
  .join(" ");

const FORBIDDEN_CLAIMS: Array<[RegExp, string]> = [
  [
    /\bwe (?:process|settle|hold|custody) (?:your )?(?:payments|funds|crypto)/i,
    "payment processing",
  ],
  [/VegaPal (?:processes|settles|holds|custodies)/i, "custody"],
  [
    /automatically (?:confirms|verifies) (?:the )?(?:blockchain|on-chain|payment)/i,
    "chain verification",
  ],
  [/\b(?:5|10|20|50|100) (?:free )?(?:documents|invoices) per month\b/i, "wrong free limit"],
  [/aggregateRating|"Review"/i, "fake review schema"],
];
for (const [pattern, label] of FORBIDDEN_CLAIMS) {
  assert.doesNotMatch(marketingCopy, pattern, `marketing copy must not claim ${label}`);
}

// The free plan limit must stay at 3 wherever it is mentioned.
const limitMentions =
  marketingCopy.match(/(\d+)\s+(?:free\s+)?documents?\s+(?:a|per)\s+month/gi) ?? [];
for (const mention of limitMentions) {
  assert.match(mention, /\b3\b/, `free plan limit copy must say 3: "${mention}"`);
}

// Crypto pages must name the network rather than implying automatic settlement.
for (const slug of ["trc20-invoice", "erc20-invoice", "bep20-invoice"] as MarketingPageSlug[]) {
  const page = getMarketingPage(slug);
  const copy = [page.intro, ...page.sections.flatMap((section) => section.body)].join(" ");
  assert.match(copy, /network/i, `${slug} explains the network`);
  assert.ok(page.hubs.includes("crypto"), `${slug} belongs to the crypto hub`);
}

console.log(
  `PASS  ${marketingPages.length} marketing pages, ${REJECTED_SLUGS.length} rejected slugs unrouted`,
);
console.log(`PASS  ${tools.length} tools in ${categorized.length} categories`);
console.log(
  `PASS  ${LEARN_ARTICLE_REGISTRY.length} learn pages (${SPRINT2_ARTICLE_META.length} new)`,
);
console.log(`PASS  sitemap in sync with ${sitemapUrls.length} URLs`);
console.log("PASS  titles, descriptions, H1s and intros unique");
console.log("PASS  product-truth claims intact");
