import { db } from "../src/lib/db";
import { desc } from "drizzle-orm";
import { xAccounts } from "../src/lib/schema";
import { config } from "dotenv";

config();

async function main() {
  const accounts = await db.query.xAccounts.findMany({
    orderBy: [desc(xAccounts.createdAt)]
  });

  console.log("\n=== All X Accounts in Database ===");
  if (accounts.length === 0) {
    console.log("No accounts found.");
  } else {
    accounts.forEach((acc, i) => {
      console.log(`\nAccount ${i + 1}:`);
      console.log("  Username:", acc.xUsername);
      console.log("  Display Name:", acc.xDisplayName || "N/A");
      console.log("  Is Active:", acc.isActive);
      console.log("  Created At:", acc.createdAt);
      console.log("  Token Expires At:", acc.tokenExpiresAt);
      console.log("  Has Access Token:", !!acc.accessToken);
      console.log("  Has Refresh Token:", !!acc.refreshTokenEnc);
    });
  }

  process.exit(0);
}

main();
