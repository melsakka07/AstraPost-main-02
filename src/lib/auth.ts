import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { db } from "./db"
import { user as userTable } from "./schema"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Set trial period (14 days)
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 14);
          
          await db.update(userTable)
            .set({ trialEndsAt })
            .where(eq(userTable.id, user.id));
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Log password reset URL to terminal (no email integration yet)
      // eslint-disable-next-line no-console
      console.log(`\n${"=".repeat(60)}\nPASSWORD RESET REQUEST\nUser: ${user.email}\nReset URL: ${url}\n${"=".repeat(60)}\n`)
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Log verification URL to terminal (no email integration yet)
      // eslint-disable-next-line no-console
    console.log(`\n${"=".repeat(60)}\nEMAIL VERIFICATION\nUser: ${user.email}\nVerification URL: ${url}\n${"=".repeat(60)}\n`)
    },
  },
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
      ],
    },
  },
})
