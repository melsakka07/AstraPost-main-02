import { describe, it, expect, vi, beforeEach } from "vitest";
import { connection as redis } from "@/lib/queue/client";
import { cachedQuery, cache } from "../cache";

vi.mock("@/lib/queue/client", () => {
  const store = new Map<string, string>();
  return {
    connection: {
      get: vi.fn(async (key: string) => store.get(key) || null),
      setex: vi.fn(async (key: string, _ttl: number, value: string) => {
        store.set(key, value);
        return "OK";
      }),
      del: vi.fn(async (...keys: string[]) => {
        for (const key of keys) store.delete(key);
        return keys.length;
      }),
      scan: vi.fn(async (_cursor: string, _match: string, pattern: string) => {
        const keys = Array.from(store.keys()).filter((k) => k.includes(pattern.replace("*", "")));
        return ["0", keys];
      }),
      _store: store,
    },
  };
});

describe("cache", () => {
  beforeEach(() => {
    (redis as any)._store.clear();
    vi.clearAllMocks();
  });

  it("stores and retrieves values", async () => {
    const result = await cachedQuery("test:key", () => Promise.resolve({ data: 123 }), 60);
    expect(result).toEqual({ data: 123 });
    expect(await redis.get("test:key")).toEqual(JSON.stringify({ data: 123 }));
  });

  it("returns cached value on second call", async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      return { data: 1 };
    };
    await cachedQuery("test:key2", fetcher, 60);
    await cachedQuery("test:key2", fetcher, 60);
    expect(callCount).toBe(1); // Only called once
  });

  it("invalidates with delete", async () => {
    await cachedQuery("test:key3", () => Promise.resolve({ data: 1 }), 60);
    await cache.delete("test:key3");
    let callCount = 0;
    await cachedQuery(
      "test:key3",
      async () => {
        callCount++;
        return { data: 2 };
      },
      60
    );
    expect(callCount).toBe(1); // Cache was cleared
  });
});
