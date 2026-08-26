import {
  getIndexNowKey,
  getIndexNowNotifySecret,
  submitIndexNowUrls,
} from "@/lib/seo/indexnow.server";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Serves the IndexNow key verification file and the optional notify endpoint.
 * Returns null when the request is not an IndexNow route, so the caller can
 * continue to normal SSR handling.
 */
export async function handleIndexNowRequest(request: Request, url: URL): Promise<Response | null> {
  const key = getIndexNowKey();

  if (key && url.pathname === `/${key}.txt`) {
    return new Response(key, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  if (url.pathname !== "/api/indexnow/notify") return null;

  const secret = getIndexNowNotifySecret();
  // Endpoint does not exist unless a secret is configured.
  if (!secret || !key) return null;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed", code: "method_not_allowed" }, 405);
  }

  if (request.headers.get("x-indexnow-secret") !== secret) {
    return json({ error: "Not found", code: "not_found" }, 404);
  }

  let urls: string[] = [];
  try {
    const body = (await request.json()) as { urls?: unknown };
    if (Array.isArray(body?.urls)) {
      urls = body.urls.filter((value): value is string => typeof value === "string");
    }
  } catch {
    return json({ error: "Invalid JSON body", code: "invalid_body" }, 400);
  }

  if (urls.length === 0) {
    return json({ error: "urls must be a non-empty array", code: "invalid_body" }, 400);
  }

  const result = await submitIndexNowUrls(urls);
  return json(result, result.ok ? 200 : 502);
}
