import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { INVOICE_HTML_FIXTURES } from "./fixtures.ts";

const baselineDir = join(fileURLToPath(new URL(".", import.meta.url)), "baselines");
const tmpDir = join(process.cwd(), "tmp", "visual-invoice-html");

function renderFixtureHtml(fixtureId: string): string {
  mkdirSync(tmpDir, { recursive: true });
  const outPath = join(tmpDir, `${fixtureId}.html`);
  const result = spawnSync(
    "npx",
    ["--yes", "tsx", "scripts/invoice-visual-html.harness.ts", fixtureId, outPath],
    { cwd: process.cwd(), encoding: "utf8", shell: true },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to render ${fixtureId}`);
  }
  return readFileSync(outPath, "utf8");
}

test.describe("invoice document visual regression", () => {
  test.beforeAll(() => {
    mkdirSync(baselineDir, { recursive: true });
  });

  for (const fixture of INVOICE_HTML_FIXTURES.filter((f) =>
    ["tax-invoice-bank-one-page", "bank-crypto-dual", "long-notes"].includes(f.id),
  )) {
    test(`html snapshot ${fixture.id}`, async ({ page }) => {
      const html = renderFixtureHtml(fixture.id);
      await page.setContent(html, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.setViewportSize({ width: 794, height: 1123 });

      const screenshot = await page.locator(".invoice-page").screenshot();
      const baselinePath = join(baselineDir, `${fixture.id}.png`);

      let baseline: Buffer;
      try {
        baseline = readFileSync(baselinePath);
      } catch {
        writeFileSync(baselinePath, screenshot);
        test.info().annotations.push({
          type: "baseline",
          description: `Created baseline ${fixture.id}.png`,
        });
        return;
      }

      const { PNG } = await import("pngjs");
      const { default: pixelmatch } = await import("pixelmatch");

      const imgA = PNG.sync.read(baseline);
      const imgB = PNG.sync.read(screenshot);
      expect(imgA.width).toBe(imgB.width);
      expect(imgA.height).toBe(imgB.height);
      const diff = new PNG({ width: imgA.width, height: imgA.height });
      const diffPixels = pixelmatch(imgA.data, imgB.data, diff.data, imgA.width, imgA.height, {
        threshold: 0.12,
      });
      const ratio = diffPixels / (imgA.width * imgA.height);
      expect(ratio).toBeLessThan(0.02);
    });
  }

  test("preview geometry matches pdf page size", async ({ page }) => {
    const html = renderFixtureHtml("tax-invoice-bank-one-page");
    await page.setContent(html, { waitUntil: "networkidle" });
    const box = await page.locator(".invoice-page").boundingBox();
    expect(box?.width).toBeGreaterThan(780);
    expect(box?.width).toBeLessThan(810);
  });
});
