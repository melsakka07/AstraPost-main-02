import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { twoFactor } from "better-auth/plugins"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "./db"
import { generateReferralCode } from "./referral/utils";
import { user as userTable } from "./schema"
import { encryptToken, isEncryptedToken } from "./security/token-encryption";
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
    account: {
      // Encrypt OAuth tokens before BetterAuth persists them to the database.
      // This ensures `account.accessToken` and `account.refreshToken` are never
      // stored in plaintext. The `isEncryptedToken()` guard is idempotent —
      // already-encrypted values are not double-encrypted.
      create: {
        before: async (data) => {
          return {
            data: {
              ...data,
              accessToken:
                data.accessToken && !isEncryptedToken(data.accessToken)
                  ? encryptToken(data.accessToken)
                  : data.accessToken,
              refreshToken:
                data.refreshToken && !isEncryptedToken(data.refreshToken)
                  ? encryptToken(data.refreshToken)
                  : data.refreshToken,
            },
          };
        },
      },
      update: {
        before: async (data) => {
          return {
            data: {
              ...data,
              ...(data.accessToken && !isEncryptedToken(data.accessToken)
                ? { accessToken: encryptToken(data.accessToken) }
                : {}),
              ...(data.refreshToken && !isEncryptedToken(data.refreshToken)
                ? { refreshToken: encryptToken(data.refreshToken) }
                : {}),
            },
          };
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
        "media.write", // Required for v2 media upload endpoints
      ],
    },
  },
})
