import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { instagramAccounts } from "@/lib/schema";
import { decryptToken } from "@/lib/security/token-encryption";
import { SocialApiService, SocialPostContent, SocialUserInfo } from "./social-api";

const GRAPH_API_URL = "https://graph.facebook.com/v19.0";

export class InstagramApiService implements SocialApiService {
  private accessToken: string;
  private instagramAccountId: string; // The Instagram Business Account ID

  constructor(token: string, instagramAccountId: string) {
    this.accessToken = token;
    this.instagramAccountId = instagramAccountId;
  }

  static async getClientForUser(userId: string): Promise<InstagramApiService | null> {
    const account = await db.query.instagramAccounts.findFirst({
      where: and(eq(instagramAccounts.userId, userId), eq(instagramAccounts.isActive, true)),
    });

    if (!account) return null;

    const accessToken = decryptToken(account.accessToken);

    // Instagram/Facebook Long-Lived tokens last 60 days.
    // We should refresh if getting close to expiry, but for now we'll assume valid or handle error.
    // Refreshing FB tokens usually involves a specific endpoint or just re-auth if completely expired.
    // For long-lived tokens, you can query the endpoint to get a new one if it's old.
    
    // Simple check: if < 3 days left, try refresh?
    // Not implemented for this MVP phase, assuming manual re-connect if expired.

    return new InstagramApiService(accessToken, account.instagramUserId);
  }

  async getUser(): Promise<SocialUserInfo> {
    // Fetch IG User Info
    const fields = "id,username,name,profile_picture_url";
    const response = await fetch(`${GRAPH_API_URL}/${this.instagramAccountId}?fields=${fields}&access_token=${this.accessToken}`);
    
    if (!response.ok) throw new Error("Failed to fetch Instagram profile");
    
    const data = await response.json();
    
    return {
        id: data.id,
        username: data.username,
        name: data.name || data.username,
        avatarUrl: data.profile_picture_url
    };
  }

  async getFollowerCount(): Promise<number> {
      const response = await fetch(`${GRAPH_API_URL}/${this.instagramAccountId}?fields=followers_count&access_token=${this.accessToken}`);
      if (!response.ok) return 0;
      const data = await response.json();
      return data.followers_count || 0;
  }

  async post(content: SocialPostContent): Promise<{ id: string; url?: string }> {
    if (!content.media || content.media.length === 0) {
        throw new Error("Instagram requires at least one image or video.");
    }

    const mediaItem = content.media[0];
    if (!mediaItem) throw new Error("Media item is missing");
    
    // MVP: Single Image/Video Publish
    
    let creationId: string;

    if (mediaItem.fileType === "image") {
        // Create Image Container
        const params = new URLSearchParams({
            image_url: mediaItem.url,
            caption: content.text,
            access_token: this.accessToken
        });
        
        const createRes = await fetch(`${GRAPH_API_URL}/${this.instagramAccountId}/media?${params.toString()}`, {
            method: "POST"
        });

        if (!createRes.ok) {
            const err = await createRes.json();
            throw new Error(`Instagram Media Creation Failed: ${err.error?.message || "Unknown error"}`);
        }
        
        const createData = await createRes.json();
        creationId = createData.id;

    } else if (mediaItem.fileType === "video") {
        // Create Video Container (Reels)
        const params = new URLSearchParams({
            video_url: mediaItem.url,
            caption: content.text,
            media_type: "REELS", // or VIDEO
            access_token: this.accessToken
        });

        const createRes = await fetch(`${GRAPH_API_URL}/${this.instagramAccountId}/media?${params.toString()}`, {
            method: "POST"
        });

        if (!createRes.ok) {
            const err = await createRes.json();
            throw new Error(`Instagram Video Creation Failed: ${err.error?.message || "Unknown error"}`);
        }

        const createData = await createRes.json();
        creationId = createData.id;
        
        // Wait for video processing? Usually required for videos.
        // For MVP, we might need a status check loop.
        await this.waitForMediaProcessing(creationId);
    } else {
        throw new Error("Unsupported media type for Instagram");
    }

    // Publish Container
    const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: this.accessToken
    });

    const publishRes = await fetch(`${GRAPH_API_URL}/${this.instagramAccountId}/media_publish?${publishParams.toString()}`, {
        method: "POST"
    });

    if (!publishRes.ok) {
        const err = await publishRes.json();
        throw new Error(`Instagram Publish Failed: ${err.error?.message || "Unknown error"}`);
    }

    const publishData = await publishRes.json();
    
    // Get permalink
    const permalinkRes = await fetch(`${GRAPH_API_URL}/${publishData.id}?fields=permalink&access_token=${this.accessToken}`);
    const permalinkData = await permalinkRes.json();

    return { 
        id: publishData.id,
        url: permalinkData.permalink || `https://www.instagram.com/p/${publishData.id}/`
    };
  }

  private async waitForMediaProcessing(containerId: string): Promise<void> {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
          const res = await fetch(`${GRAPH_API_URL}/${containerId}?fields=status_code,status&access_token=${this.accessToken}`);
          const data = await res.json();
          
          if (data.status_code === "FINISHED") return;
          if (data.status_code === "ERROR") throw new Error("Instagram video processing failed");
          
          await new Promise(r => setTimeout(r, 2000)); // Wait 2s
          attempts++;
      }
      throw new Error("Instagram video processing timeout");
  }
}
