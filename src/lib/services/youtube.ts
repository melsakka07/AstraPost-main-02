import "server-only";

import { execFile } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { promisify } from "util";
import { logger } from "@/lib/logger";
import { getYouTubeCookieHeader } from "@/lib/services/youtube-cookies";
import { getProxiedFetch, invalidateActiveProxy } from "@/lib/services/youtube-proxy";

// ---------------------------------------------------------------------------
// HTTP-based video info (no yt-dlp binary required)
// ---------------------------------------------------------------------------

interface YouTubePlayerResponse {
  videoDetails?: {
    title?: string;
    lengthSeconds?: string;
    videoId?: string;
    thumbnail?: { thumbnails?: { url: string; width: number; height: number }[] };
    isLiveContent?: boolean;
    isPrivate?: boolean;
  };
  playabilityStatus?: {
    status?: string;
    reason?: string;
    messages?: string[];
  };
}

// ---------------------------------------------------------------------------
// Watch page scraping — extracts fresh API key and visitorData
// ---------------------------------------------------------------------------

/**
 * Scrape the YouTube watch page for fresh ytcfg configuration.
 *
 * Fetches the HTML of a video page and extracts the `ytcfg.set({…})` JSON blob
 * to get a fresh API key and visitorData. These values are rotated by YouTube and
 * using stale ones causes bot detection.
 *
 * Non-fatal — returns null on any failure so the caller falls back to env vars.
 */
async function extractYouTubePageConfig(
  videoId: string
): Promise<{ apiKey: string; visitorData: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const fetchFn = await getProxiedFetch();
    const cookieHeader = getYouTubeCookieHeader();
    const res = await fetchFn(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      signal: controller.signal,
    });

    if (res.status === 429) {
      logger.warn("youtube_watch_page_rate_limited", { videoId });
      await invalidateActiveProxy("watch_page_429");
      return null;
    }

    if (!res.ok) return null;

    const html = await res.text();
    const ytcfg = extractYtcfgJson(html);
    if (!ytcfg) return null;

    const apiKey = typeof ytcfg.INNERTUBE_API_KEY === "string" ? ytcfg.INNERTUBE_API_KEY : "";
    const visitorData = typeof ytcfg.VISITOR_DATA === "string" ? ytcfg.VISITOR_DATA : "";

    if (!apiKey) return null;

    return { apiKey, visitorData };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Extract the ytcfg JSON blob from a watch page HTML string. */
