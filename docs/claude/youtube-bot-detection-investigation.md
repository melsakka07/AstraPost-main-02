# YouTube Bot Detection — Investigation Report

**Date:** 2026-05-08 (updated 2026-05-17 — **resolved**)
**Feature:** YouTube-to-Thread (`/api/ai/youtube-to-thread`)

> **Status (2026-05-17):** ✅ **RESOLVED end-to-end.** Production verified `mode=full` (audio download + whisper transcription + tweet thread) on multiple test jobs. The architecture documented below describes the original investigation; the current finished design is captured in:
>
> - **Memory:** `project_youtube_proxy_architecture.md` (read this FIRST for current state)
> - **Plan:** `.claude/plans/2026-05-16-youtube-proxy-bot-detection-followups.md`
> - **Latest changes:** `docs/0-MY-LATEST-UPDATES.md` (2026-05-17 entries)
>
> Key shipped fixes: 407 invalidate-and-rotate (`cac7f97`), bot-challenge typed error + 2-invalidation/job cap + 500-800ms inter-client jitter (`73e4016`), IOS-first client order (`8c2b962`), Webshare credentials rotated, `API_KEY_WEBSHARE` added to Railway, `YOUTUBE_PROXY_REDIS_TTL_SECS=300`.

## Summary

YouTube has tightened its bot detection. The feature works end-to-end **locally** but fails **in production** on both Vercel and Railway because YouTube blocks requests from data-center IP ranges.

The POST endpoint is partially functional via oEmbed fallback (returns title + thumbnail but **no duration**). The worker audio download fails without proxy or cookie support — yt-dlp is IP-blocked from Railway.

**Current mitigation (2026-05-11):** Two workarounds are implemented in `src/lib/services/youtube.ts`:

1. **`YOUTUBE_PROXY_URL`** — routes all YouTube HTTP requests through a configurable proxy (enables residential-IP appearance)
2. **`YOUTUBE_COOKIES_BASE64`** — passes YouTube auth cookies to yt-dlp (proves real user identity)

When neither is configured, the worker falls back to **title-only thread generation**: the AI generates a thread from the video title alone, without a transcript. This works reliably but produces lower-quality threads compared to transcript-based generation.

## Current Architecture

```
User submits URL
  → POST: innertube (blocked without proxy) → oEmbed (title + thumbnail)
  → Job enqueued with durationVerified=false, videoTitle set
  → Worker: detects durationVerified=false OR tries audio download (with proxy + cookies if configured)
  → If audio succeeds: transcribe → generate thread from transcript
  → If audio fails: generate thread from title via AI (title-only fallback)
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

> Each client sends a device-matched User-Agent header. Clients requiring `visitorData` (MWEB, WEB) use watch-page-scraped values. All clients now receive the scraped `visitorData` and `apiKey` when available.

### 2. Request Body Fields

Added `contentCheckOk: true` and `racyCheckOk: true` to innertube API body.

**Result:** No effect. These are required fields but don't bypass bot detection.

### 3. Browser Headers

Added `Origin: https://www.youtube.com`, `Referer: https://www.youtube.com/`, `Accept: */*` to innertube API requests.

**Result:** No effect from data-center IPs.

### 4. Watch Page Scraping

Scrape `ytcfg.set({...})` from the YouTube watch page HTML to extract fresh `INNERTUBE_API_KEY` and `VISITOR_DATA` for each request. Now passed to ALL clients in the rotation (not just WEB/MWEB), plus used to override the API key.

**Result:** Scraping works (watch page HTML loads). Fresh API key and visitorData extracted successfully and propagated to all clients. But innertube API still rejects from data-center IPs. **Verdict: IP block, not stale credentials.**

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

## Implemented Solutions

Since the original investigation, two additional workarounds have been implemented in `src/lib/services/youtube.ts`:

### YouTube Cookies (implemented)

The `YOUTUBE_COOKIES_BASE64` environment variable is now supported. When set, the cookies are decoded to `/tmp/youtube_cookies.txt` and passed to all yt-dlp invocations via `--cookies`. This allows authenticated YouTube sessions from data-center IPs.

Cookie export methods and lifespan considerations remain as documented below.

### HTTP Proxy (implemented)

