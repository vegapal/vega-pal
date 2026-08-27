/**
 * Regenerate public/sitemap.xml from the single source of truth in
 * src/lib/seo/sitemap-urls.ts. Run via `npm run seo:sitemap`, which uses tsx so
 * this script can import the TypeScript registry (and its `@/` path aliases)
 * directly — the XML and the app can no longer drift apart.
 *
 * Public, indexable paths only — never add /dashboard, /invoices, /settings,
 * /admin, /pay or auth routes.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { getPublicSitemapUrls } from "../src/lib/seo/sitemap-urls.ts";

const urls = getPublicSitemapUrls();

const body = urls
  .map(({ loc, changefreq, priority }) =>
    [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n"),
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const outPath = join(process.cwd(), "public", "sitemap.xml");
writeFileSync(outPath, xml, "utf8");
console.log(`sitemap.xml written with ${urls.length} URLs -> ${outPath}`);