function extractYtcfgJson(html: string): Record<string, unknown> | null {
  const startMatch = html.match(/ytcfg\.set\s*\(\s*\{/);
  if (!startMatch || startMatch.index === undefined) return null;

  const startIndex = startMatch.index + startMatch[0].length - 1; // position of '{'
  let depth = 1;
  let pos = startIndex + 1;

  while (pos < html.length && depth > 0) {
    const char = html[pos];
    if (char === "{") depth++;
    else if (char === "}") depth--;
    pos++;
  }

  if (depth !== 0) return null;

  const json = html.substring(startIndex, pos);
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// oEmbed fallback — last resort when innertube blocks all clients
// ---------------------------------------------------------------------------

/**
 * Get video metadata via YouTube's oEmbed endpoint.
 *
 * This is a public, no-auth GET endpoint that returns title and thumbnail.
 * It does NOT return duration, so `durationSeconds` is 0 and `durationVerified`
 * is set to false. Callers should skip duration-based gates in this case.
 *
 * Throws on network error or non-2xx response.
 */
async function getVideoInfoOembed(videoId: string): Promise<VideoInfo> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };

  // oEmbed is a public no-auth endpoint and doesn't need anti-bot bypass.
  // If the proxy is dead, retry once without it so the worker's title-only branch can still run.
  let res: Response;
  try {
    const fetchFn = await getProxiedFetch();
    res = await fetchFn(url, { headers });
  } catch (err) {
    // Network-layer failure (proxy unreachable, DNS, etc) — only retry direct if we actually
    // had a proxy configured. Real HTTP 4xx/5xx from oEmbed are NOT caught here.
    if (!(err instanceof TypeError)) throw err;
    const cause =
      "cause" in err ? (err.cause as { code?: string; message?: string } | undefined) : undefined;
    logger.warn("youtube_oembed_proxy_bypass", {
      videoId,
      error: err.message,
      causeCode: cause?.code,
      causeMessage: cause?.message,
    });
    // Invalidate so the next call resolves a fresh proxy instead of reusing the dead one.
    await invalidateActiveProxy("oembed_typeerror");
    res = await globalThis.fetch(url, { headers });
  }

  if (!res.ok) {
    throw new Error(`oEmbed API returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as { title?: string; thumbnail_url?: string };

  return {
    videoId,
    title: data.title ?? "Untitled YouTube Video",
    durationSeconds: 0,
    thumbnailUrl: data.thumbnail_url ?? buildYoutubeThumbnailUrl(videoId),
    durationVerified: false,
  };
}

interface YouTubeClient {
  name: string;
  context: Record<string, unknown>;
  userAgent: string;
  /** Required for WEB client; causes the client to be skipped if visitorData is absent. */
  needsVisitorData?: boolean;
}

/**
 * Thrown when the innertube response indicates YouTube has flagged the request
 * as a bot ("LOGIN_REQUIRED" or reason matching /not a bot/i). The per-client
 * loop catches this specifically to apply a per-job proxy-rotation cap, which
 * avoids burning Webshare proxies when the video is globally rate-limited
 * (vs. just IP-flagged).
 */
class BotChallengeError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "BotChallengeError";
  }
}

/** Max times we'll rotate the cached proxy within a single getVideoInfoHttp call. */
const MAX_PROXY_INVALIDATIONS_PER_JOB = 2;
/** Jitter between client attempts so a freshly-rotated proxy gets a moment to look "human". */
const CLIENT_RETRY_JITTER_MIN_MS = 500;
const CLIENT_RETRY_JITTER_MAX_MS = 800;

/**
 * Client contexts to try in order. Ordered by likelihood of success.
 * Versions sourced from YouTube.js v15.1.0 constants.
 *
 * IOS first: 2026-05-16 diagnostic showed IOS passed while ANDROID_VR was bot-challenged
 * on the same proxy IP. ANDROID_VR retained as #2 fallback (still useful when IOS rate-limits).
 */
const YOUTUBE_CLIENTS: YouTubeClient[] = [
  {
    name: "IOS",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "20.11.6",
        deviceMake: "Apple",
        deviceModel: "iPhone10,4",
        osName: "iOS",
        osVersion: "16.7.7.20H330",
        hl: "en",
      },
    },
    userAgent: "com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)",
  },
  {
    // ANDROID_VR (Oculus Quest 3) — least restricted, no PO token needed
    name: "ANDROID_VR",
    context: {
      client: {
        clientName: "ANDROID_VR",
        clientVersion: "1.66.0",
        deviceMake: "Oculus",
        deviceModel: "Quest 3",
        osName: "Android",
        osVersion: "14",
        hl: "en",
      },
    },
    userAgent: "com.google.android.apps.youtube.vr.oculus/1.66.0 (Linux; U; Android 14; Quest 3)",
  },
  {
    // MWEB — mobile web, less aggressively rate-limited than desktop WEB
    name: "MWEB",
    context: {
      client: {
        clientName: "MWEB",
        clientVersion: "2.20250224.01.00",
        hl: "en",
      },
    },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.7 Mobile/15E148 Safari/604.1",
    needsVisitorData: true,
  },
  {
    name: "ANDROID",
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.35.36",
        androidSdkVersion: 33,
        hl: "en",
      },
    },
    userAgent:
      "com.google.android.youtube/19.35.36 (Linux; U; Android 13; en_US; SM-S908E Build/TP1A.220624.014) gzip",
  },
  {
    // WEB — requires fresh visitorData from watch page scraping
    name: "WEB",
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20250222.10.00",
        hl: "en",
      },
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    needsVisitorData: true,
  },
  {
    name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0",
        hl: "en",
      },
      thirdParty: { embedUrl: "https://www.youtube.com" },
    },
    userAgent: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version",
  },
  {
    name: "TVHTML5_SIMPLY",
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY",
        clientVersion: "1.0",
        hl: "en",
      },
    },
    userAgent: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version",
  },
];

/**
 * Get video metadata via YouTube's internal player API.
 *
 * Uses HTTP only — no yt-dlp binary required. Suitable for Vercel serverless.
 * Tries multiple client contexts to avoid bot detection, scrapes the watch page
 * for fresh visitorData, and falls back to YouTube's oEmbed API as a last resort
 * when enabled.
 *
 * Returns title, duration (seconds), and thumbnail URL.
 * Throws if video is private, age-gated, unavailable, too long, or too short.
 */
export async function getVideoInfoHttp(
  videoId: string,
  opts: { allowOembedFallback?: boolean } = {}
): Promise<VideoInfo> {
  logger.info("youtube_get_video_info_http_start", { videoId });

  // Scrape watch page for fresh visitorData (non-fatal if it fails)
  const pageConfig = await extractYouTubePageConfig(videoId);
  if (pageConfig) {
    logger.info("youtube_page_config_extracted", {
      videoId,
      hasApiKey: !!pageConfig.apiKey,
      hasVisitorData: !!pageConfig.visitorData,
    });
  }

  let lastError: string | null = null;
  let attemptCount = 0;
  let proxyInvalidationCount = 0;

  for (const client of YOUTUBE_CLIENTS) {
    // WEB client needs visitorData from page scraping; skip if unavailable
    if (client.needsVisitorData && !pageConfig?.visitorData) continue;

    // Jitter between attempts so a freshly-rotated proxy gets ~500-800ms
    // before YouTube fingerprints it on this video. First attempt has no delay.
    if (attemptCount > 0) {
      const jitterMs =
        CLIENT_RETRY_JITTER_MIN_MS +
        Math.floor(Math.random() * (CLIENT_RETRY_JITTER_MAX_MS - CLIENT_RETRY_JITTER_MIN_MS));
      await new Promise((r) => setTimeout(r, jitterMs));
    }
    attemptCount++;

    // Pass scraped API key and visitorData to ALL clients, not just WEB.
    // visitorData links the request to a watch-page session, reducing bot flags.
    const apiKey = pageConfig?.apiKey;
    const vData = pageConfig?.visitorData;

    try {
      const result = await fetchYouTubePlayer(videoId, client, apiKey, vData);
      logger.info("youtube_get_video_info_http_success", {
        videoId,
        clientUsed: client.name,
        titleLength: result.title.length,
        durationSeconds: result.durationSeconds,
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = message;
      const cause =
        err instanceof Error && "cause" in err
          ? (err.cause as { code?: string; message?: string } | undefined)
          : undefined;
      logger.warn("youtube_player_client_failed", {
        videoId,
        client: client.name,
        error: message,
        causeCode: cause?.code,
        causeMessage: cause?.message,
        viaProxy: !!process.env.YOUTUBE_PROXY_URL || !!process.env.API_KEY_WEBSHARE,
      });

      // Bot challenge — rotate the proxy, but only up to MAX_PROXY_INVALIDATIONS_PER_JOB.
      // Beyond that, let remaining clients exhaust on the current proxy and fall through
      // to oEmbed. Avoids burning Webshare API calls when YouTube is globally rate-limiting
      // this video (not just blocking the current IP).
      if (err instanceof BotChallengeError) {
        if (proxyInvalidationCount < MAX_PROXY_INVALIDATIONS_PER_JOB) {
          proxyInvalidationCount++;
          await invalidateActiveProxy("innertube_bot_challenge");
        } else {
          logger.info("youtube_bot_challenge_invalidation_cap_reached", {
            videoId,
            cap: MAX_PROXY_INVALIDATIONS_PER_JOB,
            clientName: client.name,
          });
        }
      } else if (err instanceof TypeError) {
        // Network-layer failure means the current proxy is likely dead — rotate before next client.
        await invalidateActiveProxy("player_typeerror");
      }
    }
  }

  // Last resort: oEmbed (title + thumbnail only, no duration)
  if (opts.allowOembedFallback) {
    logger.info("youtube_falling_back_to_oembed", { videoId });
    try {
      return await getVideoInfoOembed(videoId);
    } catch (oembedErr) {
      const message = oembedErr instanceof Error ? oembedErr.message : String(oembedErr);
      const cause =
        oembedErr instanceof Error && "cause" in oembedErr
          ? (oembedErr.cause as { code?: string; message?: string } | undefined)
          : undefined;
      logger.error("youtube_oembed_failed", {
        videoId,
        error: message,
        causeCode: cause?.code,
        causeMessage: cause?.message,
        viaProxy: !!process.env.YOUTUBE_PROXY_URL || !!process.env.API_KEY_WEBSHARE,
      });
    }
  }

  throw new Error(lastError ?? "Failed to fetch video info from YouTube");
}

async function fetchYouTubePlayer(
  videoId: string,
  client: YouTubeClient,
  overrideApiKey?: string,
  visitorData?: string
): Promise<VideoInfo> {
  const apiKey = overrideApiKey ?? process.env.YOUTUBE_INNERTUBE_API_KEY;
  const url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`;

  // Merge visitorData into context if provided (WEB client uses this)
  const context = visitorData ? { ...client.context, visitorData } : client.context;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let data: YouTubePlayerResponse;
  try {
    const fetchFn = await getProxiedFetch();
    const cookieHeader = getYouTubeCookieHeader();
    const res = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "*/*",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify({
        videoId,
        context,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`YouTube player API returned HTTP ${res.status}`);
    }

    data = (await res.json()) as YouTubePlayerResponse;
  } finally {
    clearTimeout(timeout);
  }

  const { playabilityStatus, videoDetails } = data;

  // Bot-challenge detection — YouTube returns LOGIN_REQUIRED or a "not a bot"
  // reason when the IP is flagged. Throw a typed error so the per-client loop
  // can apply the per-job proxy-invalidation cap.
  const botChallengeReason = playabilityStatus?.reason ?? "";
  const isBotChallenge =
    playabilityStatus?.status === "LOGIN_REQUIRED" || /not a bot/i.test(botChallengeReason);
  if (isBotChallenge) {
    logger.warn("youtube_innertube_bot_challenge", {
      videoId,
      clientName: client.name,
      reason: botChallengeReason,
    });
    throw new BotChallengeError(botChallengeReason || "Sign in to confirm you're not a bot");
  }

  if (!playabilityStatus || playabilityStatus.status !== "OK") {
    const reason = playabilityStatus?.reason ?? "Video is not available";
    throw new Error(reason);
  }

  if (!videoDetails) {
    throw new Error("YouTube response missing video details");
  }

  if (videoDetails.isPrivate) {
    throw new Error("This video is private");
  }

  if (videoDetails.isLiveContent) {
    throw new Error("Live videos are not supported");
  }

  const title = videoDetails.title;
  if (!title) {
    throw new Error("YouTube response missing video title");
  }

  const durationRaw = videoDetails.lengthSeconds;
  if (!durationRaw) {
    throw new Error("YouTube response missing video duration");
  }

  const durationSeconds = Math.floor(Number(durationRaw));
  if (isNaN(durationSeconds) || durationSeconds <= 0) {
    throw new Error(`Invalid video duration: ${durationRaw}`);
  }

  if (durationSeconds > MAX_DURATION_SECONDS) {
    throw new Error(
      `Video is too long (${Math.round(durationSeconds / 60)} minutes). Maximum is 90 minutes.`
    );
  }

  if (durationSeconds < MIN_DURATION_SECONDS) {
    throw new Error(`Video is too short (${durationSeconds} seconds). Minimum is 30 seconds.`);
  }

  const thumbnailUrl =
    videoDetails.thumbnail?.thumbnails?.[0]?.url ?? buildYoutubeThumbnailUrl(videoId);

  return { videoId, title, durationSeconds, thumbnailUrl };
}

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YoutubeUrlValidation {
  valid: boolean;
  videoId?: string;
  error?: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  durationSeconds: number;
  thumbnailUrl: string;
  /** Whether the duration was verified via the innertube API (false for oEmbed fallback). */
  durationVerified?: boolean;
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

const YOUTUBE_URL_RE = /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/i;

/**
 * Validate a YouTube URL. Accepts youtube.com/watch?v=ID and youtu.be/ID.
 * Rejects playlists (list=), channels (/channel/, /c/, /@), shorts (/shorts/),
 * and live videos.
 */
export function validateYoutubeUrl(url: string): YoutubeUrlValidation {
  const trimmed = url.trim();

  if (!trimmed) {
    return { valid: false, error: "URL is empty" };
  }

  // Reject channel URLs
  if (/youtube\.com\/(channel\/|c\/|@)/i.test(trimmed)) {
    return { valid: false, error: "Channel URLs are not supported" };
  }

  // Reject shorts URLs
  if (/youtube\.com\/shorts\//i.test(trimmed)) {
    return { valid: false, error: "Shorts are not supported" };
  }

  // Reject playlists
  if (/[?&]list=/i.test(trimmed)) {
    return { valid: false, error: "Playlist URLs are not supported" };
  }

  // Reject live videos
  if (/[?&]live=/i.test(trimmed) || /youtube\.com\/live\//i.test(trimmed)) {
    return { valid: false, error: "Live videos are not supported" };
  }

  const match = trimmed.match(YOUTUBE_URL_RE);
  if (!match) {
    return { valid: false, error: "Invalid YouTube URL" };
  }

  const videoId = match[1];
  if (!videoId || videoId.length !== 11) {
    return { valid: false, error: "Invalid video ID" };
  }

  return { valid: true, videoId };
}

// ---------------------------------------------------------------------------
// yt-dlp binary resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the yt-dlp binary path.
 * Checks YT_DLP_PATH env var → common platform paths → falls back to "yt-dlp"
 * (PATH lookup).
 */
export function resolveYtDlpPath(): string {
  // 1. Explicit env override
  const envPath = process.env.YT_DLP_PATH;
  if (envPath && existsSync(envPath)) {
    logger.debug("yt_dlp_path_from_env", { path: envPath });
    return envPath;
  }

  // 2. Common installation paths (Unix + Windows)
  const commonPaths: string[] = [
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
    "/opt/homebrew/bin/yt-dlp",
  ];

  // USERPROFILE first on Windows (HOME may be a Unix-style path from Git Bash)
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    commonPaths.push(path.join(home, "bin", "yt-dlp"));
    // Windows: Python user install (pip install --user yt-dlp)
    for (const ver of ["Python313", "Python312", "Python311"]) {
      commonPaths.push(
        path.join(home, "AppData", "Roaming", "Python", ver, "Scripts", "yt-dlp.exe")
      );
    }
    // Windows: scoop shims
    commonPaths.push(path.join(home, "scoop", "shims", "yt-dlp.exe"));
  }
  // Windows: chocolatey (system-wide)
  commonPaths.push("C:\\ProgramData\\chocolatey\\bin\\yt-dlp.exe");

  // Windows: Python Launcher
  commonPaths.push("yt-dlp.exe");

  for (const candidate of commonPaths) {
    if (existsSync(candidate)) {
      logger.debug("yt_dlp_path_from_common", { path: candidate });
      return candidate;
    }
  }

  // 3. Fall back to PATH lookup
  logger.debug("yt_dlp_path_from_path", { path: "yt-dlp" });
  return "yt-dlp";
}

// ---------------------------------------------------------------------------
// Video metadata
// ---------------------------------------------------------------------------

/** Maximum allowed video duration in seconds (90 minutes). */
const MAX_DURATION_SECONDS = 5400;

/** Minimum allowed video duration in seconds (30 seconds). */
const MIN_DURATION_SECONDS = 30;

function buildYoutubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Get video metadata via yt-dlp.
 *
 * Calls:
 *   yt-dlp --print "%(id)s" --print "%(title)s" --print "%(duration)s"
 *          --no-playlist <url>
 *
 * with a 15s timeout. Throws if duration is missing, > 90 min, or < 30 seconds.
 */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const ytDlpPath = resolveYtDlpPath();

  logger.info("youtube_get_video_info_start", { url });

  let stdout: string;
  try {
    const result = await execFileAsync(
      ytDlpPath,
      [
        "--print",
        "%(id)s",
        "--print",
        "%(title)s",
        "--print",
        "%(duration)s",
        "--no-playlist",
        url,
      ],
      { timeout: 15000, maxBuffer: 1024 * 1024 }
    );
    stdout = result.stdout;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("youtube_get_video_info_failed", { url, error: message });
    throw new Error(`yt-dlp failed to fetch video info: ${message}`);
  }

  const lines = stdout.trim().split("\n");
  if (lines.length < 3) {
    logger.error("youtube_get_video_info_incomplete_output", {
      url,
      lineCount: lines.length,
    });
    throw new Error("yt-dlp returned incomplete video metadata");
  }

  const videoId = lines[0]?.trim();
  const title = lines[1]?.trim();
  const durationRaw = lines[2]?.trim();

  if (!videoId || !title || !durationRaw) {
    logger.error("youtube_get_video_info_missing_fields", {
      url,
      hasVideoId: !!videoId,
      hasTitle: !!title,
      hasDuration: !!durationRaw,
    });
    throw new Error("yt-dlp returned video metadata with missing fields");
  }

  const durationSeconds = Number(durationRaw);

  if (isNaN(durationSeconds)) {
    logger.error("youtube_invalid_duration", {
      url,
      durationRaw,
    });
    throw new Error(`Invalid video duration: ${durationRaw}`);
  }

  if (durationSeconds > MAX_DURATION_SECONDS) {
    throw new Error(
      `Video is too long (${Math.round(durationSeconds / 60)} minutes). Maximum is 90 minutes.`
    );
  }

  if (durationSeconds < MIN_DURATION_SECONDS) {
    throw new Error(`Video is too short (${durationSeconds} seconds). Minimum is 30 seconds.`);
  }

  logger.info("youtube_get_video_info_success", {
    url,
    videoId,
    titleLength: title.length,
    durationSeconds,
  });

  return {
    videoId,
    title,
    durationSeconds,
    thumbnailUrl: buildYoutubeThumbnailUrl(videoId),
  };
}

// ---------------------------------------------------------------------------
// Audio extraction — yt-dlp --get-url (fast URL extraction) + HTTP download
// ---------------------------------------------------------------------------

/**
 * Resolve the YouTube cookies file path.
 *
 * Priority:
 * 1. YOUTUBE_COOKIES_BASE64 env var (decoded to a temp file) — for Railway
 * 2. youtube_cookies.txt in known local/container paths
 */
function resolveCookiesPath(): string {
  // Decode from env var for Railway (no file in git repo)
  const encoded = process.env.YOUTUBE_COOKIES_BASE64;
  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const tempPath = "/tmp/youtube_cookies.txt";
      writeFileSync(tempPath, decoded);
      return tempPath;
    } catch {
      logger.warn("youtube_cookies_base64_decode_failed");
    }
  }

  // Check known file paths
  const paths = ["/app/youtube_cookies.txt", "./youtube_cookies.txt", "../youtube_cookies.txt"];
  for (const p of paths) {
    if (existsSync(p)) return p;
  }

  return "";
}

