import { db } from "../src/lib/db";
import { desc, eq } from "drizzle-orm";
import { xAccounts } from "../src/lib/schema";
import { decryptToken } from "../src/lib/security/token-encryption";
import { config } from "dotenv";

config();

async function main() {
  // Get the most recently created active account
  const accounts = await db.query.xAccounts.findMany({
    where: eq(xAccounts.isActive, true),
    orderBy: [desc(xAccounts.createdAt)],
    limit: 1,
  });

  if (accounts.length > 0 && accounts[0]) {
    const acc = accounts[0];
    const now = new Date();
    const expiresAt = acc.tokenExpiresAt;

    console.log("\n=== Most Recent X Account ===");
    console.log("Username:", acc.xUsername);
    console.log("X Display Name:", acc.xDisplayName || "N/A");
    console.log("Created At:", acc.createdAt);
    console.log("Token Expires At:", expiresAt);
    console.log("Current Time:", now.toISOString());
    console.log("Token Status:", expiresAt && expiresAt > now ? "✅ VALID" : "❌ EXPIRED");
    console.log("");

    const accessToken = acc.accessToken ? decryptToken(acc.accessToken) : "";

    const refreshToken = acc.refreshTokenEnc ? decryptToken(acc.refreshTokenEnc) : "";

    console.log("\n=== Add these to your .env ===");
    console.log("TWITTER_TEST_ACCESS_TOKEN=" + accessToken);
    if (refreshToken) {
      console.log("TWITTER_TEST_REFRESH_TOKEN=" + refreshToken);
    }
  } else {
    console.log("\n⚠️  No active X accounts found.");
  }

  process.exit(0);
}

main();
