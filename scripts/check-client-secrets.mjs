/**
 * Fail CI if elevated secrets appear in client bundles or VITE_* env wiring.
 * Usage: node scripts/check-client-secrets.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const CLIENT_ROOTS = ["src", "public"];
const SERVER_ONLY_MARKERS = [
  /process\.env\.SUPABASE_SERVICE_ROLE_KEY/,
  /process\.env\.TURNSTILE_SECRET/,
  /process\.env\.CRON_SECRET/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']{10,}/,
  /TURNSTILE_SECRET_KEY\s*=\s*["'][^"']{10,}/,
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
];

const VITE_FORBIDDEN = [
  /VITE_.*SERVICE_ROLE/i,
  /VITE_.*SECRET/i,
  /VITE_SUPABASE_SERVICE/i,
  /VITE_TURNSTILE_SECRET/i,
  /VITE_CRON/i,
];

const ALLOWLIST_FILES = new Set([
  "scripts/check-client-secrets.mjs",
  "scripts/qa-smoke.mjs",
]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const rel = relative(ROOT, p).replace(/\\/g, "/");
    if (ALLOWLIST_FILES.has(rel)) continue;
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === "tmp") continue;
      walk(p, out);
    } else if (/\.(ts|tsx|js|jsx|mjs|env\.example)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const hits = [];

for (const root of CLIENT_ROOTS) {
  for (const file of walk(join(ROOT, root))) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const content = readFileSync(file, "utf8");
    const isServerFile = rel.includes(".server.") || rel.includes("/server.ts");

    for (const pattern of VITE_FORBIDDEN) {
      if (pattern.test(content)) {
        hits.push(`${rel}: forbidden VITE secret pattern ${pattern}`);
      }
    }

    if (isServerFile) continue;

    for (const pattern of SERVER_ONLY_MARKERS) {
      if (pattern.test(content)) {
        // Allow references in comments/docs within server-only paths only — already skipped.
        // Allow literal string checks in security scripts under src? Unlikely.
        if (rel.includes("check-client-secrets")) continue;
        hits.push(`${rel}: elevated secret marker ${pattern}`);
      }
    }
  }
}

// .env.example must not document service role as VITE_
if (existsSync(".env.example")) {
  const example = readFileSync(".env.example", "utf8");
  for (const line of example.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    if (/^VITE_.*(SECRET|SERVICE_ROLE|CRON)/i.test(trimmed)) {
      hits.push(`.env.example: VITE_* must not carry elevated secrets (${trimmed.split("=")[0]})`);
    }
  }
}

if (hits.length > 0) {
  console.error("FAIL  check-client-secrets");
  for (const h of hits) console.error(`  - ${h}`);
  process.exit(1);
}

console.log("PASS  check-client-secrets — no elevated secrets in client paths");
