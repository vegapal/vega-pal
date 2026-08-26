import { SITE_ORIGIN } from "@/lib/seo/site";
import {
  INDEXNOW_ENDPOINT,
  filterNotifiableUrls,
  indexNowKeyLocation,
  isValidIndexNowKey,
} from "@/lib/seo/indexnow";

export type IndexNowResult = {
  ok: boolean;
  status: number;
  body: string;
};

export function getIndexNowKey(): string | undefined {
  const key = process.env.INDEXNOW_KEY?.trim();
  return isValidIndexNowKey(key) ? key : undefined;
}

export function getIndexNowNotifySecret(): string | undefined {
  const secret = process.env.INDEXNOW_NOTIFY_SECRET?.trim();
  return secret ? secret : undefined;
}

/**
 * Submit public URLs to IndexNow (Bing, Yandex, Seznam and other participants).
 * Private routes are filtered out before the request is made.
 */
export async function submitIndexNowUrls(urls: string[]): Promise<IndexNowResult> {
  const key = getIndexNowKey();
  if (!key) {
    return { ok: false, status: 0, body: "INDEXNOW_KEY is not configured" };
  }

  const urlList = filterNotifiableUrls(urls);
  if (urlList.length === 0) {
    return { ok: false, status: 0, body: "No public URLs to submit" };
  }

  const payload = {
    host: new URL(SITE_ORIGIN).host,
    key,
    keyLocation: indexNowKeyLocation(key),
    urlList,
  };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : "IndexNow request failed",
    };
  }
}
