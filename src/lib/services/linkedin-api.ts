import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { linkedinAccounts } from "@/lib/schema";
import { decryptToken, encryptToken } from "@/lib/security/token-encryption";
import { SocialApiService, SocialPostContent, SocialUserInfo } from "./social-api";

const LINKEDIN_API_URL = "https://api.linkedin.com/v2";

export class LinkedInApiService implements SocialApiService {
  private accessToken: string;
  private userId: string; // The LinkedIn User ID (URN ID)

  constructor(token: string, userId: string) {
    this.accessToken = token;
    this.userId = userId;
  }

  static async getClientForUser(userId: string): Promise<LinkedInApiService | null> {
    const account = await db.query.linkedinAccounts.findFirst({
      where: and(eq(linkedinAccounts.userId, userId), eq(linkedinAccounts.isActive, true)),
    });

    if (!account) return null;

    let accessToken = decryptToken(account.accessToken);

    // Check expiration and refresh if needed
    const expiresAt = account.tokenExpiresAt;
    // Refresh if < 24h left
    const shouldRefresh = expiresAt && expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

    if (shouldRefresh && account.refreshTokenEnc) {
      try {
        const refreshToken = decryptToken(account.refreshTokenEnc);
        const params = new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        });

        const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params,
        });

        if (response.ok) {
          const data = await response.json();
          const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

          accessToken = data.access_token;

          await db
            .update(linkedinAccounts)
            .set({
              accessToken: encryptToken(data.access_token),
              refreshTokenEnc: data.refresh_token
                ? encryptToken(data.refresh_token)
                : account.refreshTokenEnc,
              tokenExpiresAt: newExpiresAt,
              updatedAt: new Date(),
            })
            .where(eq(linkedinAccounts.id, account.id));
        } else {
          logger.error("linkedin_refresh_failed", { status: response.status });
        }
      } catch (error) {
        logger.error("linkedin_refresh_error", { error });
      }
    }

    return new LinkedInApiService(accessToken, account.linkedinUserId);
  }

  async getUser(): Promise<SocialUserInfo> {
    const response = await fetch(
      `${LINKEDIN_API_URL}/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch LinkedIn profile");

    const data = await response.json();

    let avatarUrl = undefined;
    if (
      data.profilePicture &&
      data.profilePicture["displayImage~"] &&
      data.profilePicture["displayImage~"].elements
    ) {
      // Get the largest image
      const elements = data.profilePicture["displayImage~"].elements;
      if (elements.length > 0) {
        avatarUrl = elements[elements.length - 1].identifiers[0].identifier;
      }
    }

    return {
      id: data.id,
      username: `${data.localizedFirstName} ${data.localizedLastName}`, // LinkedIn doesn't have usernames like Twitter
      name: `${data.localizedFirstName} ${data.localizedLastName}`,
      avatarUrl,
    };
  }

  async getFollowerCount(): Promise<number> {
    // Not implemented for personal profiles easily without specific permissions
    return 0;
  }

  async post(content: SocialPostContent): Promise<{ id: string; url?: string }> {
    const authorUrn = `urn:li:person:${this.userId}`;

    const body: any = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content.text,
          },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    if (content.media && content.media.length > 0) {
      // TODO: Implement media upload
      // For now, append media URLs to text if they are external links, or ignore/throw
      // Throwing error for now to be explicit
      throw new Error("Media upload not yet supported for LinkedIn in this version");
    }

    const response = await fetch(`${LINKEDIN_API_URL}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error("linkedin_post_failed", { error: err });
      throw new Error(`LinkedIn post failed: ${err}`);
    }

    const data = await response.json();
    // Post URL format: https://www.linkedin.com/feed/update/{urn}
    return {
      id: data.id,
      url: `https://www.linkedin.com/feed/update/${data.id}`,
    };
  }
}
