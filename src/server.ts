import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeadersTo } from "./lib/security-headers";
import { handleTurnstileVerifyRequest } from "./lib/turnstile/verify.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function applySecurityHeaders(response: Response): Promise<Response> {
  const headers = new Headers(response.headers);
  applySecurityHeadersTo(headers);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/turnstile/verify") {
        const response = await handleTurnstileVerifyRequest(request);
        return await applySecurityHeaders(response);
      }

      if (url.pathname === "/api/health") {
        const { handleHealthCheckRequest } = await import("@/lib/health/health-check.server");
        const response = await handleHealthCheckRequest();
        return await applySecurityHeaders(response);
      }

      if (url.pathname.startsWith("/api/admin")) {
        const { handleAdminApiRequest } = await import("@/lib/admin/admin-api.server");
        const response = await handleAdminApiRequest(request);
        return await applySecurityHeaders(response);
      }

      if (url.pathname.startsWith("/api/auth")) {
        const { handleAuthApiRequest } = await import("@/lib/auth/auth-api.server");
        const response = await handleAuthApiRequest(request);
        return await applySecurityHeaders(response);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return await applySecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      const pathname = new URL(request.url).pathname;
      if (pathname.startsWith("/api/")) {
        const apiHeaders = new Headers({
          "content-type": "application/json; charset=utf-8",
        });
        applySecurityHeadersTo(apiHeaders);
        return new Response(
          JSON.stringify({ error: "Internal server error", code: "internal_error" }),
          { status: 500, headers: apiHeaders },
        );
      }
      const errorHeaders = new Headers({
        "content-type": "text/html; charset=utf-8",
      });
      applySecurityHeadersTo(errorHeaders);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: errorHeaders,
      });
    }
  },
};
