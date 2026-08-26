/** Load .env then .env.local — local overrides base. Never log values. */
import { existsSync, readFileSync } from "node:fs";

export function loadEnvFiles() {
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m || line.trimStart().startsWith("#")) continue;
      const [, key, raw] = m;
      process.env[key] = raw.replace(/^["']|["']$/g, "").trim();
    }
  }
}
