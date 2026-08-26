/**
 * Regenerate public/sitemap.xml.
 *
 * The URL list is duplicated here in plain JS on purpose: this script must run
 * with bare node, without a TypeScript loader or path aliases. Keep it in sync
 * with src/lib/seo/sitemap-urls.ts and src/lib/seo/marketing-pages.ts.
 *
 * Public, indexable paths only — never add /dashboard, /invoices, /settings,
 * /admin, /pay or auth routes.
 */
import { writeFileSync } from "fs";
import { join } from "path";

const SITE_ORIGIN = "https://vega-pal.com";

const LEARN_PATHS = [
  ["/learn", "weekly", "0.8"],
  ["/learn/getting-started", "monthly", "0.7"],
  ["/learn/invoice", "monthly", "0.7"],
  ["/learn/payments", "monthly", "0.7"],
  ["/learn/security", "monthly", "0.7"],
  ["/learn/business", "monthly", "0.7"],
  ["/learn/faq", "monthly", "0.7"],
  ["/learn/what-is-an-invoice", "monthly", "0.8"],
  ["/learn/what-is-a-bill", "monthly", "0.8"],
  ["/learn/invoice-vs-bill", "monthly", "0.8"],
  ["/learn/invoice-generator", "monthly", "0.8"],
  ["/learn/invoice-software", "monthly", "0.8"],
];

const MARKETING_SLUGS = [
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
];

const urls = [
  ["/", "weekly", "1.0"],
  ["/pricing", "monthly", "0.8"],
  ...LEARN_PATHS,
  ...MARKETING_SLUGS.map((slug) => [`/${slug}`, "weekly", "0.9"]),
];

const body = urls
  .map(([path, changefreq, priority]) => {
    const loc = new URL(path, SITE_ORIGIN).toString();
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const outPath = join(process.cwd(), "public", "sitemap.xml");
writeFileSync(outPath, xml, "utf8");
console.log(`sitemap.xml written with ${urls.length} URLs -> ${outPath}`);
