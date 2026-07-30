import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual-invoice",
  timeout: 120_000,
  workers: 1,
  use: {
    viewport: { width: 794, height: 1123 },
  },
});
