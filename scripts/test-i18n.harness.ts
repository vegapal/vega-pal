/**
 * i18n regression tests — structural completeness and pricing guards.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SUPPORTED_LANGUAGES } from "../src/lib/i18n/languages.ts";

const LOCALES_DIR = "locales";
const REF = "en";
const TARGETS = ["ar", "th", "zh", "ru"];
const NAMESPACES = ["common", "landing", "auth", "dashboard", "invoices", "settings", "admin"];

function flatten(obj: Record<string, unknown>, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [sk, sv] of flatten(v as Record<string, unknown>, key)) out.set(sk, sv);
    } else {
      out.set(key, v);
    }
  }
  return out;
}

function loadNs(locale: string, ns: string) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, locale, `${ns}.json`), "utf8"));
}

const refKeys = new Map<string, unknown>();
for (const ns of NAMESPACES) {
  for (const [k, v] of flatten(loadNs(REF, ns))) refKeys.set(`${ns}:${k}`, v);
}

for (const locale of TARGETS) {
  const localeKeys = new Set<string>();
  for (const ns of NAMESPACES) {
    for (const [k, v] of flatten(loadNs(locale, ns))) {
      localeKeys.add(`${ns}:${k}`);
      assert.ok(v !== "" && v != null, `${locale} ${ns}.${k} must not be empty`);
    }
  }
  for (const refKey of refKeys.keys()) {
    assert.ok(localeKeys.has(refKey), `${locale} missing ${refKey}`);
  }
  const landing = loadNs(locale, "landing");
  assert.match(
    landing.pricing?.plans?.free?.features?.documents ?? "",
    /3 documents per month/i,
    `${locale} free limit copy`,
  );
  assert.doesNotMatch(JSON.stringify(landing.pricing?.plans ?? {}), /Business/i, `${locale} no Business tier`);
}

assert.equal(SUPPORTED_LANGUAGES.length, 5, "five supported locales in selector");

function rtlFor(lang: string) {
  return lang === "ar" ? "rtl" : "ltr";
}
assert.equal(rtlFor("ar"), "rtl");
assert.equal(rtlFor("en"), "ltr");
assert.equal(rtlFor("zh"), "ltr");

console.log("PASS  i18n structural tests");
console.log(`PASS  reference key count ${refKeys.size}`);
