import { identitiesEqual, normalizeIdentity } from "@/lib/invoice/document-identity";

/**
 * Merge stored notes (description) and terms into one NOTES section for PDF/preview.
 * Each non-empty source line becomes one bullet; duplicate lines are omitted.
 */
export function normalizeInvoiceNoteBullets(input: {
  description?: string | null;
  termsAndConditions?: string | null;
  includeDescription: boolean;
  includeTerms: boolean;
}): string[] {
  const bullets: string[] = [];

  const pushLine = (line: string) => {
    const text = line.trim();
    if (!text) return;
    if (bullets.some((b) => identitiesEqual(b, text))) return;
    bullets.push(text);
  };

  const pushField = (raw: string) => {
    for (const line of raw.replace(/\r\n/g, "\n").split("\n")) {
      pushLine(line);
    }
  };

  if (input.includeDescription) {
    const d = normalizeIdentity(input.description);
    if (d) pushField(d);
  }
  if (input.includeTerms) {
    const t = normalizeIdentity(input.termsAndConditions);
    if (t) pushField(t);
  }

  return bullets;
}
