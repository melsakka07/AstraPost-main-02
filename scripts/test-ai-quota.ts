import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { tryConsumeAiQuota } from "@/lib/services/ai-quota-atomic";

// Manual smoke test for the atomic AI text-quota counter (`userAiCounters`).
// Enforcement moved off the old row-count gate (`checkAiQuotaDetailed`, removed)
// to `tryConsumeAiQuota` — this exercises the real path. Free plan = 20 gens/mo.
async function main() {
  console.log("Testing AI Quota (atomic counter)...");

  const userId = "test-ai-quota-" + Date.now();
  await db.insert(user).values({
    id: userId,
    name: "AI Quota User",
    email: `ai-quota-${Date.now()}@example.com`,
    plan: "free",
    emailVerified: true,
  });
  console.log(`Created Free User: ${userId} (free limit = 20 AI gens/mo)`);

  try {
    // Consume up to the free limit; the 21st consume must be rejected.
    for (let i = 1; i <= 21; i++) {
      const res = await tryConsumeAiQuota(userId, 1);
      if (i <= 20 && !res.allowed) {
        throw new Error(`Consume #${i} should be allowed (free=20), got blocked`);
      }
      if (i === 21 && res.allowed) {
        throw new Error("Consume #21 should be blocked (free=20), but was allowed");
      }
      if (i === 20 || i === 21) {
        console.log(`Consume #${i}: allowed=${res.allowed} used=${res.used}/${res.limit}`);
      }
    }
    console.log("21st consume blocked as expected ✓");
  } finally {
    // Cleanup (userAiCounters cascades on user delete via FK onDelete: cascade)
    await db.delete(user).where(eq(user.id, userId));
    console.log("Test Finished");
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
