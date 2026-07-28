/**
 * Fail if analytics code references disallowed PII field names in payloads.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const SCAN_DIRS = [
  join(ROOT, "src", "lib", "analytics"),
  join(ROOT, "src", "components", "analytics"),
];

const DISALLOWED = [
  "email",
  "customer_name",
  "customerName",
  "phone",
  "address",
  "recipient",
  "client_name",
  "clientName",
];

const KEY_PATTERNS = DISALLOWED.map(
  (name) => new RegExp(`\\b${name}\\s*:`),
);

function isCommentOnly(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
}

function walk(dir, hits) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p, hits);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name)) continue;
    const rel = p.replace(ROOT + "\\", "").replace(ROOT + "/", "");
    const lines = readFileSync(p, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isCommentOnly(line)) continue;
      for (const pattern of KEY_PATTERNS) {
        if (pattern.test(line)) {
          hits.push({ file: rel, line: i + 1, text: line.trim() });
        }
      }
    }
  }
}

const hits = [];
for (const dir of SCAN_DIRS) {
  try {
    walk(dir, hits);
  } catch {
    /* missing */
  }
}

if (hits.length > 0) {
  console.error("Analytics PII check failed. Disallowed field names found:");
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  ${h.text}`);
  }
  process.exit(1);
}

console.log("Analytics PII check passed");
process.exit(0);
