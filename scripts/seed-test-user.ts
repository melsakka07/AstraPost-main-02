import "dotenv/config";
import { db } from "../src/lib/db";
import { user, xAccounts } from "../src/lib/schema";
import { nanoid } from "nanoid";

async function createTestUser() {
  const email = "test@example.com";
  const password = "password123";
  const name = "Test User";

  console.log("Creating test user...");

  try {
    // 1. Create User (Using Better Auth structure, though normally handled by library)
    // We will use the API to register if possible, but for seeding we can insert directly if we hash the password.
    // Better Auth handles hashing. It's safer to use the signup function or a script that uses the auth client.
    // HOWEVER, since this is a script, we can't easily use the client side auth client.
    // We can insert a user and then you can "login" or we can try to use the backend auth to create.

    // Actually, the easiest way for a "test account" that works with "Sign In" is to just REGISTER it via the UI.
    // But if you want to bypass that and have data pre-filled:

    const userId = nanoid();

    // Insert User
    await db
      .insert(user)
      .values({
        id: userId,
        name,
        email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: true,
        plan: "pro_monthly", // Give them pro plan to test features
      })
      .onConflictDoNothing();

    console.log(`✅ User created: ${email}`);

    // 2. Insert Mock X Account (So you can test Dashboard/Compose without real OAuth)
    const xAccountId = nanoid();
    await db
      .insert(xAccounts)
      .values({
        id: xAccountId,
        userId: userId,
        xUserId: "123456789",
        xUsername: "test_twitter_user",
        xDisplayName: "Test Twitter User",
        xAvatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=test",
        accessToken: "mock_token",
        isActive: true,
        followersCount: 1500,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    console.log("✅ Mock X Account created");

    // 3. IMPORTANT: Password Login
    // Since we are inserting directly, we can't easily set the password hash that Better Auth expects without using its internal hashing.
    // ALTERNATIVE: You should just Register this user in the UI.
    // BUT, I will print the credentials you should use to REGISTER.

    console.log("\n---------------------------------------------------");
    console.log("⚠️  ACTION REQUIRED: ");
    console.log("Since password hashing is handled by the auth library, please:");
    console.log("1. Go to http://localhost:3000/register");
    console.log(`2. Sign up with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("3. The mock X account and Pro plan have been pre-seeded for this email!");
    console.log("---------------------------------------------------\n");
  } catch (error) {
    console.error("Error creating test data:", error);
  }
}

createTestUser();
