import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const profile = readFileSync(join(ROOT, "src/components/ProfileAccountMenu.tsx"), "utf8");
const shell = readFileSync(join(ROOT, "src/components/AppShell.tsx"), "utf8");
const theme = readFileSync(join(ROOT, "src/lib/theme.tsx"), "utf8");
let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed++;
}

if (profile.includes("LanguageSwitcher") || profile.includes("ThemeToggle")) {
  fail("ProfileAccountMenu must not use standalone LanguageSwitcher or ThemeToggle");
}

if (!profile.includes("ProfileSidebarMenu") || !profile.includes("side=\"top\"")) {
  fail("desktop profile menu must open upward (side=top)");
}

for (const needle of [
  "displayNameFor",
  "appearanceSystem",
  "appearanceLight",
  "appearanceDark",
  "SUPPORTED_LANGUAGES",
  "signOut",
]) {
  if (!profile.includes(needle)) fail(`ProfileAccountMenu missing ${needle}`);
}

if (!shell.includes("ProfileSidebarMenu") || !shell.includes("MobileProfileSheet")) {
  fail("AppShell must use ProfileSidebarMenu and MobileProfileSheet");
}

if (shell.includes("LanguageSwitcher") || shell.includes("ThemeToggle")) {
  fail("AppShell must not render persistent language/theme controls");
}

if (!shell.includes("fixed inset-y-0") || !shell.includes("overflow-hidden")) {
  fail("sidebar must be fixed full viewport height with overflow hidden");
}

if (!shell.includes("lg:ps-64")) {
  fail("main content must offset fixed sidebar (lg:ps-64)");
}

if (!shell.includes("shrink-0 border-t")) {
  fail("profile footer must be shrink-0 with border-t");
}

if (/absolute|top:\s*50%|translateY\(-50%\)/.test(profile)) {
  fail("profile menu must not use absolute viewport centering");
}

if (!theme.includes('"system"')) {
  fail("theme must support system preference");
}

const optional = readFileSync(
  join(ROOT, "src/components/invoices/create/OptionalFieldsPicker.tsx"),
  "utf8",
);
if (!optional.includes("confirmRemoveWithContent")) {
  fail("optional fields must confirm removal when notes/terms have content");
}

for (const lang of ["en", "ar", "th", "zh", "ru"]) {
  const com = JSON.parse(readFileSync(join(ROOT, "locales", lang, "common.json"), "utf8"));
  for (const key of ["openMenu", "appearanceSystem", "appearanceLight", "appearanceDark"]) {
    if (typeof com.profileMenu?.[key] !== "string" || !com.profileMenu[key].trim()) {
      fail(`locales/${lang}/common.json missing profileMenu.${key}`);
    }
  }
}

if (failed) process.exit(1);
console.log("sidebar account guard passed");
