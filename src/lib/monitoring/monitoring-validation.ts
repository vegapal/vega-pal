import { getPublicSitemapPaths } from "@/lib/seo/sitemap-urls";
import type { MonitoringVisit } from "./monitoring-types";

export const MONITORING_MAX_BODY_BYTES = 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_PATHS = new Set(getPublicSitemapPaths());

export class MonitoringRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "MonitoringRequestError";
  }
}

export function isMonitoringUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function objectWithKeys(value: unknown, keys: string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function parseMonitoringVisit(value: unknown): MonitoringVisit {
  if (!objectWithKeys(value, ["visitorId", "sessionId", "path", "source"])) {
    throw new MonitoringRequestError(400, "Invalid visit.");
  }
  if (!isMonitoringUuid(value.visitorId) || !isMonitoringUuid(value.sessionId)) {
    throw new MonitoringRequestError(400, "Invalid visit identifiers.");
  }
  if (typeof value.path !== "string" || value.path.length > 160 || !/^\/[a-z0-9/-]*$/.test(value.path)) {
    throw new MonitoringRequestError(400, "Invalid public path.");
  }
  const path = value.path.length > 1 ? value.path.replace(/\/+$/, "") : value.path;
  if (!PUBLIC_PATHS.has(path)) throw new MonitoringRequestError(400, "Invalid public path.");
  if (value.source !== "direct" && value.source !== "search" && value.source !== "referral") {
    throw new MonitoringRequestError(400, "Invalid visit source.");
  }
  return {
    visitorId: value.visitorId.toLowerCase(),
    sessionId: value.sessionId.toLowerCase(),
    path,
    source: value.source,
  };
}

export function parseNotificationRead(value: unknown): string {
  if (!objectWithKeys(value, ["id"]) || !isMonitoringUuid(value.id)) {
    throw new MonitoringRequestError(400, "Invalid notification.");
  }
  return value.id.toLowerCase();
}

/** Browsers supply Origin on same-origin JSON POSTs; no cross-origin ingestion. */
export function requireMonitoringSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new MonitoringRequestError(403, "Same-origin request required.");
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new MonitoringRequestError(403, "Same-origin request required.");
  }
}

/** Stream the body with a hard limit, including requests without Content-Length. */
export async function readMonitoringJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") throw new MonitoringRequestError(415, "JSON required.");
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding !== "identity") throw new MonitoringRequestError(415, "Unsupported encoding.");
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MONITORING_MAX_BODY_BYTES)) {
    throw new MonitoringRequestError(413, "Request too large.");
  }
  if (!request.body) throw new MonitoringRequestError(400, "Invalid JSON.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MONITORING_MAX_BODY_BYTES) {
        await reader.cancel();
        throw new MonitoringRequestError(413, "Request too large.");
      }
      chunks.push(next.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    if (error instanceof MonitoringRequestError) throw error;
    throw new MonitoringRequestError(400, "Invalid JSON.");
  } finally {
    reader.releaseLock();
  }
}
