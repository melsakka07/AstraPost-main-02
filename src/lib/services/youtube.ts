import "server-only";

import { execFile } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { promisify } from "util";
import { logger } from "@/lib/logger";

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
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });

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

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });

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
 * Client contexts to try in order. Ordered by likelihood of success.
 * Versions sourced from YouTube.js v15.1.0 constants.
 */
const YOUTUBE_CLIENTS: YouTubeClient[] = [
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

  for (const client of YOUTUBE_CLIENTS) {
    // WEB client needs visitorData from page scraping; skip if unavailable
    if (client.needsVisitorData && !pageConfig?.visitorData) continue;

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
      logger.warn("youtube_player_client_failed", {
        videoId,
        client: client.name,
        error: message,
      });
    }
  }

  // Last resort: oEmbed (title + thumbnail only, no duration)
  if (opts.allowOembedFallback) {
    logger.info("youtube_falling_back_to_oembed", { videoId });
    try {
      return await getVideoInfoOembed(videoId);
    } catch (oembedErr) {
      const message = oembedErr instanceof Error ? oembedErr.message : String(oembedErr);
      logger.error("youtube_oembed_failed", { videoId, error: message });
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
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "*/*",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
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
 * Extract the best audio stream to outputPath.
 *
 * Two-phase: (1) yt-dlp --get-url extracts the CDN stream URL (~5s), then
 * Node.js HTTP fetch downloads it; (2) fall back to yt-dlp full download.
 * The --get-url phase is much faster because yt-dlp only does extraction.
 * The HTTP download is faster because it avoids yt-dlp's Python overhead.
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
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch(streamUrl, {
      headers: {
        "User-Agent":
          "com.google.ios.youtube/20.11.6 (iPhone10,4; U; CPU iOS 16_7_7 like Mac OS X)",
        Accept: "*/*",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com/",
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

/** Full yt-dlp download fallback with anti-detection headers. */
async function extractAudioViaYtDlp(url: string, outputPath: string): Promise<void> {
  const ytDlpPath = resolveYtDlpPath();

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
