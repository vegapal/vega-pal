/**
 * Ensures invoice numbers are allocated only via Supabase RPC (no client count fallback).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const storePath = join(ROOT, "src/lib/vegapal-store.ts");
const rootPath = join(ROOT, "src/routes/__root.tsx");
const store = readFileSync(storePath, "utf8");
const root = readFileSync(rootPath, "utf8");

let failed = 0;

if (!store.includes('supabase.rpc("allocate_invoice_document_number"')) {
  console.error("FAIL: allocate_invoice_document_number RPC call missing");
  failed++;
}

const nextFn = store.match(/async function nextInvoiceNumber[\s\S]*?\n\}/)?.[0] ?? "";
if (!nextFn) {
  console.error("FAIL: nextInvoiceNumber function not found");
  failed++;
} else {
  if (nextFn.includes("count") || nextFn.includes("padStart") || nextFn.includes("QTN-")) {
    console.error("FAIL: count or client-side prefix fallback in nextInvoiceNumber");
    failed++;
  }
  if (!nextFn.includes("allocate_invoice_document_number")) {
    console.error("FAIL: nextInvoiceNumber must call allocate_invoice_document_number");
    failed++;
  }
}

if (!store.includes("InvoiceNumberAllocationError")) {
  console.error("FAIL: InvoiceNumberAllocationError missing");
  failed++;
}

if (!root.includes("import { PageViewTracker }")) {
  console.error("FAIL: PageViewTracker must be imported in __root.tsx");
  failed++;
}

if (!root.includes("<PageViewTracker />")) {
  console.error("FAIL: PageViewTracker must be rendered in __root.tsx");
  failed++;
}

if (failed > 0) {
  process.exit(1);
}

console.log("Invoice numbering guard passed");
process.exit(0);
