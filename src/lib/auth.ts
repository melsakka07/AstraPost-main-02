import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "./db"
import { generateReferralCode } from "./referral/utils";
import { user as userTable } from "./schema"
import { sendResetPasswordEmail, sendVerificationEmail } from "./services/email"


export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 14);
          
          const referralCode = await generateReferralCode(user.name);

          await db.update(userTable)
            .set({ 
              trialEndsAt,
              referralCode 
            })
            .where(and(eq(userTable.id, user.id), isNull(userTable.trialEndsAt)));
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url, user.name);
    },
  },
  plugins: [
    twoFactor({
      issuer: "AstraPost",
    }),
  ],
  socialProviders: {
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      scope: [
        "tweet.read",
        "tweet.write",
        "users.read",
        "offline.access",
        "users.email",
        "media.write", // Required for v2 media upload endpoints
      ],
    },
  },
})
