import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { and, eq, isNull } from "drizzle-orm"
import { db } from "./db"
import { generateReferralCode } from "./referral/utils";
import { user as userTable } from "./schema"
import { decryptToken, encryptToken, isEncryptedToken } from "./security/token-encryption";


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
      language: {
        type: "string",
        required: false,
        defaultValue: "ar",
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
        after: async (account) => {
          if (account.providerId === "twitter" && account.accessToken) {
            try {
              const rawToken = isEncryptedToken(account.accessToken) 
                ? decryptToken(account.accessToken) 
                : account.accessToken;
                
              // Fetch user profile from X to populate xAccounts
              const { XApiService } = await import("./services/x-api");
              const svc = new XApiService(rawToken);
              const me = await svc.getUser();
              const profile = {
                username: (me as any)?.data?.username,
                name: (me as any)?.data?.name,
                profile_image_url: (me as any)?.data?.profile_image_url,
              };

              const { xAccounts } = await import("./schema");
              
              await db.insert(xAccounts).values({
                id: crypto.randomUUID(),
                userId: account.userId,
                xUserId: account.accountId,
                xUsername: profile.username || "twitter_user",
                xDisplayName: profile.name || "Twitter User",
                xAvatarUrl: profile.profile_image_url || null,
                accessToken: account.accessToken,
                refreshTokenEnc: account.refreshToken || null,
                tokenExpiresAt: account.accessTokenExpiresAt || null,
                isActive: true,
              }).onConflictDoUpdate({
                target: xAccounts.xUserId,
                set: {
                  accessToken: account.accessToken,
                  refreshTokenEnc: account.refreshToken || null,
                  tokenExpiresAt: account.accessTokenExpiresAt || null,
                  isActive: true,
                  updatedAt: new Date(),
                }
              });
            } catch (error) {
              console.error("Failed to sync xAccount on create", error);
            }
          }
        }
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
        after: async (account) => {
          if (account.providerId === "twitter" && account.accessToken) {
            try {
              const { xAccounts } = await import("./schema");
              // Upsert so a missing row (e.g. manually deleted) is recreated on
              // re-login rather than silently leaving the user with no xAccount.
              await db.insert(xAccounts).values({
                id: crypto.randomUUID(),
                userId: account.userId,
                xUserId: account.accountId,
                xUsername: account.accountId, // fallback; create.after sets real username
                accessToken: account.accessToken,
                refreshTokenEnc: account.refreshToken || null,
                tokenExpiresAt: account.accessTokenExpiresAt || null,
                isActive: true,
              }).onConflictDoUpdate({
                target: xAccounts.xUserId,
                set: {
                  accessToken: account.accessToken,
                  refreshTokenEnc: account.refreshToken || null,
                  tokenExpiresAt: account.accessTokenExpiresAt || null,
                  isActive: true,
                  updatedAt: new Date(),
                },
              });
            } catch (error) {
              console.error("Failed to sync xAccount on update", error);
            }
          }
        }
      },
    },
  },

  account: {
    accountLinking: {
      trustedProviders: ["twitter"],
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
        "media.write", // Required for v2 media upload endpoints
      ],
    },
  },
})
