import { db } from "../src/lib/db";
import { decryptToken } from "../src/lib/security/token-encryption";
import { config } from "dotenv";

// Load environment variables
config();

async function main() {
  try {
    const accounts = await db.query.xAccounts.findMany({
      where: (xAccounts, { eq }) => eq(xAccounts.isActive, true),
      limit: 1,
    });

    if (accounts.length > 0 && accounts[0]) {
      const acc = accounts[0];
      console.log("\n=== X Account Found ===");
      console.log("Username:", acc.xUsername);
      console.log("X Display Name:", acc.xDisplayName || "N/A");
      console.log("User ID:", acc.userId);
      console.log("X Account ID:", acc.id);
      console.log("Is Default:", acc.isDefault ?? false);
      console.log("Token Expires At:", acc.tokenExpiresAt);
      console.log("");

      let accessToken = acc.accessTokenEnc
        ? decryptToken(acc.accessTokenEnc)
        : "(check accessTokenEnc)";

      let refreshToken = acc.refreshTokenEnc ? decryptToken(acc.refreshTokenEnc) : "";

      console.log("\n=== Add these to your .env ===");
      console.log("TWITTER_TEST_ACCESS_TOKEN=" + accessToken);
      if (refreshToken) {
        console.log("TWITTER_TEST_REFRESH_TOKEN=" + refreshToken);
      }
    } else {
      console.log("\n⚠️  No active X accounts found.");
      console.log("Please connect your X account in the app first at /dashboard/settings");
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("connect")) {
      console.log("\n💡 Hint: Make sure PostgreSQL is running and POSTGRES_URL is correct in .env");
    }
  } finally {
    process.exit(0);
  }
}

main();
