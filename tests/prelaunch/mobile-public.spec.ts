import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { assertNoUserVisibleHorizontalScroll } from "./helpers/overflow";

function screenshotDir(projectName: string) {
  const dir = path.join(process.cwd(), "tmp", "prelaunch-mobile", "screenshots", projectName);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

test.describe("Pre-launch public mobile", () => {
  test("homepage pricing and overflow", async ({ page }, testInfo) => {
    const shots = screenshotDir(testInfo.project.name);

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("heading", { name: /create your invoice/i }).waitFor();

    await assertNoUserVisibleHorizontalScroll(page);
    await page.screenshot({ path: path.join(shots, "homepage.png"), fullPage: true });

    await page.locator("#pricing").scrollIntoViewIfNeeded();
    const pricing = page.locator("#pricing");
    await expect(pricing.getByText("3 documents per month")).toBeVisible();
    await pricing.getByRole("tab", { name: /^monthly$/i }).click();
    await expect(pricing.locator("p").filter({ hasText: "$29" }).first()).toBeVisible();
    await pricing.getByRole("tab", { name: /6 months/i }).click();
    await expect(pricing.getByText("$59", { exact: false }).first()).toBeVisible();
    await expect(pricing.getByRole("heading", { name: /^business$/i })).toHaveCount(0);

    await page.screenshot({ path: path.join(shots, "pricing.png"), fullPage: false });

    const converter = page.getByRole("heading", { name: /live currency converter/i });
    await converter.scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /USDT|Tether/i }).first().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(shots, "converter-dropdown.png") });

    await assertNoUserVisibleHorizontalScroll(page);
  });

  test("login page renders without overflow", async ({ page }, testInfo) => {
    const shots = screenshotDir(testInfo.project.name);
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await assertNoUserVisibleHorizontalScroll(page);
    await page.screenshot({ path: path.join(shots, "login.png"), fullPage: true });
  });
});
