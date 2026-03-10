
import { db } from "@/lib/db";
import { user, posts, xAccounts } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Testing Onboarding Flow...");

  // 1. Create a User
  const userId = "test-onboarding-" + Date.now();
  await db.insert(user).values({
    id: userId,
    name: "Onboarding User",
    email: `onboarding-${Date.now()}@example.com`,
    plan: "free",
    emailVerified: true,
    onboardingCompleted: false
  });

  console.log(`Created User: ${userId}`);

  // 2. Simulate Step 1: Check accounts (Add mock account)
  const xAccountId = "x-" + userId;
  await db.insert(xAccounts).values({
    id: xAccountId,
    userId: userId,
    xUserId: "mock-x-id",
    xUsername: "mock_user",
    accessToken: "mock-token",
    isActive: true
  });
  console.log("Added mock X account");

  // 3. Simulate Step 2: Create Draft
  // Call logic equivalent to POST /api/posts
  const postId = "post-" + userId;
  await db.insert(posts).values({
    id: postId,
    userId: userId,
    xAccountId: xAccountId,
    status: "draft",
    type: "tweet"
  });
  console.log(`Created Draft Post: ${postId}`);

  // 4. Simulate Step 3: Schedule Post
  // Call logic equivalent to PATCH /api/posts/[id]
  const scheduledAt = new Date();
  scheduledAt.setHours(scheduledAt.getHours() + 24);
  
  await db.update(posts)
    .set({ 
        status: "scheduled",
        scheduledAt: scheduledAt
    })
    .where(eq(posts.id, postId));
    
  console.log("Scheduled Post");

  // 5. Simulate Step 4: Complete Onboarding
  await db.update(user)
    .set({ onboardingCompleted: true })
    .where(eq(user.id, userId));
    
  console.log("Completed Onboarding");

  // 6. Verification
  const updatedUser = await db.query.user.findFirst({
      where: eq(user.id, userId)
  });
  
  if (!updatedUser?.onboardingCompleted) throw new Error("Onboarding not marked completed");
  
  const updatedPost = await db.query.posts.findFirst({
      where: eq(posts.id, postId)
  });
  
  if (updatedPost?.status !== "scheduled") throw new Error("Post not scheduled");

  // Clean up
  await db.delete(user).where(eq(user.id, userId));
  await db.delete(xAccounts).where(eq(xAccounts.userId, userId)); // Cascade should handle post
  
  console.log("Test Passed!");
}

main().catch(console.error).finally(() => process.exit(0));
