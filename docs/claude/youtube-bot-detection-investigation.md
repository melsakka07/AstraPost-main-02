# YouTube Bot Detection — Investigation Report

**Date:** 2026-05-08 (updated 2026-05-09)  
**Feature:** YouTube-to-Thread (`/api/ai/youtube-to-thread`)

## Summary

YouTube has tightened its bot detection. The feature works end-to-end **locally** but fails **in production** on both Vercel and Railway because YouTube blocks requests from data-center IP ranges.

The POST endpoint is partially functional via oEmbed fallback (returns title + thumbnail but **no duration**). The worker audio download fails completely — yt-dlp is IP-blocked from Railway.

**Current solution (2026-05-09):** Title-only thread generation. When audio cannot be downloaded (all production cases), the worker generates a thread from the video title alone via AI, without requiring a transcript. This works reliably but produces lower-quality threads compared to transcript-based generation.

## Current Architecture

```
User submits URL
  → POST: innertube (blocked) → oEmbed (title + thumbnail)
  → Job enqueued with durationVerified=false, videoTitle set
  → Worker: detects durationVerified=false
  → Generates thread from title via AI (no audio, no transcript)
  → Job completes ✓
```

## Known Limitation

Title-only threads are less accurate than transcript-based threads. The AI infers what the video likely covers from the title. For transcript-quality threads, the underlying IP-blocking issue must be resolved (see "Future Improvements").

## Root Cause

YouTube uses **IP-based bot detection**. Residential IPs (your local machine) work. Data-center IPs (Vercel `iad1`, Railway) are flagged as bots. This applies to:

- **Innertube API** (`youtubei/v1/player`) — all requests get `"Sign in to confirm you're not a bot"`
- **yt-dlp** — same error, both `--get-url` and full download modes

## Approaches Attempted (All Failed in Production)

### 1. Client Rotation (7 client types)

Added 7 different YouTube client fingerprints to the innertube API rotation:
ANDROID_VR (Quest 3), MWEB (mobile web), IOS (iPhone10,4), ANDROID, WEB (desktop), TVHTML5_SIMPLY_EMBEDDED_PLAYER, TVHTML5_SIMPLY

**Result:** All 7 fail with `"Sign in to confirm you're not a bot"` from Vercel IPs.
Same clients work from a residential IP. **Verdict: IP-level blocking, not client fingerprint.**

### 2. Request Body Fields

Added `contentCheckOk: true` and `racyCheckOk: true` to innertube API body.

**Result:** No effect. These are required fields but don't bypass bot detection.

### 3. Browser Headers

Added `Origin: https://www.youtube.com`, `Referer: https://www.youtube.com/`, `Accept: */*` to innertube API requests.

**Result:** No effect from data-center IPs.

### 4. Watch Page Scraping

Scrape `ytcfg.set({...})` from the YouTube watch page HTML to extract fresh `INNERTUBE_API_KEY` and `VISITOR_DATA` for each request.

**Result:** Scraping works (watch page HTML loads). Fresh API key and visitorData extracted successfully. But innertube API still rejects from data-center IPs. **Verdict: IP block, not stale credentials.**

### 5. oEmbed Fallback

Use `youtube.com/oembed` as last resort — a public GET endpoint with no auth.

**Result:** Works from Vercel. Returns title + thumbnail. Does NOT return video duration. **Feature partially functional (metadata only, no duration).**

### 6. yt-dlp with iOS User-Agent + Browser Headers

Added `--user-agent` (iOS), `--add-header` (Origin, Referer, Accept), `--force-ipv4`, retry flags to yt-dlp audio extraction.

**Result:** Still fails from Railway with `"Sign in to confirm you're not a bot"`.

### 7. yt-dlp `--get-url` + HTTP Download

Two-phase: yt-dlp `--get-url` extracts CDN stream URL (~5s), then Node.js `fetch` downloads it.

**Result:** `--get-url` fails from Railway — same bot detection error.

### 8. Direct Audio Stream URL from HTML

