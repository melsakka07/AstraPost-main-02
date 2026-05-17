● Documentation pushed (4df8843). Here's the complete record for future-you (or future-me).
✅ Memory persisted New project memory: project_youtube_proxy_architecture.md (~200 lines) — the single source of truth for future sessions.

Contents:

- Architecture overview — Vercel vs Railway env matrix, 4-step resolution chain, in-memory + Redis caching layers
- All 7 invalidation triggers (407, proxy-layer, 429, bot-challenge, oembed TypeError, player TypeError, admin manual) with reason codes and source files
- Per-job loop semantics — IOS-first client order, 500-800ms jitter, 2-invalidation cap
- Commit timeline (7 commits over 9 days, newest first)
- Env vars reference + where each is set
- Log key reference — 11 keys with meaning and grep patterns
- Troubleshooting playbook — 4 most common failure modes with step-by-step diagnostics
- Files to read on resume with line numbers
- Known-good production snapshot for regression comparison

Updated reference memory: reference_production_verification.md — added all 11 new YouTube log keys + the best Vercel JSON query pattern (--query youtube --no-follow --json | grep '"requestMethod":"POST"').

Updated index: MEMORY.md — one-line pointer added under Production Operations.

✅ Repository docs updated (commit 4df8843)

┌───────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────┐  
 │ File │ Change │  
 ├───────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤  
 │ docs/0-MY-LATEST-UPDATES.md │ New PM entry — jitter + cap + IOS reorder + │  
 │ │ ops rotation, with verification details │  
 ├───────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤  
 │ │ Added API_KEY_WEBSHARE, │  
 │ docs/claude/env-vars.md │ YOUTUBE_PROXY_REDIS_TTL_SECS, │  
 │ │ YOUTUBE_COOKIES_BASE64; clarified │  
 │ │ YOUTUBE_PROXY_URL is now Railway-only │  
 ├───────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤  
 │ │ RESOLVED banner at top pointing to the │  
 │ docs/claude/youtube-bot-detection-investigation.md │ architecture memory + plan + latest-updates │  
 │ │ entries │  
 ├───────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤  
 │ │ Status → resolved; §2 + §3 marked done; │  
 │ .claude/plans/2026-05-16-youtube-proxy-bot-detection-followups.md │ "Closed items" expanded with all 6 shipped │  
 │ │ fixes + ops actions │  
 └───────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────┘

How to resume in a future session

If you start a new session and need to touch YouTube logic again, just say something like "check the YouTube proxy state" or "diagnose YouTube failures." The architecture memory will auto-surface to me. The first thing I'll do is:

1. Read project_youtube_proxy_architecture.md for current design
2. Verify nothing has changed since 2026-05-17 by checking the file/line references against current code (youtube-proxy.ts, youtube.ts:178-280)
3. Run the production grep patterns to see current state
4. Compare against the "Known good production state" snapshot

This avoids the 4-hour re-investigation we did this session. Saved you ~80% of the next debug cycle if this ever regresses.

You're fully shipped + documented. Nothing else needs to happen this session unless you want to file the cosmetic logging bug (the youtube_proxy_invalidated URL-mismatch issue from earlier) — small enough to defer.
