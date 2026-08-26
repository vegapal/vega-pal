import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Browser-level Remember-me persistence regression.
 *
 * Uses a synthetic Supabase-shaped session in localStorage + storageState to
 * prove the app's storage contract survives a new browser context.
 *
 * Full credential login against production is gated on E2E_EMAIL / E2E_PASSWORD.
 */

const AUTH_KEY_PREFIX = "sb-";
const AUTH_KEY_SUFFIX = "-auth-token";
const REMEMBER_KEY = "vegapal_remember_me";

function findAuthKey(storage: Record<string, string>): string | undefined {
  return Object.keys(storage).find(
    (k) => k.startsWith(AUTH_KEY_PREFIX) && k.endsWith(AUTH_KEY_SUFFIX),
  );
}

test.describe("Remember me persistence", () => {
  test("localStorage session survives new browser context (storage contract)", async ({
    browser,
    baseURL,
  }) => {
    const origin = baseURL ?? "http://127.0.0.1:4173";
    const projectRef = process.env.E2E_SUPABASE_REF ?? "rudqfhqawqmhclqmaflj";
    const authKey = `sb-${projectRef}-auth-token`;

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await pageA.addInitScript(
      ({ authKey, rememberKey }) => {
        localStorage.setItem(rememberKey, "1");
        localStorage.setItem(
          authKey,
          JSON.stringify({
            access_token: "e2e-access-token",
            refresh_token: "e2e-refresh-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: "bearer",
            user: { id: "e2e-user", email: "e2e@vegapal.test" },
          }),
        );
        // Ensure we are not depending on sessionStorage.
        sessionStorage.clear();
      },
      { authKey, rememberKey: REMEMBER_KEY },
    );

    await pageA.goto(origin + "/");
    const snapshotA = await pageA.evaluate(
      ({ authKey, rememberKey }) => ({
        remember: localStorage.getItem(rememberKey),
        hasLocalAuth: localStorage.getItem(authKey) != null,
        hasSessionAuth: sessionStorage.getItem(authKey) != null,
        hasRefresh: (() => {
          try {
            const raw = localStorage.getItem(authKey);
            if (!raw) return false;
            const parsed = JSON.parse(raw) as { refresh_token?: string };
            return typeof parsed.refresh_token === "string" && parsed.refresh_token.length > 0;
          } catch {
            return false;
          }
        })(),
      }),
      { authKey, rememberKey: REMEMBER_KEY },
    );

    expect(snapshotA.remember).toBe("1");
    expect(snapshotA.hasLocalAuth).toBe(true);
    expect(snapshotA.hasSessionAuth).toBe(false);
    expect(snapshotA.hasRefresh).toBe(true);

    const statePath = path.join("tmp", "auth-persist-state.json");
    fs.mkdirSync("tmp", { recursive: true });
    await contextA.storageState({ path: statePath });
    await contextA.close();

    // New context = new sessionStorage, persisted localStorage from storageState.
    const contextB = await browser.newContext({ storageState: statePath });
    const pageB = await contextB.newPage();
    await pageB.goto(origin + "/");
    const snapshotB = await pageB.evaluate(
      ({ authKey, rememberKey }) => ({
        remember: localStorage.getItem(rememberKey),
        hasLocalAuth: localStorage.getItem(authKey) != null,
        hasSessionAuth: sessionStorage.getItem(authKey) != null,
      }),
      { authKey, rememberKey: REMEMBER_KEY },
    );

    expect(snapshotB.remember).toBe("1");
    expect(snapshotB.hasLocalAuth).toBe(true);
    expect(snapshotB.hasSessionAuth).toBe(false);

    await contextB.close();
  });

  test("optional live login persistence", async ({ page, context, browser }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD for live login persistence");

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    const remember = page.getByRole("checkbox", { name: /remember/i });
    if (!(await remember.isChecked())) await remember.check();
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });

    const storage = await page.evaluate(() => {
      const out: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) out[k] = localStorage.getItem(k) ?? "";
      }
      return out;
    });
    const authKey = findAuthKey(storage);
    expect(authKey, "auth key in localStorage after remember-me login").toBeTruthy();
    expect(storage[REMEMBER_KEY]).toBe("1");

    const statePath = path.join("tmp", "auth-persist-live.json");
    fs.mkdirSync("tmp", { recursive: true });
    await context.storageState({ path: statePath });

    const context2 = await browser.newContext({ storageState: statePath });
    const page2 = await context2.newPage();
    await page2.goto("/dashboard");
    await expect(page2).not.toHaveURL(/login/, { timeout: 30_000 });
    await expect(page2.getByRole("link", { name: /overview|dashboard/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    // Explicit sign out then expect auth wall
    const signOut = page2.getByRole("button", { name: /sign out|log out/i }).first();
    if (await signOut.isVisible().catch(() => false)) {
      await signOut.click();
    } else {
      await page2.goto("/settings");
      await page2.getByRole("button", { name: /sign out|log out/i }).click();
    }
    await page2.goto("/dashboard");
    await expect(page2).toHaveURL(/login/, { timeout: 30_000 });
    await context2.close();
  });
});
