import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, dbClient } from "@/lib/db";
import { xAccounts } from "@/lib/schema";
import { decryptToken, encryptToken, isPrimaryKeyToken } from "@/lib/security/token-encryption";

async function main() {
  const accounts = await db.query.xAccounts.findMany({
    where: sql<boolean>`${xAccounts.refreshTokenEnc} IS NOT NULL OR ${xAccounts.accessTokenEnc} IS NOT NULL`,
  });

  let rotatedRefresh = 0;
  let rotatedAccess = 0;
  for (const a of accounts) {
    const refreshEnc = a.refreshTokenEnc;
    if (refreshEnc && !isPrimaryKeyToken(refreshEnc)) {
      const plain = decryptToken(refreshEnc);
      const next = encryptToken(plain);
      await db.update(xAccounts).set({ refreshTokenEnc: next }).where(eq(xAccounts.id, a.id));
      rotatedRefresh++;
    }

    const access = a.accessTokenEnc;
    if (access && access.startsWith("v1:") && !isPrimaryKeyToken(access)) {
      const plain = decryptToken(access);
      const next = encryptToken(plain);
      await db.update(xAccounts).set({ accessTokenEnc: next }).where(eq(xAccounts.id, a.id));
      rotatedAccess++;
    }
  }

  console.log(JSON.stringify({ rotatedRefresh, rotatedAccess }));

  await dbClient.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
