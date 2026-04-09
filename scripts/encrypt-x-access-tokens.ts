import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, dbClient } from "@/lib/db";
import { xAccounts } from "@/lib/schema";
import { encryptToken } from "@/lib/security/token-encryption";

async function main() {
  const accounts = await db.query.xAccounts.findMany({
    where: sql<boolean>`true`,
  });

  let encrypted = 0;
  for (const a of accounts) {
    if (!a.accessToken) continue;
    if (a.accessToken.startsWith("v1:")) continue;
    const next = encryptToken(a.accessToken);
    await db.update(xAccounts).set({ accessToken: next }).where(eq(xAccounts.id, a.id));
    encrypted++;
  }

  console.log(JSON.stringify({ encrypted }));
  await dbClient.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