/** Build --cookies args for yt-dlp if a cookie file is available. */
function getYtDlpCookieArgs(): string[] {
  const path = resolveCookiesPath();
  if (!path) return [];
  return ["--cookies", path];
}

/**
 * Extract the best audio stream to outputPath.
 *
 * Two-phase: (1) yt-dlp --get-url extracts the CDN stream URL (~5s), then
 * Node.js HTTP fetch downloads it; (2) fall back to yt-dlp full download.
 * Uses YouTube cookies (youtube_cookies.txt) when available.
 */
export async function extractAudio(url: string, outputPath: string): Promise<void> {
  logger.info("youtube_extract_audio_start", { url, outputPath });

  // Phase 1: get the CDN stream URL via yt-dlp, then download via HTTP
  const streamUrl = await getYtDlpStreamUrl(url);
  if (streamUrl) {
    logger.info("youtube_audio_got_stream_url", { url });
    try {
      await downloadAudioStream(streamUrl, outputPath);
      logger.info("youtube_extract_audio_success", { url, outputPath, method: "get-url+http" });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn("youtube_audio_http_download_failed", { url, error: message });
    }
  }

  // Phase 2: full yt-dlp download
  logger.info("youtube_extract_audio_ytdlp_fallback", { url });
  await extractAudioViaYtDlp(url, outputPath);
  logger.info("youtube_extract_audio_success", { url, outputPath, method: "yt-dlp" });
}

