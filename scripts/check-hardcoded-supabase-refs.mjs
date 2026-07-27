/**
 * Fail if legacy hardcoded Supabase project refs appear in the repo.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const BANNED = ["rudqfhqawqmhclqmaflj", "fqelxvilafgnuupqlkwm"];

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".vercel",
  "dist",
  "build",
  ".cursor",
]);

const SKIP_FILES = new Set(["check-hardcoded-supabase-refs.mjs"]);

function walk(dir, hits = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p, hits);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|md|sql|toml|json|example)$/i.test(name)) continue;
    if (SKIP_FILES.has(name)) continue;
    const text = readFileSync(p, "utf8");
    for (const ref of BANNED) {
      if (text.includes(ref)) hits.push({ file: p.replace(ROOT + "\\", "").replace(ROOT + "/", ""), ref });
    }
  }
  return hits;
}

const hits = walk(ROOT);
if (hits.length === 0) {
  console.log("OK: no banned Supabase project refs in source/docs.");
  process.exit(0);
}

console.error("FAIL: hardcoded Supabase project ref(s) found:");
for (const h of hits) console.error(`  ${h.ref} in ${h.file}`);
process.exit(1);