Extract `ytInitialPlayerResponse.streamingData.adaptiveFormats` from watch page HTML to find direct audio CDN URLs.

**Result:** All audio formats have `signatureCipher` — no direct URLs. Requires yt-dlp's signature deciphering, which circles back to the IP block problem.

## Local vs Production

| Component        | Local (Residential IP)         | Production (Data Center IP) |
| ---------------- | ------------------------------ | --------------------------- |
| Innertube API    | Works (tested ANDROID_VR, IOS) | All 7 clients blocked       |
| Watch page HTML  | Works                          | Works                       |
| oEmbed           | Works                          | Works                       |
| yt-dlp download  | Not tested                     | Blocked                     |
| yt-dlp --get-url | Not tested                     | Blocked                     |

The only difference is the **IP address**. Your local machine has a residential IP. Vercel and Railway use data-center IPs that YouTube flags as bots.

## The Remaining Solution: YouTube Cookies

YouTube recommends authentication cookies to prove you're a real user. This is what the error message says:

> Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies for the authentication.

### How to Export YouTube Cookies

**Method 1: Browser Extension (Recommended)**

1. Install "Get cookies.txt LOCALLY" extension from Chrome Web Store
2. Go to youtube.com and log in with a Google account
3. Click the extension icon → "Export" → save as `cookies.txt`

**Method 2: yt-dlp Browser Extraction**
If running locally with a browser profile:

```bash
yt-dlp --cookies-from-browser chrome "URL"
```

**Method 3: Manual from DevTools**

1. Open Chrome DevTools → Application → Cookies → `https://www.youtube.com`
2. Copy all cookies in Netscape format (or use an extension for this)

### Cookie Lifespan

YouTube cookies **expire over time** — typically 2-4 weeks. However:

- A dedicated Google account (not your personal one) can be used just for this purpose
- yt-dlp needs the `SAPISID`, `HSID`, `SSID`, `APISID` cookies — these refresh when the account is active
- You'll need to **refresh cookies periodically** (every 2-4 weeks) by re-exporting from the browser
- For full automation: set up a headless browser that logs in, extracts cookies, and uploads them to Railway on a schedule

### Implementation Plan

Once cookies are available:

1. Store the cookie file in Railway as a secret or file mount
2. Add `--cookies /path/to/cookies.txt` to yt-dlp commands in `extractAudio`
3. Keep the oEmbed fallback for metadata as a safety net
4. Add cookie expiration monitoring (alert when yt-dlp starts failing again)

## Deployment History

| Commit         | Date  | What                                                    |
| -------------- | ----- | ------------------------------------------------------- |
| `4c6d944`      | May 8 | 7-client rotation, headers, oEmbed, duration_verified   |
| `d573d1d`      | May 8 | visitorData to all clients, MWEB, yt-dlp anti-detection |
| `33b285a`      | May 8 | yt-dlp --get-url + HTTP download two-phase              |
| `dpl_F2hXz...` | May 8 | Latest production deployment                            |
| `04386701`     | May 8 | Latest Railway deployment (worker)                      |

## References

- [yt-dlp YouTube cookies FAQ](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp)
- [yt-dlp extractors](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies)

## Future Improvements

To restore full transcript-based thread generation, one of these must be implemented:

1. **Residential proxy** — Route yt-dlp traffic through a residential IP (BrightData, Oxylabs, or a home SSH tunnel). This is the most reliable fix — makes the worker appear as a residential user.

2. **Cookie-from-same-IP** — Export cookies from the SAME IP that Railway uses (requires running a browser on the Railway container or same data center). Solves the "cookies invalidated by cross-IP usage" problem.

3. **Alternative audio source** — Use a third-party API (e.g., RapidAPI YouTube endpoints) that proxies requests through residential IPs. Adds cost per request.

4. **yt-dlp + PO token** — YouTube now supports Proof of Origin tokens. Generate a PO token from a real device and pass it to yt-dlp via `--extractor-args youtube:po_token=...`. This may work without cookies or IP restrictions.
