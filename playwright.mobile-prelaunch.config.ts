import { defineConfig, devices } from "@playwright/test";
import { loadEnvFiles } from "./scripts/load-env.mjs";

loadEnvFiles();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/prelaunch",
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never", outputFolder: "tmp/prelaunch-mobile/report" }]],
  outputDir: "tmp/prelaunch-mobile/results",
  use: {
    baseURL,
    browserName: "chromium",
    ...devices["Pixel 5"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile-375", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "mobile-430", use: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true } },
  ],
});
