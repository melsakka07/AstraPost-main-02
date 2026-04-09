import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { checkRateLimit, redis, RATE_LIMITS } from "@/lib/rate-limiter";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Testing Rate Limiter...");

  // 1. Setup User
  const userId = "test-rate-limit-" + Date.now();
  await db.insert(user).values({
    id: userId,
    name: "Rate Limit User",
    email: `rate-limit-${Date.now()}@example.com`,
    plan: "free",
    emailVerified: true,
  });

  console.log(`Created User: ${userId}`);

  // Clear Redis for this user
  await redis.del(`ratelimit:posts:${userId}`);

  // 2. Consume Limit
  const limit = RATE_LIMITS.free.posts.limit;
  console.log(`Limit is ${limit}. Consuming...`);

  for (let i = 0; i < limit; i++) {
    const res = await checkRateLimit(userId, "free", "posts");
    if (!res.success) throw new Error(`Failed prematurely at ${i}`);
  }

  // 3. Exceed Limit
  const exceedRes = await checkRateLimit(userId, "free", "posts");
  console.log(`Exceed Result: success=${exceedRes.success}, remaining=${exceedRes.remaining}`);

  if (exceedRes.success) throw new Error("Should have been rate limited");

  // 4. Upgrade User
  console.log("Upgrading to Pro...");
  // Note: checkRateLimit takes plan string, we simulate passing "pro_monthly"

  // Clear Redis key? No, pro limit is higher, so it should just work on the same key if we use same key logic?
  // Our key is `ratelimit:posts:${userId}`. It stores the count.
  // Free limit 100. Count is 101.
  // Pro limit 500.
  // If we pass "pro_monthly", config.limit becomes 500. 101 <= 500 is true.

  const proRes = await checkRateLimit(userId, "pro_monthly", "posts");
  console.log(`Pro Result: success=${proRes.success}, remaining=${proRes.remaining}`);

  if (!proRes.success) throw new Error("Pro user should have higher limit");

  // Clean up
  await db.delete(user).where(eq(user.id, userId));
  await redis.del(`ratelimit:posts:${userId}`);

  console.log("Test Passed!");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
