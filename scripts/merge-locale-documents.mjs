import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const langs = readdirSync(join(ROOT, "locales")).filter((d) => d !== "en");
const enInv = JSON.parse(readFileSync(join(ROOT, "locales/en/invoices.json"), "utf8"));
const enCom = JSON.parse(readFileSync(join(ROOT, "locales/en/common.json"), "utf8"));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else if (target[key] === undefined) {
      target[key] = source[key];
    }
  }
}

for (const lang of langs) {
  const invPath = join(ROOT, "locales", lang, "invoices.json");
  const comPath = join(ROOT, "locales", lang, "common.json");
  const inv = JSON.parse(readFileSync(invPath, "utf8"));
  deepMerge(inv, { list: enInv.list, wizard: enInv.wizard, conversion: enInv.conversion });
  writeFileSync(invPath, `${JSON.stringify(inv, null, 2)}\n`);
  const com = JSON.parse(readFileSync(comPath, "utf8"));
  com.nav = com.nav || {};
  for (const k of ["documents", "createDocument", "plan"]) {
    if (!com.nav[k]) com.nav[k] = enCom.nav[k];
  }
  com.appearance = com.appearance || enCom.appearance;
  com.buttons = com.buttons || {};
  for (const k of ["newInvoice", "createDocument"]) {
    if (!com.buttons[k]) com.buttons[k] = enCom.buttons[k];
  }
  writeFileSync(comPath, `${JSON.stringify(com, null, 2)}\n`);
}

console.log("merged document locale keys into", langs.join(", "));
