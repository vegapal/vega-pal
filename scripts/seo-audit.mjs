/**
 * Static SEO audit: validates the page registries against the generated sitemap.
 *
 * Checks
 *  1. Marketing, tool and learn titles / descriptions / H1s are unique.
 *  2. Titles and descriptions are within sane pixel-length bounds.
 *  3. public/sitemap.xml matches getPublicSitemapUrls() exactly.
 *  4. Every sitemap path is a registered route (marketing slug, tool, learn, static).
 *  5. relatedSlugs and related tool links point at published pages only.
 *
 * Run: npm run seo:audit
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getPublicSitemapUrls, getPublicSitemapPaths } from "../src/lib/seo/sitemap-urls.ts";
import {
  MARKETING_PAGE_SLUGS,
  MARKETING_HUBS,
  listMarketingPages,
} from "../src/lib/seo/marketing-pages.ts";
import { listTools, TOOLS_HUB_HEAD, TOOLS_HUB_PATH } from "../src/lib/seo/tools-registry.ts";
import { LEARN_ARTICLE_REGISTRY } from "../src/lib/learn/registry.ts";

/** Measured without the " | VegaPal" brand suffix, which Google may truncate anyway. */
const TITLE_MAX = 65;
const BRAND_SUFFIX = / \| VegaPal$/;
const DESCRIPTION_MIN = 55;
const DESCRIPTION_MAX = 190;

const failures = [];
const warnings = [];

const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

function assertUnique(label, entries) {
  const seen = new Map();
  for (const { id, value } of entries) {
    const key = value.trim().toLowerCase();
    const previous = seen.get(key);
    if (previous) {
      fail(`${label} duplicated between "${previous}" and "${id}": ${value}`);
      continue;
    }
    seen.set(key, id);
  }
}

// ---------------------------------------------------------------- registries

const marketingPages = listMarketingPages();

if (marketingPages.length !== MARKETING_PAGE_SLUGS.length) {
  fail(
    `MARKETING_PAGES has ${marketingPages.length} entries but MARKETING_PAGE_SLUGS has ${MARKETING_PAGE_SLUGS.length}`,
  );
}

const tools = listTools();
const learnArticles = LEARN_ARTICLE_REGISTRY;

const titleEntries = [
  ...marketingPages.map((page) => ({ id: `/${page.slug}`, value: page.title })),
  ...tools.map((tool) => ({ id: tool.path, value: tool.title })),
  ...learnArticles.map((article) => ({ id: article.path, value: article.title })),
  { id: TOOLS_HUB_PATH, value: TOOLS_HUB_HEAD.title },
];
assertUnique("Title", titleEntries);

const descriptionEntries = [
  ...marketingPages.map((page) => ({ id: `/${page.slug}`, value: page.description })),
  ...tools.map((tool) => ({ id: tool.path, value: tool.description })),
  ...learnArticles.map((article) => ({ id: article.path, value: article.description })),
  { id: TOOLS_HUB_PATH, value: TOOLS_HUB_HEAD.description },
];
assertUnique("Description", descriptionEntries);

const h1Entries = [
  ...marketingPages.map((page) => ({ id: `/${page.slug}`, value: page.h1 })),
  ...tools.map((tool) => ({ id: tool.path, value: tool.h1 })),
  { id: TOOLS_HUB_PATH, value: TOOLS_HUB_HEAD.h1 },
];
assertUnique("H1", h1Entries);

for (const { id, value } of titleEntries) {
  if (!value) {
    fail(`${id} has an empty title`);
    continue;
  }
  const core = value.replace(BRAND_SUFFIX, "");
  if (core.length > TITLE_MAX) {
    warn(`${id} title is ${core.length} chars before the brand suffix (> ${TITLE_MAX})`);
  }
}

for (const { id, value } of descriptionEntries) {
  if (!value) fail(`${id} has an empty description`);
  else if (value.length < DESCRIPTION_MIN)
    warn(`${id} description is ${value.length} chars (< ${DESCRIPTION_MIN})`);
  else if (value.length > DESCRIPTION_MAX)
    warn(`${id} description is ${value.length} chars (> ${DESCRIPTION_MAX})`);
}

// ------------------------------------------------------------ internal links

