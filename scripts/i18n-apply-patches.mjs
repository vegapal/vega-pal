/**
 * Apply i18n sprint patches: merge missing keys, translations, remove orphans.
 * Usage: node scripts/i18n-apply-patches.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { OVERRIDES, PRICING_OVERRIDES, SUBSCRIPTION_MODAL_OVERRIDES } from "./i18n-overrides.mjs";

const LOCALES_DIR = "locales";
const REF = "en";
const TARGETS = ["ar", "th", "zh", "ru"];
const NAMESPACES = ["common", "landing", "auth", "dashboard", "invoices", "settings", "admin"];

const ORPHAN_KEYS = [
  "invoices:wizard.validation.clientEmailRequired",
  "invoices:wizard.validation.titleRequired",
];

function deepMergeMissing(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      deepMergeMissing(target[key], value);
    } else if (target[key] === undefined) {
      target[key] = value;
    }
  }
}

function deepMergeOverwrite(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      deepMergeOverwrite(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

function deletePath(obj, dotted) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) return;
    cur = cur[parts[i]];
  }
  delete cur[parts.at(-1)];
}

for (const locale of TARGETS) {
  for (const ns of NAMESPACES) {
    const file = path.join(LOCALES_DIR, locale, `${ns}.json`);
    const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, REF, `${ns}.json`), "utf8"));
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    deepMergeMissing(data, en);
    if (OVERRIDES[locale]?.[ns]) deepMergeOverwrite(data, OVERRIDES[locale][ns]);
    if (ns === "landing") {
      if (PRICING_OVERRIDES[locale]) deepMergeOverwrite(data.pricing ?? (data.pricing = {}), PRICING_OVERRIDES[locale]);
      if (SUBSCRIPTION_MODAL_OVERRIDES[locale]) {
        deepMergeOverwrite(data.subscriptionModal ?? (data.subscriptionModal = {}), SUBSCRIPTION_MODAL_OVERRIDES[locale]);
      }
    }
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`patched ${locale}/${ns}.json`);
  }
  for (const orphan of ORPHAN_KEYS) {
    const [ns, ...rest] = orphan.split(":");
    const file = path.join(LOCALES_DIR, locale, `${ns}.json`);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    deletePath(data, rest.join("."));
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  }
}

console.log("Done.");
