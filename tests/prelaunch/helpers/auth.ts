import { expect, type Page } from "@playwright/test";

export function requireE2ECredentials(): { email: string; password: string } {
  const email = process.env.E2E_EMAIL?.trim();
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD for authenticated prelaunch tests.");
  }
  return { email, password };
}

/** Sign in through the real login form (Turnstile bypassed on preview/local per policy). */
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).not.toHaveURL(/\/login$/, { timeout: 30_000 });
}
