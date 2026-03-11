export interface SocialMediaItem {
  url: string;
  mimeType: string; // 'image/jpeg', 'video/mp4'
  fileType: 'image' | 'video' | 'gif';
  size?: number;
}

export interface SocialPostContent {
  text: string;
  media?: SocialMediaItem[];
}

export interface SocialUserInfo {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
}

export interface SocialApiService {
  /**
   * Post a single status update/tweet
   */
  post(content: SocialPostContent): Promise<{ id: string; url?: string }>;

  /**
   * Post a thread (only supported by some platforms like X/Threads)
   * For platforms that don't support threads, this might post the first item
   * or throw an error.
   */
  postThread?(contents: SocialPostContent[]): Promise<{ ids: string[] }>;

  /**
   * Get authenticated user info
   */
  getUser(): Promise<SocialUserInfo>;

  /**
   * Get follower count
   */
  getFollowerCount(): Promise<number>;
  
  /**
   * Refresh the access token if needed
   */
  refreshToken?(): Promise<void>;
}
