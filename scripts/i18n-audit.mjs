/**
 * Translation key audit — exits non-zero on structural gaps.
 * Usage: node scripts/i18n-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";

const LOCALES_DIR = "locales";
const REF = "en";
const TARGETS = ["ar", "th", "zh", "ru"];
const NAMESPACES = ["common", "landing", "auth", "dashboard", "invoices", "settings", "admin"];

const IMMUTABLE_TERMS = new Set([
  "VegaPal", "USDT", "USDC", "BTC", "ETH", "TRX", "TRC20", "ERC20", "BEP20", "opBNB", "TON",
  "QR", "PDF", "API", "IBAN", "SWIFT", "VAT", "TxID", "URL", "SEO", "Google", "Bing", "Yandex",
  "IndexNow", "Supabase", "Vercel", "Pro", "Telegram",
]);

const STALE_PATTERNS = [
  /\b5 invoices\b/i,
  /\b5 documents\b/i,
  /\$19\s*\/?\s*month/i,
  /\$49\s*\/?\s*month/i,
  /Business plan/i,
];

function flatten(obj, prefix = "") {
  const out = new Map();
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const [sk, sv] of flatten(v, key)) out.set(sk, sv);
      } else {
        out.set(key, v);
      }
    }
  }
  return out;
}

function loadNs(locale, ns) {
  const file = path.join(LOCALES_DIR, locale, `${ns}.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

let failures = 0;

function fail(msg) {
  console.error(`FAIL  ${msg}`);
  failures++;
}

function pass(msg) {
  console.log(`PASS  ${msg}`);
}

const refKeys = new Map();
for (const ns of NAMESPACES) {
  const flat = flatten(loadNs(REF, ns));
  for (const [k, v] of flat) refKeys.set(`${ns}:${k}`, v);
}

console.log(`\n=== Reference locale (${REF}) ===`);
console.log(`Total keys: ${refKeys.size}`);

for (const locale of TARGETS) {
  console.log(`\n=== ${locale} vs ${REF} ===`);
  let missing = 0;
  let empty = 0;
  let extra = 0;
  let stale = 0;
  let identical = 0;

  const localeKeys = new Set();
  for (const ns of NAMESPACES) {
    const flat = flatten(loadNs(locale, ns));
    for (const [k, v] of flat) {
      localeKeys.add(`${ns}:${k}`);
      const refKey = `${ns}:${k}`;
      const refVal = refKeys.get(refKey);
      if (refVal === undefined) extra++;
      if (v === "" || v == null) empty++;
      if (
        typeof v === "string" &&
        typeof refVal === "string" &&
        v === refVal &&
        v.length > 12 &&
        !IMMUTABLE_TERMS.has(v) &&
        !/^\{\{/.test(v) &&
        !/https?:\/\//.test(v) &&
        !/^\d/.test(v)
      ) {
        identical++;
      }
      for (const pat of STALE_PATTERNS) {
        if (typeof v === "string" && pat.test(v)) stale++;
      }
    }
  }

  for (const refKey of refKeys.keys()) {
    if (!localeKeys.has(refKey)) missing++;
  }

  console.log(`  keys: ${localeKeys.size}, missing: ${missing}, extra: ${extra}, empty: ${empty}, stale: ${stale}`);
  if (missing) fail(`${locale} missing ${missing} keys vs ${REF}`);
  else pass(`${locale} key parity`);
  if (empty) fail(`${locale} has ${empty} empty translations`);
  if (stale) fail(`${locale} has ${stale} stale pricing/limit strings`);
  if (identical > 80) {
    console.log(`  WARN  ${identical} strings identical to English (review quality)`);
  }
}

// Public pricing must not mention Business plan tier
const landingEn = loadNs(REF, "landing");
const proPlans = JSON.stringify(landingEn.pricing?.plans ?? {});
if (/business/i.test(proPlans)) fail("English landing pricing mentions Business tier");
else pass("English public pricing has no Business plan");

for (const locale of TARGETS) {
  const landing = loadNs(locale, "landing");
  const freeDocs = landing.pricing?.plans?.free?.features?.documents ?? "";
  if (!/3 documents per month/i.test(freeDocs)) {
    fail(`${locale} free plan must say 3 documents per month`);
  }
}

if (failures > 0) {
  console.log(`\nAudit failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("\nPASS  i18n structural audit");
process.exit(0);