const publishedSlugs = new Set(MARKETING_PAGE_SLUGS);
const toolPaths = new Set(tools.map((tool) => tool.path));
const learnPaths = new Set(learnArticles.map((article) => article.path));

for (const page of marketingPages) {
  for (const related of page.relatedSlugs) {
    if (!publishedSlugs.has(related)) {
      fail(`/${page.slug} links to unpublished marketing slug "${related}"`);
    }
    if (related === page.slug) {
      fail(`/${page.slug} lists itself in relatedSlugs`);
    }
  }
  if (page.relatedSlugs.length < 2) {
    warn(`/${page.slug} has fewer than 2 related pages (orphan risk)`);
  }
  if (page.sections.length < 3) {
    warn(`/${page.slug} has only ${page.sections.length} content sections`);
  }
}

for (const hub of Object.values(MARKETING_HUBS)) {
  if (!publishedSlugs.has(hub.pillarSlug)) {
    fail(`Hub "${hub.label}" points at unpublished pillar "${hub.pillarSlug}"`);
  }
}

for (const tool of tools) {
  for (const related of tool.relatedToolSlugs ?? []) {
    if (!toolPaths.has(`/tools/${related}`)) {
      fail(`${tool.path} links to unknown tool "${related}"`);
    }
  }
  for (const slug of tool.relatedPageSlugs ?? []) {
    if (!publishedSlugs.has(slug)) {
      fail(`${tool.path} links to unpublished marketing slug "${slug}"`);
    }
  }
}

for (const article of learnArticles) {
  if (!learnPaths.has(article.categoryPath) && !article.categoryPath.startsWith("/learn")) {
    fail(`${article.path} has invalid categoryPath "${article.categoryPath}"`);
  }
}

// -------------------------------------------------------------------- sitemap

const expected = getPublicSitemapUrls().map((url) => url.loc);
const sitemapPath = join(process.cwd(), "public", "sitemap.xml");

let sitemapXml = "";
try {
  sitemapXml = readFileSync(sitemapPath, "utf8");
} catch {
  fail("public/sitemap.xml is missing — run npm run seo:sitemap");
}

if (sitemapXml) {
  const actual = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  const missing = expected.filter((loc) => !actual.includes(loc));
  const extra = actual.filter((loc) => !expected.includes(loc));

  for (const loc of missing) fail(`sitemap.xml is missing ${loc} — run npm run seo:sitemap`);
  for (const loc of extra) fail(`sitemap.xml contains stale URL ${loc} — run npm run seo:sitemap`);

  const duplicates = actual.filter((loc, index) => actual.indexOf(loc) !== index);
  for (const loc of new Set(duplicates)) fail(`sitemap.xml lists ${loc} more than once`);
}

// Every sitemap path must resolve to something we actually render.
const STATIC_PATHS = new Set(["/", "/about", TOOLS_HUB_PATH]);

// Routes that only redirect must not be advertised as canonical destinations.
const REDIRECT_ONLY_PATHS = ["/pricing"];
for (const path of REDIRECT_ONLY_PATHS) {
  if (getPublicSitemapPaths().includes(path)) {
    fail(`Sitemap lists ${path}, which only redirects — remove it or make it a real page`);
  }
}
for (const path of getPublicSitemapPaths()) {
  const isMarketing = publishedSlugs.has(path.slice(1));
  const isTool = toolPaths.has(path);
  const isLearn = path === "/learn" || path.startsWith("/learn/");
  if (!STATIC_PATHS.has(path) && !isMarketing && !isTool && !isLearn) {
    fail(`Sitemap path ${path} does not map to a known route`);
  }
}

const NOINDEX_PREFIXES = ["/dashboard", "/invoices", "/settings", "/admin", "/pay", "/login"];
for (const path of getPublicSitemapPaths()) {
  if (NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    fail(`Sitemap contains noindex path ${path}`);
  }
}

// --------------------------------------------------------------------- report

console.log(
  `SEO audit: ${marketingPages.length} marketing pages, ${tools.length} tools, ${learnArticles.length} learn pages, ${expected.length} sitemap URLs`,
);

for (const message of warnings) console.log(`  warn  ${message}`);
for (const message of failures) console.error(`  FAIL  ${message}`);

if (failures.length > 0) {
  console.error(`\nSEO audit failed with ${failures.length} error(s).`);
  process.exit(1);
}

console.log(`\nSEO audit passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}.`);
