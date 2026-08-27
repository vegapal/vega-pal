/**
 * Near-duplicate detection across marketing pages, tool pages and learn guides.
 *
 * Two pages that read the same to a human read the same to a search engine, so
 * this script scores every pair on normalized token overlap (Jaccard) and fails
 * when a pair crosses the cannibalization threshold. Intent: catch
 * keyword-swapped doorway pages before they ship.
 *
 * Run: npm run seo:content-audit
 */
import { listMarketingPages } from "../src/lib/seo/marketing-pages.ts";
import { listTools, TOOLS_HUB_HEAD, TOOLS_HUB_PATH } from "../src/lib/seo/tools-registry.ts";
import { CATEGORY_ARTICLE_META, GUIDE_ARTICLE_META } from "../src/lib/learn/registry.ts";

/** Above this, two pages are treated as the same page. */
const FAIL_AT = { title: 0.72, intro: 0.62, body: 0.58 };
/** Above this, worth a human look. */
const WARN_AT = { title: 0.58, intro: 0.48, body: 0.45 };

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "how",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "up",
  "use",
  "used",
  "was",
  "were",
  "what",
  "when",
  "which",
  "who",
  "will",
  "with",
  "you",
  "your",
]);

function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

// ------------------------------------------------------------------ documents

const docs = [];

for (const page of listMarketingPages()) {
  docs.push({
    id: `/${page.slug}`,
    kind: "marketing",
    title: `${page.title} ${page.h1}`,
    intro: page.intro,
    body: [
      page.intro,
      ...page.sections.flatMap((section) => [section.heading, ...section.body]),
      ...page.useCases.flatMap((useCase) => [useCase.title, useCase.body]),
      ...page.faqs.flatMap((faq) => [faq.question, faq.answer]),
    ].join(" "),
  });
}

for (const tool of listTools()) {
  docs.push({
    id: tool.path,
    kind: "tool",
    title: `${tool.title} ${tool.h1}`,
    intro: tool.intro,
    body: [
      tool.intro,
      ...tool.sections.flatMap((section) => [section.heading, ...section.body]),
      ...tool.faqs.flatMap((faq) => [faq.question, faq.answer]),
    ].join(" "),
  });
}

// Hubs are index surfaces: their value is the links, not the prose.
docs.push({
  id: TOOLS_HUB_PATH,
  kind: "hub",
  title: `${TOOLS_HUB_HEAD.title} ${TOOLS_HUB_HEAD.h1}`,
  intro: TOOLS_HUB_HEAD.intro,
  body: `${TOOLS_HUB_HEAD.intro} ${TOOLS_HUB_HEAD.description}`,
});

for (const article of GUIDE_ARTICLE_META) {
  docs.push({
    id: article.path,
    kind: "learn",
    title: article.title,
    intro: article.description,
    body: `${article.description} ${article.keywords.join(" ")}`,
  });
}

for (const category of CATEGORY_ARTICLE_META) {
  docs.push({
    id: category.path,
    kind: "learn-category",
    title: category.title,
    intro: category.description,
    body: `${category.description} ${category.keywords.join(" ")}`,
  });
}

for (const doc of docs) {
  doc.tokens = {
    title: tokenize(doc.title),
    intro: tokenize(doc.intro),
    body: tokenize(doc.body),
  };
}

// ------------------------------------------------------------------ compare

const failures = [];
const warnings = [];

for (let i = 0; i < docs.length; i += 1) {
  for (let j = i + 1; j < docs.length; j += 1) {
    const a = docs[i];
    const b = docs[j];

    // Learn metadata and hub copy are short by design, so they are only ever
    // compared against pages of the same kind.
    const SHORT_KINDS = new Set(["learn", "learn-category", "hub"]);
    if (SHORT_KINDS.has(a.kind) || SHORT_KINDS.has(b.kind)) {
      if (a.kind !== b.kind) continue;
    }

    for (const field of ["title", "intro", "body"]) {
      // Two- or three-word titles collapse to the same token after stopword
      // removal too easily to be a useful cannibalization signal.
      if (a.tokens[field].size < 3 || b.tokens[field].size < 3) continue;

      const score = jaccard(a.tokens[field], b.tokens[field]);
      const line = `${field} similarity ${score.toFixed(2)} between ${a.id} and ${b.id}`;
      if (score >= FAIL_AT[field]) failures.push(line);
      else if (score >= WARN_AT[field]) warnings.push(line);
    }
  }
}

// ---------------------------------------------------- thin-content guardrail

const MIN_BODY_WORDS = { marketing: 550, tool: 220, hub: 0, learn: 0, "learn-category": 0 };

for (const doc of docs) {
  const words = doc.body.trim().split(/\s+/).filter(Boolean).length;
  const min = MIN_BODY_WORDS[doc.kind];
  if (min && words < min) {
    failures.push(`${doc.id} has only ${words} words of registry copy (min ${min}) — thin page`);
  }
}

// -------------------------------------------------------------------- report

console.log(`Content audit: compared ${docs.length} pages`);

for (const message of warnings) console.log(`  warn  ${message}`);
for (const message of failures) console.error(`  FAIL  ${message}`);

if (failures.length > 0) {
  console.error(`\nContent audit failed with ${failures.length} error(s).`);
  process.exit(1);
}

console.log(
  `\nContent audit passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.`,
);
