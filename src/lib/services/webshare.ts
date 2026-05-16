import "server-only";

import { logger } from "@/lib/logger";

interface WebshareProxy {
  username: string;
  password: string;
  proxy_address: string;
  port: number;
  valid: boolean;
}

/**
 * Fetch a random valid proxy from Webshare's proxy-list API.
 *
 * Returns a fully-formed proxy URL (http://user:pass@host:port) or null on any failure.
 * Never throws — caller falls through to the next proxy-resolution step on null.
 *
 * API docs: https://apidocs.webshare.io/proxy-list
 */
export async function fetchWebshareProxy(): Promise<string | null> {
  const apiKey = process.env.API_KEY_WEBSHARE;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      "https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page_size=25&valid=true",
      {
        headers: { Authorization: `Token ${apiKey}` },
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) {
      logger.warn("webshare_api_non_ok", { status: res.status });
      return null;
    }
    const data = (await res.json()) as { results?: WebshareProxy[] };
    const valid = (data.results ?? []).filter((p) => p.valid);
    if (valid.length === 0) {
      logger.warn("webshare_no_valid_proxies", { totalReturned: data.results?.length ?? 0 });
      return null;
    }
    const chosen = valid[Math.floor(Math.random() * valid.length)]!;
    const user = encodeURIComponent(chosen.username);
    const pass = encodeURIComponent(chosen.password);
    const url = `http://${user}:${pass}@${chosen.proxy_address}:${chosen.port}`;
    logger.info("webshare_proxy_selected", {
      proxyAddress: chosen.proxy_address,
      port: chosen.port,
      poolSize: valid.length,
    });
    return url;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("webshare_api_error", { error: message });
    return null;
  }
}
