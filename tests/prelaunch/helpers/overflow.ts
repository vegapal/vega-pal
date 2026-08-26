import { expect, type Page } from "@playwright/test";

export type OverflowOffender = {
  tag: string;
  id: string;
  className: string;
  left: number;
  right: number;
  width: number;
};

/** Elements extending past the viewport (ignores clipped decorative layers). */
export async function findHorizontalOverflowOffenders(page: Page): Promise<OverflowOffender[]> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const offenders: OverflowOffender[] = [];

    const nodes = document.querySelectorAll("body *");
    for (const el of nodes) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.closest('[aria-hidden="true"]')) continue;

      const style = window.getComputedStyle(el);
      if (style.position === "fixed" || style.position === "sticky") continue;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      const overflowsLeft = rect.left < -1;
      const overflowsRight = rect.right > vw + 1;
      if (!overflowsLeft && !overflowsRight) continue;

      // Ignore children if an ancestor already overflowed (report root cause).
      let nested = false;
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const pr = parent.getBoundingClientRect();
        if (pr.left < -1 || pr.right > vw + 1) {
          nested = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (nested) continue;

      offenders.push({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        className: el.className?.toString?.().slice(0, 120) ?? "",
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }

    return offenders.slice(0, 8);
  });
}

export async function assertNoUserVisibleHorizontalScroll(page: Page) {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const before = root.scrollLeft;
    root.scrollLeft = root.scrollWidth;
    const maxScrollLeft = root.scrollLeft;
    root.scrollLeft = before;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      canScrollHorizontally: maxScrollLeft > 0,
    };
  });

  const offenders = metrics.canScrollHorizontally ? await findHorizontalOverflowOffenders(page) : [];

  expect(
    metrics.canScrollHorizontally,
    offenders.length
      ? `horizontal scroll detected (${metrics.scrollWidth}px > ${metrics.clientWidth}px). Offenders: ${JSON.stringify(offenders)}`
      : `horizontal scroll detected (${metrics.scrollWidth}px > ${metrics.clientWidth}px)`,
  ).toBe(false);
}
