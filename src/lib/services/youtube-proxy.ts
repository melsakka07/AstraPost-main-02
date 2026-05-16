import "server-only";

import { ProxyAgent, fetch as undiciFetch } from "undici";
import { logger } from "@/lib/logger";
import { connection as redis } from "@/lib/queue/client";
import { fetchWebshareProxy } from "@/lib/services/webshare";

const REDIS_KEY_ACTIVE = "youtube:proxy:active";
const REDIS_KEY_LOCK = "youtube:proxy:lock";
const REDIS_TTL_SECS = 3600;
const LOCK_TTL_SECS = 10;
const IN_MEMORY_TTL_MS = 60_000;

type ProxiedFetch = (url: string, init?: RequestInit) => Promise<Response>;

interface CachedProxy {
  url: string | null;
  fetchFn: ProxiedFetch;
  fetchedAt: number;
}

let _cached: CachedProxy | undefined;

function buildFetchFn(proxyUrl: string | null): ProxiedFetch {
  if (!proxyUrl) return globalThis.fetch.bind(globalThis);
  const agent = new ProxyAgent({ uri: proxyUrl });
  return (url, init) => {
    const opts = { ...(init ?? {}), dispatcher: agent } as Record<string, unknown>;
    return undiciFetch(
      url,
      opts as Parameters<typeof undiciFetch>[1]
    ) as unknown as Promise<Response>;
  };
}

function maskProxyUrl(url: string): string {
  return url.replace(/\/\/.*@/, "//<creds>@");
}

async function resolveProxyUrl(): Promise<{ url: string | null; source: string }> {
  // Redis is optional here — if it's down (local dev) we silently skip cache/lock and resolve fresh each time.
  const cached = await redis.get(REDIS_KEY_ACTIVE).catch(() => null);
  if (cached) return { url: cached, source: "redis_cache" };

  if (process.env.API_KEY_WEBSHARE) {
    const lockResult = await redis
      .set(REDIS_KEY_LOCK, "1", "EX", LOCK_TTL_SECS, "NX")
      .catch(() => null);
    if (lockResult === "OK") {
      try {
        const fresh = await fetchWebshareProxy();
        if (fresh) {
          await redis.set(REDIS_KEY_ACTIVE, fresh, "EX", REDIS_TTL_SECS).catch(() => undefined);
          return { url: fresh, source: "webshare_api" };
        }
      } finally {
        await redis.del(REDIS_KEY_LOCK).catch(() => undefined);
      }
    } else if (lockResult !== null) {
      // Lost the race — wait briefly then re-read.
      await new Promise((r) => setTimeout(r, 500));
      const afterWait = await redis.get(REDIS_KEY_ACTIVE).catch(() => null);
      if (afterWait) return { url: afterWait, source: "redis_cache_after_wait" };
    } else {
      // Redis unavailable — fetch directly without coordination.
      const fresh = await fetchWebshareProxy();
      if (fresh) return { url: fresh, source: "webshare_api_no_redis" };
    }
  }

  const staticUrl = process.env.YOUTUBE_PROXY_URL;
  if (staticUrl) return { url: staticUrl, source: "static_env" };

  return { url: null, source: "none" };
}

export async function getProxiedFetch(): Promise<ProxiedFetch> {
  if (_cached && Date.now() - _cached.fetchedAt < IN_MEMORY_TTL_MS) {
    return _cached.fetchFn;
  }
  const { url, source } = await resolveProxyUrl();
  _cached = { url, fetchFn: buildFetchFn(url), fetchedAt: Date.now() };
  logger.info("youtube_proxy_resolved", {
    source,
    proxyUrl: url ? maskProxyUrl(url) : null,
  });
  return _cached.fetchFn;
}

export async function invalidateActiveProxy(reason: string): Promise<void> {
  _cached = undefined;
  await redis.del(REDIS_KEY_ACTIVE).catch(() => undefined);
  logger.warn("youtube_proxy_invalidated", { reason });
}

/**
 * Inspect the currently-cached proxy for ops/admin endpoints.
 * Returns masked URL + remaining TTL. Does not trigger a refresh.
 */
export async function getActiveProxyStatus(): Promise<{
  activeProxy: string | null;
  source: "redis" | "static_env" | "none";
  remainingTtlSecs: number;
}> {
  const cached = await redis.get(REDIS_KEY_ACTIVE).catch(() => null);
  if (cached) {
    const ttl = await redis.ttl(REDIS_KEY_ACTIVE).catch(() => -1);
    return {
      activeProxy: maskProxyUrl(cached),
      source: "redis",
      remainingTtlSecs: ttl >= 0 ? ttl : 0,
    };
  }
  const staticUrl = process.env.YOUTUBE_PROXY_URL;
  if (staticUrl) {
    return { activeProxy: maskProxyUrl(staticUrl), source: "static_env", remainingTtlSecs: -1 };
  }
  return { activeProxy: null, source: "none", remainingTtlSecs: 0 };
}
