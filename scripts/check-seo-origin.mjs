/**
 * Fail if legacy vegapal.com hostnames appear in SEO/runtime source trees.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "public", "scripts"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".output", ".nitro", ".git"]);
const SKIP_FILES = new Set(["check-seo-origin.mjs"]);

const BANNED = ["https://vegapal.com", "http://vegapal.com", "www.vegapal.com"];

function walk(dir, hits) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p, hits);
      continue;
    }
    if (SKIP_FILES.has(name)) continue;
    const rel = p.replace(ROOT + "\\", "").replace(ROOT + "/", "");
    const text = readFileSync(p, "utf8");
    for (const needle of BANNED) {
      if (text.includes(needle)) {
        hits.push({ file: rel, needle });
      }
    }
  }
}

const hits = [];
for (const dir of SCAN_DIRS) {
  const full = join(ROOT, dir);
  try {
    walk(full, hits);
  } catch {
    /* missing dir */
  }
}

if (hits.length > 0) {
  console.error("SEO origin check failed. Legacy hostname found in:");
  for (const h of hits) {
    console.error(`  ${h.file} (${h.needle})`);
  }
  process.exit(1);
}

console.log("SEO origin check passed: canonical origin is https://vega-pal.com");
process.exit(0);
