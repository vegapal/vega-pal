/**
 * Validate analytics-related VITE_* env formats when set.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

function loadEnvFiles() {
  for (const file of [".env", ".env.local", ".env.production"]) {
    const p = join(ROOT, file);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadEnvFiles();

const RULES = [
  {
    key: "VITE_GOOGLE_TAG_MANAGER_ID",
    label: "Google Tag Manager",
    pattern: /^GTM-[A-Z0-9]+$/,
  },
  {
    key: "VITE_GOOGLE_ANALYTICS_ID",
    label: "Google Analytics 4",
    pattern: /^G-[A-Z0-9]+$/,
  },
  {
    key: "VITE_GOOGLE_ADS_ID",
    label: "Google Ads",
    pattern: /^AW-[0-9]+$/,
  },
  {
    key: "VITE_MICROSOFT_CLARITY_ID",
    label: "Microsoft Clarity",
    pattern: /^[a-z0-9]+$/,
  },
];

let failed = false;
let anyConfigured = false;

for (const { key, label, pattern } of RULES) {
  const raw = process.env[key];
  if (!raw || !raw.trim()) continue;
  anyConfigured = true;
  const value = raw.trim();
  if (!pattern.test(value)) {
    console.error(`Invalid format for ${label} (${key}).`);
    failed = true;
  }
}

if (!anyConfigured) {
  console.warn("Warning: no analytics measurement IDs are configured (all empty).");
}

if (failed) {
  process.exit(1);
}

console.log("Analytics configuration check passed");
process.exit(0);
