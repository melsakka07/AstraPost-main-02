import "dotenv/config";
import { db } from "../src/lib/db";
import { user, xAccounts } from "../src/lib/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function linkMockAccount() {
  const email = "test3@example.com";
  console.log(`Linking mock X account for ${email}...`);

  const foundUser = await db.query.user.findFirst({
    where: eq(user.email, email),
  });

  if (!foundUser) {
    console.error("User not found!");
    return;
  }

  await db.insert(xAccounts).values({
    id: nanoid(),
    userId: foundUser.id,
    xUserId: "mock_x_id_" + nanoid(),
    xUsername: "test_user_3_x",
    xDisplayName: "Test User 3 X",
    accessTokenEnc: "mock_token",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("✅ Mock X account linked!");
}

linkMockAccount();
