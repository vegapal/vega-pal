/**
 * Turnstile single-verify tests (no secrets or tokens logged).
 */
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CLIENT_SCAN = ["src/routes", "src/hooks", "src/lib/turnstile/client.ts", "src/lib/auth/auth-client.ts"];

function scanFile(relPath, hits) {
  const text = readFileSync(join(ROOT, relPath), "utf8");
  if (text.includes("/api/turnstile/verify")) {
    hits.push(relPath);
  }
  if (text.includes("verifyTurnstileOnServer")) {
    hits.push(`${relPath} (verifyTurnstileOnServer)`);
  }
  if (text.includes("verifyBeforeAuth")) {
    hits.push(`${relPath} (verifyBeforeAuth)`);
  }
}

function walkDir(relDir, hits) {
  const full = join(ROOT, relDir);
  for (const name of readdirSync(full)) {
    const p = join(full, name);
    const st = statSync(p);
    if (st.isDirectory()) walkDir(join(relDir, name), hits);
    else if (/\.(tsx?|jsx?)$/.test(name)) scanFile(join(relDir, name).replace(/\\/g, "/"), hits);
  }
}

const staticHits = [];
for (const entry of CLIENT_SCAN) {
  try {
    const full = join(ROOT, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkDir(entry, staticHits);
    else scanFile(entry, staticHits);
  } catch {
    /* missing */
  }
}

if (staticHits.length > 0) {
  console.error("Turnstile static check failed — preflight API usage still present:");
  for (const h of staticHits) console.error(`  ${h}`);
  process.exit(1);
}

const verifySource = readFileSync(join(ROOT, "src/lib/turnstile/verify.server.ts"), "utf8");
if (!verifySource.includes("turnstile_verification_failed")) {
  console.error("Turnstile static check failed: structured failure log missing");
  process.exit(1);
}

const harness = spawnSync("npx", ["--yes", "tsx", "scripts/test-turnstile-verify.harness.ts"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, NODE_ENV: "test" },
});

if (harness.status !== 0) {
  process.exit(harness.status ?? 1);
}

console.log("Turnstile verify tests passed");
process.exit(0);
