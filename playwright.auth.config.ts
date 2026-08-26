import { defineConfig } from "@playwright/test";

/**
 * Auth persistence suite — separate from visual-invoice Playwright config.
 * Default baseURL assumes `npm run preview` (or set PLAYWRIGHT_BASE_URL).
 */
export default defineConfig({
  testDir: "./tests/auth",
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
  },
});
