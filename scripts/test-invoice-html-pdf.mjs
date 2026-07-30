/**
 * HTML → PDF invoice integration tests (Playwright Chromium).
 */
import { spawnSync } from "node:child_process";

const harness = spawnSync("npx", ["--yes", "tsx", "scripts/test-invoice-html-pdf.harness.ts"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: true,
});

process.exit(harness.status ?? 1);