/** Use yt-dlp --get-url to resolve the CDN stream URL quickly (~5s). */
async function getYtDlpStreamUrl(url: string): Promise<string | null> {
  const ytDlpPath = resolveYtDlpPath();
  const cookieArgs = getYtDlpCookieArgs();

  try {
    const { stdout } = await execFileAsync(
      ytDlpPath,
      [
        "-f",
        "bestaudio[ext=m4a]/bestaudio",
        "--get-url",
        "--no-playlist",
        "--socket-timeout",
        "15",
        "--force-ipv4",
        ...cookieArgs,
        "--user-agent",
        "com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)",
        "--add-header",
        "Accept:*/*",
        "--add-header",
        "Origin:https://www.youtube.com",
        "--add-header",
        "Referer:https://www.youtube.com/",
        "--add-header",
        "Accept-Language:en-US,en;q=0.9",
        url,
      ],
      { timeout: 30_000, maxBuffer: 1024 * 1024 }
    );

    const result = stdout.trim();
    if (result && result.startsWith("http")) return result;
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("youtube_get_stream_url_failed", { url, error: message });
    return null;
  }
}

/** Download an audio stream URL via HTTP fetch (no yt-dlp overhead). */
async function downloadAudioStream(streamUrl: string, outputPath: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const fetchFn = await getProxiedFetch();
    const cookieHeader = getYouTubeCookieHeader();
    const res = await fetchFn(streamUrl, {
      headers: {
        "User-Agent":
          "com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)",
        Accept: "*/*",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Audio stream HTTP ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(outputPath, buffer);
  } finally {
    clearTimeout(timeout);
  }
}

/** Full yt-dlp download fallback with anti-detection headers and cookies. */
async function extractAudioViaYtDlp(url: string, outputPath: string): Promise<void> {
  const ytDlpPath = resolveYtDlpPath();
  const cookieArgs = getYtDlpCookieArgs();

  try {
    await execFileAsync(
      ytDlpPath,
      [
        "-f",
        "bestaudio[ext=m4a]/bestaudio",
        "-o",
        outputPath,
        "--no-playlist",
        "--extractor-retries",
        "3",
        "--retries",
        "3",
        "--fragment-retries",
        "3",
        "--socket-timeout",
        "30",
        "--force-ipv4",
        ...cookieArgs,
        "--user-agent",
        "com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)",
        "--add-header",
        "Accept:*/*",
        "--add-header",
        "Origin:https://www.youtube.com",
        "--add-header",
        "Referer:https://www.youtube.com/",
        "--add-header",
        "Accept-Language:en-US,en;q=0.9",
        url,
      ],
      { timeout: 120000, maxBuffer: 1024 * 1024 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("youtube_extract_audio_ytdlp_failed", { url, outputPath, error: message });
    throw new Error(`yt-dlp audio extraction failed: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// MIME type detection
// ---------------------------------------------------------------------------

/**
 * Detect the audio MIME type from the first 12 bytes of a file.
 *
 * Returns "audio/mp4" for M4A files (detected by the "ftyp" box at bytes 4-7),
 * otherwise defaults to "audio/mpeg" (MP3).
 */
export function getAudioMimeType(filePath: string): string {
  try {
    const buf = readFileSync(filePath, { encoding: null });
    const header = buf.subarray(0, 12);

    // M4A files: ISO base media file format with ftyp box
    // Bytes 4-7 should be "ftyp"
    const ftyp = header.subarray(4, 8).toString("ascii");
    if (ftyp === "ftyp") {
      return "audio/mp4";
    }
  } catch (err) {
    logger.warn("youtube_mime_detection_read_failed", {
      filePath,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Default: treat as MP3
  return "audio/mpeg";
}
