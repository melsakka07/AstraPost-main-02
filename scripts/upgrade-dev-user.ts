/**
 * One-time script to upgrade a dev user's plan.
 * Usage: node --require dotenv/config --import tsx scripts/upgrade-dev-user.ts <userId>
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { user } from "../src/lib/schema";

const userId: string | undefined = process.argv[2];

if (!userId) {
  console.error("Usage: node --require dotenv/config --import tsx scripts/upgrade-dev-user.ts <userId>");
  process.exit(1);
}

const safeUserId: string = userId;

async function main() {
  const existing = await db.query.user.findFirst({
    where: eq(user.id, safeUserId),
    columns: { id: true, email: true, plan: true },
  });

  if (!existing) {
    console.error(`❌ User not found: ${safeUserId}`);
    process.exit(1);
  }

  console.log(`Found user: ${existing.email} (current plan: ${existing.plan ?? "free"})`);

  await db.update(user).set({ plan: "pro_monthly" }).where(eq(user.id, safeUserId));

  console.log("✅ User upgraded to pro_monthly");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
