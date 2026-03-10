
import { db } from "@/lib/db";
import { user, aiGenerations } from "@/lib/schema";
import { checkAiQuota } from "@/lib/services/ai-quota";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Testing AI Quota...");

  // 1. Create a Free User
  const freeUserId = "test-ai-quota-" + Date.now();
  await db.insert(user).values({
    id: freeUserId,
    name: "AI Quota User",
    email: `ai-quota-${Date.now()}@example.com`,
    plan: "free",
    emailVerified: true,
  });

  console.log(`Created Free User: ${freeUserId}`);

  // 2. Check Quota (Should be false, because free plan has 0 limit in current config)
  // Wait, current plan-limits.ts:
  // free: { postsPerMonth: 10, aiGenerationsPerMonth: 0, ... }
  // So checkAiQuota should return false immediately if limit is 0.
  
  let hasQuota = await checkAiQuota(freeUserId);
  console.log(`Free User Has Quota (0 usage): ${hasQuota} (Expected: false)`);
  if (hasQuota) throw new Error("Free user should NOT have AI quota (limit is 0)");

  // 3. Temporarily update user to pro
  await db.update(user).set({ plan: "pro_monthly" }).where(eq(user.id, freeUserId));
  console.log("Upgraded to Pro");

  hasQuota = await checkAiQuota(freeUserId);
  console.log(`Pro User Has Quota: ${hasQuota} (Expected: true)`);
  if (!hasQuota) throw new Error("Pro user SHOULD have quota");

  // 4. Record Usage
  console.log("Recording usage...");
  await db.insert(aiGenerations).values({
      id: crypto.randomUUID(),
      userId: freeUserId,
      type: "test",
      inputPrompt: "test",
      outputContent: {},
      tokensUsed: 100,
  });

  // 5. Downgrade to Free
  await db.update(user).set({ plan: "free" }).where(eq(user.id, freeUserId));
  console.log("Downgraded to Free");
  
  hasQuota = await checkAiQuota(freeUserId);
  console.log(`Free User Has Quota (1 usage): ${hasQuota} (Expected: false)`);
  if (hasQuota) throw new Error("Free user should NOT have quota");

  // Clean up
  await db.delete(user).where(eq(user.id, freeUserId));
  await db.delete(aiGenerations).where(eq(aiGenerations.userId, freeUserId));
  console.log("Test Finished");
}

main().catch(console.error).finally(() => process.exit(0));
