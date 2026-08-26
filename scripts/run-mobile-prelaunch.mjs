/**
 * Build → fresh Nitro/srvx preview → Playwright mobile prelaunch → shutdown.
 * Usage: node scripts/run-mobile-prelaunch.mjs
 *
 * Note: `vite preview` serves stale dist/client; production preview uses srvx + .vercel/output.
 */
import { spawn, execSync } from "node:child_process";
import net from "node:net";
import http from "node:http";
import path from "node:path";
import { loadEnvFiles } from "./load-env.mjs";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, ".vercel", "output");
const STATIC_DIR = path.join(OUTPUT, "static");
const SERVER_ENTRY = path.join(OUTPUT, "functions", "__server.func", "index.mjs");

process.chdir(ROOT);

loadEnvFiles();

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function pickPort(start = 4173) {
  for (let port = start; port < start + 30; port++) {
    if (await portFree(port)) return port;
  }
  throw new Error("No free preview port in range");
}

function killProjectPreviewProcesses() {
  try {
    if (process.platform === "win32") {
      execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name=\'node.exe\'\\" | Where-Object { $_.CommandLine -match \'srvx\' -and $_.CommandLine -match \'vegapal-crypto-pay\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"',
        { stdio: "ignore" },
      );
    } else {
      execSync("pkill -f 'srvx.*vegapal-crypto-pay' || true", { stdio: "ignore" });
    }
  } catch {
    /* ignore */
  }
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGTERM");
    }
  } catch {
    /* ignore */
  }
}

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const pids = new Set(
        out
          .split("\n")
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid) && pid !== "0"),
      );
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
        } catch {
          /* already gone */
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: "ignore" });
    }
  } catch {
    /* nothing listening */
  }
}

async function clearStalePreviewPorts(start = 4173, end = 4192) {
  killProjectPreviewProcesses();
  for (let port = start; port <= end; port++) {
    killPort(port);
  }
  await new Promise((r) => setTimeout(r, 1200));
}

function freshBuildMarkers() {
  const assetsDir = path.join(STATIC_DIR, "assets");
  if (!existsSync(SERVER_ENTRY) || !existsSync(assetsDir)) {
    throw new Error("Build output missing — run npm run build first.");
  }
  const landing = readdirSync(assetsDir).find((f) => /^landing-.*\.js$/.test(f));
  const index = readdirSync(assetsDir).find((f) => /^index-.*\.js$/.test(f));
  if (!landing || !index) {
    throw new Error("Expected landing/index bundles missing from build output.");
  }
  const landingText = readFileSync(path.join(assetsDir, landing), "utf8");
  if (!landingText.includes("3 documents per month")) {
    throw new Error("Fresh build marker missing: expected current Free plan copy.");
  }
  return { landing, index };
}

async function waitForHttpOk(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(Boolean(res.statusCode && res.statusCode < 500));
      });
      req.on("error", () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Preview health check failed: ${url}`);
}

async function waitForFreshPreview(url, markers, timeoutMs = 90_000) {
  await waitForHttpOk(`${url}/api/health`, timeoutMs);

  const landingAssetUrl = `${url}/assets/${markers.landing}`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const homepageOk = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (c) => {
            body += c;
          });
          res.on("end", () => {
            const hasBundle =
              body.includes(markers.index) ||
              body.includes(markers.landing) ||
              body.includes("/assets/index-") ||
              body.includes("/assets/landing-");
            resolve(
              res.statusCode === 200 &&
                hasBundle &&
                body.includes("3 documents per month") &&
                !body.includes("5 invoices / month"),
            );
          });
        });
        req.on("error", () => resolve(false));
        req.setTimeout(8000, () => {
          req.destroy();
          resolve(false);
        });
      });

      const assetOk = await new Promise((resolve) => {
        const req = http.get(landingAssetUrl, (res) => {
          res.resume();
          resolve(res.statusCode === 200);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
        });
      });

      if (homepageOk && assetOk) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new Error(`Preview not serving fresh build at ${url} (expected ${markers.index}).`);
}

async function main() {
  loadEnvFiles();

  console.log("\n=== mobile prelaunch: clear stale preview ports ===");
  await clearStalePreviewPorts();

  console.log("\n=== mobile prelaunch: build ===");
  await run("npm", ["run", "build"]);
  const markers = freshBuildMarkers();
  console.log(`Fresh build markers: index=${markers.index}, landing=${markers.landing}`);

  const port = await pickPort(4173);
  const baseURL = `http://127.0.0.1:${port}`;
  console.log(`\n=== mobile prelaunch: srvx preview on ${baseURL} ===`);

  const preview = spawn(
    "npx",
    [
      "srvx",
      "serve",
      `--static=${STATIC_DIR}`,
      `--port=${port}`,
      "--host=127.0.0.1",
      SERVER_ENTRY,
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    },
  );

  let previewLog = "";
  preview.stdout?.on("data", (c) => {
    previewLog += c.toString();
  });
  preview.stderr?.on("data", (c) => {
    previewLog += c.toString();
  });

  const shutdown = () => {
    killProcessTree(preview.pid);
    killPort(port);
    killProjectPreviewProcesses();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForFreshPreview(baseURL, markers);
    console.log("\n=== mobile prelaunch: playwright ===");
    await run("npx", ["playwright", "test", "-c", "playwright.mobile-prelaunch.config.ts"], {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL,
    });

    console.log("\nPASS  mobile prelaunch gate");
  } catch (err) {
    console.error("\nFAIL  mobile prelaunch gate");
    if (previewLog) console.error(previewLog.slice(-2000));
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    shutdown();
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
