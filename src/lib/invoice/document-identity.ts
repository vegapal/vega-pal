import type { DocumentType, Invoice } from "@/lib/vegapal-store";

export function normalizeIdentity(value?: string | null): string {
  return (value ?? "").trim();
}

export function identitiesEqual(a: string, b: string): boolean {
  const x = normalizeIdentity(a);
  const y = normalizeIdentity(b);
  if (!x || !y) return false;
  return x.toLowerCase() === y.toLowerCase();
}

export type IdentityLine = { text: string; muted?: boolean };

function pushUnique(lines: IdentityLine[], text: string, muted = false) {
  const t = normalizeIdentity(text);
  if (!t) return;
  if (lines.some((l) => identitiesEqual(l.text, t))) return;
  lines.push({ text: t, muted });
}

export function clientIdentityFromParts(parts: {
  name?: string | null;
  company?: string | null;
  email?: string | null;
}): IdentityLine[] {
  const name = normalizeIdentity(parts.name);
  const company = normalizeIdentity(parts.company);
  const email = normalizeIdentity(parts.email);
  const lines: IdentityLine[] = [];
  const primary = name || company;
  if (primary) pushUnique(lines, primary);
  const secondary = name && company && !identitiesEqual(name, company) ? company : "";
  if (secondary && !identitiesEqual(secondary, primary)) pushUnique(lines, secondary, true);
  if (email && !identitiesEqual(email, primary) && !identitiesEqual(email, secondary)) {
    pushUnique(lines, email, true);
  }
  return lines;
}

export function clientIdentityLines(inv: Invoice): IdentityLine[] {
  return clientIdentityFromParts({
    name: inv.clientName,
    company: inv.clientCompany,
    email: inv.clientEmail,
  });
}

export function sellerIdentityFromParts(parts: {
  business?: string | null;
  name?: string | null;
  email?: string | null;
  address?: string | null;
}): IdentityLine[] {
  const company = normalizeIdentity(parts.business);
  const person = normalizeIdentity(parts.name);
  const email = normalizeIdentity(parts.email);
  const lines: IdentityLine[] = [];

  if (company) pushUnique(lines, company);
  if (person && !identitiesEqual(person, company) && !identitiesEqual(person, email)) {
    pushUnique(lines, person);
  }
  if (email) {
    const alreadyShown = lines.some((l) => identitiesEqual(l.text, email));
    if (!alreadyShown) pushUnique(lines, email, true);
  }
  if (lines.length === 0 && email) pushUnique(lines, email);

  const address = normalizeIdentity(parts.address);
  if (address) pushUnique(lines, address, true);

  return lines;
}

export function sellerIdentityLines(inv: Invoice): IdentityLine[] {
  return sellerIdentityFromParts({
    business: inv.sellerBusiness,
    name: inv.sellerName,
    email: inv.sellerEmail,
    address: inv.sellerAddress,
  });
}

export function clientDisplayName(inv: Invoice): string {
  const name = normalizeIdentity(inv.clientName);
  const company = normalizeIdentity(inv.clientCompany);
  if (name && company && identitiesEqual(name, company)) return name;
  return name || company || "";
}

export function sellerDisplayName(inv: Invoice): string {
  const lines = sellerIdentityLines(inv);
  return lines[0]?.text ?? "";
}
