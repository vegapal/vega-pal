import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginViaUi } from "./helpers/auth";
import { assertNoUserVisibleHorizontalScroll } from "./helpers/overflow";

function hasE2ECredentials() {
  return Boolean(process.env.E2E_EMAIL?.trim() && process.env.E2E_PASSWORD);
}

function screenshotDir(projectName: string) {
  const dir = path.join(process.cwd(), "tmp", "prelaunch-mobile", "screenshots", projectName);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

test.describe("Pre-launch authenticated mobile", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!hasE2ECredentials()) {
      testInfo.skip(true, "Set E2E_EMAIL and E2E_PASSWORD for authenticated prelaunch tests.");
      return;
    }
    await loginViaUi(page, process.env.E2E_EMAIL!.trim(), process.env.E2E_PASSWORD!);
  });

  test("dashboard", async ({ page }, testInfo) => {
    const shots = screenshotDir(testInfo.project.name);

    await page.goto("/dashboard");
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
    await assertNoUserVisibleHorizontalScroll(page);
    await page.screenshot({ path: path.join(shots, "dashboard.png"), fullPage: true });
  });

  test("invoice live preview columns and modal", async ({ page }, testInfo) => {
    const shots = screenshotDir(testInfo.project.name);

    await page.goto("/invoices/new");
    await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });

    const previewBtn = page.getByRole("button", {
      name: /preview document|openMobile|live preview/i,
    });
    await expect(previewBtn).toBeVisible({ timeout: 15_000 });
    await previewBtn.click();

    const sheet = page.locator('[role="dialog"]');
    await expect(sheet).toBeVisible();

    // Desktop aside preview stays in DOM but hidden on mobile — scope to the sheet.
    const host = sheet.locator(".invoice-preview-scale-host");
    const table = sheet.locator(".invoice-table");
    await expect(host).toBeVisible();
    await expect(table).toBeVisible();

    for (const label of ["Description", "Qty", "Unit price", "Amount"]) {
      await expect(table.locator("th", { hasText: label })).toBeVisible();
    }

    const hostBox = await host.boundingBox();
    const tableBox = await table.boundingBox();
    const viewportW = page.viewportSize()?.width ?? 390;
    expect(hostBox).not.toBeNull();
    expect(tableBox).not.toBeNull();
    if (hostBox && tableBox) {
      expect(hostBox.x).toBeGreaterThanOrEqual(-1);
      expect(hostBox.x + hostBox.width).toBeLessThanOrEqual(viewportW + 2);
      expect(tableBox.x + tableBox.width).toBeLessThanOrEqual(hostBox.x + hostBox.width + 4);
    }

    await page.screenshot({ path: path.join(shots, "invoice-preview-open.png") });

    // Vertical scroll inside sheet
    await sheet.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    await page.getByRole("button", { name: /close/i }).first().click();
    await expect(sheet).toBeHidden();
    await assertNoUserVisibleHorizontalScroll(page);
  });
});
