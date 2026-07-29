import type { PdfRect } from "./layout-context";
import { FOOTER_DIVIDER_Y, PAGE_HEIGHT, PAGE_MARGIN_LEFT, PAGE_MARGIN_RIGHT, PAGE_WIDTH } from "./layout-context";

export type LayoutSectionId =
  | "header"
  | "client"
  | "subject"
  | "items"
  | "totals"
  | "notes"
  | "terms"
  | "payment"
  | "footer";

export type LayoutRecord = {
  page: number;
  section: LayoutSectionId;
  rect: PdfRect;
};

export type LayoutCollector = {
  enabled: boolean;
  records: LayoutRecord[];
};

export function createLayoutCollector(enabled: boolean): LayoutCollector {
  return { enabled, records: [] };
}

export function recordSection(
  collector: LayoutCollector,
  page: number,
  section: LayoutSectionId,
  rect: PdfRect,
): void {
  if (!collector.enabled) return;
  collector.records.push({ page, section, rect });
}

export function verifyLayoutRecords(records: LayoutRecord[], pageCount: number): void {
  const footerTopY = PAGE_HEIGHT - 15 - 12 - 6;

  for (const r of records) {
    if (r.rect.width < 0 || r.rect.height < 0) {
      throw new Error(`Negative layout size: ${r.section} ${JSON.stringify(r.rect)}`);
    }
    if (r.section !== "footer" && r.rect.y + r.rect.height > footerTopY + 0.5) {
      throw new Error(
        `Section ${r.section} on page ${r.page} extends below footerTop (${r.rect.y + r.rect.height} > ${footerTopY})`,
      );
    }
    if (r.rect.x < PAGE_MARGIN_LEFT - 0.5 || r.rect.x + r.rect.width > PAGE_WIDTH - PAGE_MARGIN_RIGHT + 0.5) {
      throw new Error(`Section ${r.section} out of horizontal bounds`);
    }
    if (r.page < 1 || r.page > pageCount) {
      throw new Error(`Invalid page ${r.page} for section ${r.section}`);
    }
  }

  const footers = records.filter((r) => r.section === "footer");
  if (footers.length !== pageCount) {
    throw new Error(`Expected ${pageCount} footer records, got ${footers.length}`);
  }

  for (const f of footers) {
    if (Math.abs(f.rect.y - FOOTER_DIVIDER_Y) > 1) {
      throw new Error(`Footer divider Y mismatch on page ${f.page}`);
    }
  }

  const items = records.filter((r) => r.section === "items");
  for (const t of items) {
    const expectedW = PAGE_WIDTH - PAGE_MARGIN_LEFT - PAGE_MARGIN_RIGHT;
    if (Math.abs(t.rect.width - expectedW) > 0.5) {
      throw new Error(`Table width ${t.rect.width} !== content width ${expectedW}`);
    }
  }
}

/** @deprecated Legacy harness ids — mapped for gradual migration */
export type LayoutRect = { id: string; x: number; y: number; w: number; h: number };

export function legacyLayoutFromRecords(records: LayoutRecord[]): LayoutRect[] {
  const map: Record<LayoutSectionId, string> = {
    header: "sellerBlock",
    client: "clientBlock",
    subject: "subject",
    items: "itemsTable",
    totals: "totals",
    notes: "notes",
    terms: "terms",
    payment: "paymentSection",
    footer: "footer",
  };
  return records.map((r, i) => ({
    id: `${map[r.section] ?? r.section}_${i}`,
    x: r.rect.x,
    y: r.rect.y,
    w: r.rect.width,
    h: r.rect.height,
  }));
}
