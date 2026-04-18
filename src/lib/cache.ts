import { connection as redis } from "@/lib/queue/client";

export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Cache miss — fetch and store
  const data = await fetcher();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    const data = await redis.get(key);
    return data ? (JSON.parse(data) as T) : null;
  },
  set: async (key: string, value: unknown, ttlSeconds: number = 300) => {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },
  delete: async (key: string) => {
    await redis.del(key);
  },
  deletePattern: async (pattern: string) => {
    // Note: keys() is generally discouraged in production for large datasets,
    // but since this is targeted invalidation, we can use scan if needed.
    // To be safe with potential large number of keys, we use a stream/scan approach.
    let cursor = "0";
    do {
      const result = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  },
};
