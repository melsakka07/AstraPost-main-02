import { eq, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

/** Credit amount awarded to the referrer when a referred user subscribes (in dollars). */
export const REFERRAL_CREDIT_AMOUNT = 5;

/** Trial extension in days for users who sign up with a referral code. */
export const REFERRAL_TRIAL_DAYS = 21;

export async function generateReferralCode(name: string): Promise<string> {
  const firstName = (name || "USER").split(" ")[0] ?? "USER";
  const base = firstName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 4);
  let code = `${base}${nanoid(4)}`;

  let exists = await db.query.user.findFirst({
    where: eq(user.referralCode, code),
  });

  while (exists) {
    code = `${base}${nanoid(4)}`;
    exists = await db.query.user.findFirst({
      where: eq(user.referralCode, code),
    });
  }

  return code;
}

export async function validateReferralCode(code: string) {
  const referrer = await db.query.user.findFirst({
    where: eq(user.referralCode, code),
    columns: { id: true, name: true },
  });

  return referrer;
}

export async function awardReferralCredit(
  userId: string
): Promise<{ credited: boolean; amount: number }> {
  // Perform the entire check + write inside a single transaction to prevent
  // double-credit on concurrent webhook retries.
  const result = await db.transaction(async (tx) => {
    // Lock the referred user row for the duration of the transaction
    const [referredUser] = await tx
      .select({ referredBy: user.referredBy, referralCreditedAt: user.referralCreditedAt })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!referredUser?.referredBy || referredUser.referralCreditedAt) {
      return { credited: false, amount: 0 };
    }

    // Atomically increment referrer's credits
    await tx
      .update(user)
      .set({ referralCredits: sql`referral_credits + ${REFERRAL_CREDIT_AMOUNT}` })
      .where(eq(user.id, referredUser.referredBy));

    // Mark as credited to prevent double-award
    await tx.update(user).set({ referralCreditedAt: new Date() }).where(eq(user.id, userId));

    return { credited: true, amount: REFERRAL_CREDIT_AMOUNT };
  });

  return result;
}
