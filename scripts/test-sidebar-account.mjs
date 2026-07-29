import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const file = readFileSync(join(ROOT, "src/components/SidebarAccountSection.tsx"), "utf8");
const shell = readFileSync(join(ROOT, "src/components/AppShell.tsx"), "utf8");
let failed = 0;

for (const needle of [
  'user.name?.trim() || t("nav.account")',
  "plans.free",
  "LanguageSwitcher",
  "ThemeToggle",
  "signOut",
]) {
  if (!file.includes(needle)) {
    console.error(`FAIL: SidebarAccountSection missing ${needle}`);
    failed++;
  }
}

if (!shell.includes("mt-auto shrink-0") || !shell.includes("h-[100dvh]")) {
  console.error("FAIL: AppShell must use full-height sidebar and mt-auto account footer");
  failed++;
}

if (failed) process.exit(1);
console.log("sidebar account guard passed");
