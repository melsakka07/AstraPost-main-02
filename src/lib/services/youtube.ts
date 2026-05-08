import "server-only";

import { execFile } from "child_process";
import { readFileSync, existsSync } from "fs";
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

function getInnertubeUrl(): string {
  const key = process.env.YOUTUBE_INNERTUBE_API_KEY;
  return `https://www.youtube.com/youtubei/v1/player?key=${key}&prettyPrint=false`;
}

interface YouTubeClient {
  name: string;
  context: unknown;
  userAgent: string;
}

/** Client contexts to try in order. iOS is least restrictive for server-side. */
const YOUTUBE_CLIENTS: YouTubeClient[] = [
  {
    name: "IOS",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "20.05.02",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        osName: "iOS",
        osVersion: "18.5.0",
        hl: "en",
      },
    },
    userAgent: "com.google.ios.youtube/20.05.02 (iPhone16,2; U; CPU iOS 18_5_0 like Mac OS X)",
  },
  {
    name: "ANDROID",
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "20.05.02",
        androidSdkVersion: 35,
        hl: "en",
      },
    },
    userAgent: "com.google.android.youtube/20.05.02 (Linux; U; Android 15)",
  },
  {
    name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    context: {
      client: {
        clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
        clientVersion: "2.0.21",
        hl: "en",
      },
      thirdParty: { embedUrl: "https://www.youtube.com" },
    },
    userAgent: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version",
  },
];

/**
 * Get video metadata via YouTube's internal player API.
 *
 * Uses HTTP only — no yt-dlp binary required. Suitable for Vercel serverless.
 * Tries multiple client contexts (Android, TV embedded) to avoid bot detection.
 * Returns title, duration (seconds), and thumbnail URL.
 *
 * Throws if video is private, age-gated, unavailable, too long, or too short.
 */
export async function getVideoInfoHttp(videoId: string): Promise<VideoInfo> {
  logger.info("youtube_get_video_info_http_start", { videoId });

  let lastError: string | null = null;

  for (const client of YOUTUBE_CLIENTS) {
    try {
      const result = await fetchYouTubePlayer(videoId, client);
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

  throw new Error(lastError ?? "Failed to fetch video info from YouTube");
}

async function fetchYouTubePlayer(videoId: string, client: YouTubeClient): Promise<VideoInfo> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let data: YouTubePlayerResponse;
  try {
    const res = await fetch(getInnertubeUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: JSON.stringify({
        videoId,
        context: client.context,
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
// Audio extraction
// ---------------------------------------------------------------------------

/**
 * Extract the best audio stream to outputPath.
 *
 * Calls:
 *   yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -o <outputPath> --no-playlist <url>
 *
 * with a 120s timeout. Throws on non-zero exit.
 */
export async function extractAudio(url: string, outputPath: string): Promise<void> {
  const ytDlpPath = resolveYtDlpPath();

  logger.info("youtube_extract_audio_start", { url, outputPath });

  try {
    await execFileAsync(
      ytDlpPath,
      ["-f", "bestaudio[ext=m4a]/bestaudio", "-o", outputPath, "--no-playlist", url],
      { timeout: 120000, maxBuffer: 1024 * 1024 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("youtube_extract_audio_failed", {
      url,
      outputPath,
      error: message,
    });
    throw new Error(`yt-dlp audio extraction failed: ${message}`);
  }

  logger.info("youtube_extract_audio_success", { url, outputPath });
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
