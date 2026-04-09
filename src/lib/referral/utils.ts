import { eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);

export async function generateReferralCode(name: string): Promise<string> {
  // Base code on name (e.g. ALEX)
  const firstName = (name || "USER").split(" ")[0] ?? "USER";
  const base = firstName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .substring(0, 4);
  let code = `${base}${nanoid(4)}`;

  // Ensure uniqueness
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
    columns: {
      id: true,
      name: true,
    },
  });

  return referrer;
}