The `YOUTUBE_PROXY_URL` environment variable is now supported. When set, all YouTube API calls (innertube, oEmbed, watch page, audio CDN downloads) are routed through the specified HTTP(S) proxy. This allows traffic to appear from a residential IP even when running on Vercel/Railway.

### How to Export YouTube Cookies (for YOUTUBE_COOKIES_BASE64)

**Method 1: Browser Extension (Recommended)**

1. Install "Get cookies.txt LOCALLY" extension from Chrome Web Store
2. Go to youtube.com and log in with a Google account
3. Click the extension icon → "Export" → save as `cookies.txt`
4. Base64-encode the file and set it as `YOUTUBE_COOKIES_BASE64`

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

To restore full transcript-based thread generation in production, the implemented workarounds need further hardening:

1. **Residential proxy** (partially implemented) — `YOUTUBE_PROXY_URL` is now supported. The remaining gap is sourcing a reliable residential proxy service (BrightData, Oxylabs, or a home SSH tunnel). Once configured, this makes the worker appear as a residential user.

2. **Cookie-from-same-IP** — Export cookies from the SAME IP that Railway uses (requires running a browser on the Railway container or same data center). Solves the "cookies invalidated by cross-IP usage" problem.

3. **Alternative audio source** — Use a third-party API (e.g., RapidAPI YouTube endpoints) that proxies requests through residential IPs. Adds cost per request.

4. **yt-dlp + PO token** — YouTube now supports Proof of Origin tokens. Generate a PO token from a real device and pass it to yt-dlp via `--extractor-args youtube:po_token=...`. This may work without cookies or IP restrictions.

## Lessons Learned — Tube2Threads Comparison (2026-05-09)

A reference implementation at `C:\Users\saqqa\CodeX\Tube2Threads` was analyzed to verify our findings. Tube2Threads implements the same YouTube-to-thread feature but as a simpler Next.js app with Inngest for job processing.

### Critical Confirmation: IP-Based Blocking

Tube2Threads uses **zero anti-bot-detection measures** — bare yt-dlp calls with no cookies, no custom User-Agent, no headers, no client rotation:

```bash
# Duration check (15s timeout)
yt-dlp --print duration -- <url>

# Audio extraction (180s timeout, no flags)
yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -o "<path>" -- <url>
```

Yet it works perfectly **locally**. Why? **Residential IP.** The same yt-dlp command that fails on Railway with `"Sign in to confirm you're not a bot"` succeeds from a home internet connection. This definitively proves the blocking is IP-based, not technique-based.

### Verification: No Hidden Secret

Tube2Threads was checked for any undocumented workaround — proxy config, special API keys, cookie files, custom yt-dlp plugins. None exist. The code is simpler than AstraPost's in every dimension:

| Aspect                 | Tube2Threads          | AstraPost                                |
| ---------------------- | --------------------- | ---------------------------------------- |
| Metadata source        | yt-dlp `--print` only | 7-client innertube + oEmbed              |
| Anti-bot measures      | None                  | 9 distinct approaches                    |
| Video title            | Not stored            | Stored, used in title-only mode          |
| Duration verification  | None                  | `durationVerified` flag + per-plan gates |
| Thread generation      | Raw `fetch()` + regex | Vercel AI SDK `generateObject()` + Zod   |
| Would work on Railway? | No (IP-blocked)       | Yes (title-only fallback)                |

### What We Can Learn from Tube2Threads

1. **Separate duration check** — Tube2Threads calls `yt-dlp --print duration` as a fast 15s pre-check before the expensive audio download. We could add this to AstraPost: try yt-dlp for duration first, fall back to oEmbed if blocked. This gives us accurate duration when the IP allows it and graceful degradation when it doesn't.

2. **180s download timeout** — Tube2Threads uses a more generous 180s timeout for audio extraction vs. our 120s. Worth adopting for longer videos.

### Conclusion

AstraPost's implementation is **more resilient** than Tube2Threads. Tube2Threads would break immediately if deployed to Vercel/Railway because it has no fallback for IP-blocked environments. AstraPost's oEmbed + title-only mode works from any IP, even if the thread quality is lower without a transcript. The architectural investment in multi-layered fallbacks was justified.
