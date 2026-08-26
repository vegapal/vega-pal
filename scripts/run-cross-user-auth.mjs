/**
 * Start srvx preview (if needed) → cross-user auth harness → shutdown.
 */
import { spawn, execSync } from "node:child_process";
import net from "node:net";
import http from "node:http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "./load-env.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATIC_DIR = path.join(ROOT, ".vercel", "output", "static");
const SERVER_ENTRY = path.join(ROOT, ".vercel", "output", "functions", "__server.func", "index.mjs");

process.chdir(ROOT);

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
  throw new Error("No free preview port");
}

function killPort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      for (const line of out.split("\n")) {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid) && pid !== "0") {
          try {
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
          } catch {
            /* gone */
          }
        }
      }
    }
  } catch {
    /* nothing */
  }
}

async function waitForHttp(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get(`${url}/api/health`, (res) => {
        res.resume();
        resolve(Boolean(res.statusCode && res.statusCode < 500));
      });
      req.on("error", () => resolve(false));
      req.setTimeout(3000, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Preview not ready: ${url}`);
}

function run(command, args, env) {
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
      else reject(new Error(`${command} exited ${code}`));
    });
  });
}

async function main() {
  loadEnvFiles();

  if (!existsSync(SERVER_ENTRY)) {
    console.log("=== cross-user: build ===");
    await run("npm", ["run", "build"], process.env);
  }

  killPort(4173);
  const port = await pickPort(4173);
  const baseURL = `http://127.0.0.1:${port}`;

  const preview = spawn(
    "npx",
    ["srvx", "serve", `--static=${STATIC_DIR}`, `--port=${port}`, "--host=127.0.0.1", SERVER_ENTRY],
    { cwd: process.cwd(), env: process.env, stdio: "ignore", shell: process.platform === "win32" },
  );

  const shutdown = () => {
    try {
      if (preview.pid) execSync(`taskkill /PID ${preview.pid} /T /F`, { stdio: "ignore" });
    } catch {
      /* ignore */
    }
    killPort(port);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForHttp(baseURL);
    await run("npx", ["tsx", "scripts/test-cross-user-auth.harness.ts"], {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL,
    });
    console.log("\nPASS  cross-user auth gate");
  } catch (err) {
    console.error("\nFAIL  cross-user auth gate");
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    shutdown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
