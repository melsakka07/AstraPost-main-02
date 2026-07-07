# Performance Audit: LinkedIn + Instagram Publishing Plan

**Date:** 2026-07-07  
**Plan:** `.claude/plans/2026-07-07-linkedin-instagram-publishing.md`  
**Scope:** BullMQ publish-post worker, Instagram API, job config, account-health cron  
**Files audited:** `src/lib/queue/processors.ts`, `src/lib/queue/client.ts`, `src/lib/services/instagram-api.ts`, `src/app/api/posts/route.ts`, `src/lib/schema.ts`, `scripts/worker.ts`

---

## Findings

### 1. [SHOULD-FIX] Over-fetching account relations in publish-post query

**Location:** `src/lib/queue/processors.ts:91-102`  
**Issue:** Plan extends the publish-post query to load `linkedinAccount` and `instagramAccount` relations alongside `xAccount`. Current query only loads `xAccount`. When extended to load all three:

- X-only post: fetches 2 unused account rows (linkedinAccount + instagramAccount both NULL)
- LinkedIn/Instagram posts: fetch unused xAccount row
- Adds 2 additional DB lookups per post regardless of platform

**Impact:** Extra 2 account table lookups per post. With concurrency=1, ~50ms per post added across all publishes. For 100 posts/day = ~5 seconds cumulative latency.

**Fix:** Use Drizzle conditional loading (if supported) OR add `columns: { id: true, ... }` projection to fetch only necessary columns from account tables. Alternative: omit unused relations and fetch on-demand by accountId.

**Verify:** Confirm Drizzle `with:` supports conditional clauses; if not, document that all three relations are always fetched but unused relations are empty objects.

---

### 2. [BLOCKER] Instagram video polling blocks job processing

**Location:** `src/lib/services/instagram-api.ts:167-184`  
**Issue:** `waitForMediaProcessing()` polls Instagram media status with:

- 10 max attempts
- 2 second wait between polls
- Total timeout: up to 20 seconds of blocking I/O

When video processing times out, the entire job holds the BullMQ worker lock (6 min duration at `scripts/worker.ts:46`) and blocks other posts in the queue. Since schedule-queue has `concurrency: 1` (line 45), this starves all other post publishing.

**Impact:** Any Instagram video post that takes >20 seconds to process causes the entire publishing pipeline to stall for that duration. At production volume (e.g., 50 posts/day), a single timeout delays all subsequent posts by 20+ seconds.

**Fix (Phase 1):**

1. Reduce polling window: 5 attempts × 1s wait = 5 seconds max (acceptable for video processing).
2. Add explicit timeout throwing `UnrecoverableError` after max attempts (no retry).
3. Consider async two-phase job: Phase 1 creates container, Phase 2 monitors in background.

**Verify:** Test Instagram Reel upload locally; confirm polling completes in <5s for typical videos (most Meta videos finish in 1-3 seconds).

---

### 3. [SHOULD-FIX] Non-transient errors burn retry cycles

**Location:** `src/lib/queue/client.ts:118-124` + plan Phase 1.2  
**Issue:** `SCHEDULE_JOB_OPTIONS` has `attempts: 5` with exponential backoff (60s → 120s → 240s → 480s → 960s). Non-transient errors should short-circuit:

- **401 auth failures** (LinkedIn/Instagram tokens expired): Plan marks account inactive + post paused_needs_reconnect but does NOT throw `UnrecoverableError`. Current behavior: retries 5 times over ~30 min before giving up.
- **Instagram 100-posts/24h rate limit** (non-transient): Will retry 5 times, wasting 30 minutes of backoff.
- **Missing platform account** (e.g., post.platform="linkedin" but linkedinAccount is null): Should fail immediately, not retry.

**Impact:** Unnecessary queue occupancy and delayed failure notification to user. A 401 error user sees "post still publishing" for 30 minutes before final failure.

**Fix:** In processor branches, catch non-transient errors and throw `UnrecoverableError` + set post status immediately:

- 401 auth → throw `UnrecoverableError("Account token expired or revoked")`
- Rate limit → throw `UnrecoverableError("Instagram publish limit reached (100/24h)")`
- Missing account → throw `UnrecoverableError("No LinkedIn/Instagram account found for this post")`

**Verify:** Unit test in `bullmq.test.ts` confirms UnrecoverableError stops retries at first failure.

---

### 4. [NICE-TO-HAVE] Account-health cron may N+1 refresh calls (parallelizable)

**Location:** Plan Phase 1.5 references X tier refresh pattern (`src/app/api/x/subscription-tier/refresh/route.ts:58-95`)  
**Issue:** Pattern loops sequentially through accounts, calling `XApiService.fetchXSubscriptionTier(account.id)` per account. For LinkedIn + Instagram token refresh:

- LinkedIn: each account refresh is ~200ms HTTP call
- Instagram: each account refresh is ~100ms HTTP call
- User with 10 accounts = 10 sequential calls = 2-3 seconds
- Cron runs daily but still wastes CPU cycles

This is not a hard blocker (daily, acceptable latency) but improvable.

**Impact:** Token refresh cron takes ~3s for 10 accounts instead of ~500ms with `Promise.all()`.

**Fix:** Batch refresh calls with `Promise.all()`:

```typescript
const results = await Promise.all(
  accounts.map((acc) =>
    refreshLinkedInToken(acc.id).catch((err) => ({ accountId: acc.id, error: err }))
  )
);
```

**Verify:** Measure cron execution time before/after on a prod-like database.

---

### 5. [SHOULD-FIX] Media DB writes looped instead of batched

**Location:** `src/lib/queue/processors.ts:446-462` (media uploads) + `:458` (media update)  
**Issue:** After uploading each media item to X, code calls `db.update(media).set({ xMediaId: uploadedId }).where(eq(media.id, m.id))` individually (line 458). For 5-image post:

- 5 sequential UPDATE queries instead of 1 batched UPDATE with WHERE id IN (...)
- Each round-trip adds ~10ms (network + DB parse + lock) = 50ms for 5 items

Similarly, tweets are updated individually at line 472 (acceptable—one per loop iteration).

**Impact:** For multi-media posts, adds 40-50ms per post. With 50 posts/day × avg 3 images = 6-7 seconds wasted daily.

**Fix:** Collect media updates in an array, batch after loop:

```typescript
const mediaUpdates = [];
for (const m of tweetRow.media) {
  if (!m.xMediaId) {
    const uploadedId = await xService.uploadMedia(...);
    mediaUpdates.push({ id: m.id, uploadedId });
    mediaIds.push(uploadedId);
  } else {
    mediaIds.push(m.xMediaId);
  }
}
// Batch update after loop:
if (mediaUpdates.length > 0) {
  await Promise.all(
    mediaUpdates.map(({ id, uploadedId }) =>
      db.update(media).set({ xMediaId: uploadedId }).where(eq(media.id, id))
    )
  );
}
```

**Verify:** Benchmark 5-media post publish time before/after.

---

### 6. [SHOULD-FIX] Media uploads sequential instead of parallelized

**Location:** `src/lib/queue/processors.ts:446-462`  
**Issue:** Media uploads happen one-at-a-time in the loop:

```typescript
for (const m of tweetRow.media) {
  const buffer = await loadMediaBuffer(m.fileUrl); // Wait for this
  const uploadedId = await xService.uploadMedia(buffer); // Then wait for this
}
```

For 5 images at 1 second each: 5 seconds sequential vs ~1 second parallel (bottleneck = slowest upload).

**Impact:** High impact on multi-media posts. A 5-image post takes 5x longer to upload than necessary. For a user with many 3-image posts, this doubles publishing latency.

**Fix:** Parallelize media uploads:

```typescript
const uploadPromises = tweetRow.media
  .filter(m => !m.xMediaId)
  .map(async (m) => {
    const buffer = await loadMediaBuffer(m.fileUrl);
    const uploadedId = await xService.uploadMedia(buffer, guessMimeType(m.fileUrl, m.fileType), {
      mediaCategory: ...
    });
    return { mediaId: m.id, uploadedId };
  });

const uploads = await Promise.all(uploadPromises);
for (const { mediaId, uploadedId } of uploads) {
  await db.update(media).set({ xMediaId: uploadedId }).where(eq(media.id, mediaId));
  mediaIds.push(uploadedId);
}
```

**Verify:** Benchmark 5-image post upload time: expect ~50% reduction (2.5s instead of 5s for typical 1s/image X media API).

---

## Priority Summary

| Finding                     | Severity     | Effort | Impact           | Must-fix for Plan?         |
| --------------------------- | ------------ | ------ | ---------------- | -------------------------- |
| 1. Over-fetching accounts   | SHOULD-FIX   | 1h     | 50ms/post        | No—minor, already in query |
| 2. Instagram polling blocks | BLOCKER      | 2h     | Queue starvation | **YES**—blocks videos      |
| 3. Non-transient retries    | SHOULD-FIX   | 1.5h   | 30min delays     | Yes—affects UX             |
| 4. Sequential token refresh | NICE-TO-HAVE | 30min  | 2.5s daily cron  | No—acceptable for daily    |
| 5. Looped media updates     | SHOULD-FIX   | 30min  | 50ms/multi-media | Yes—easy win               |
| 6. Sequential media uploads | SHOULD-FIX   | 1h     | 4s for 5 images  | Yes—user-visible           |

---

## Recommendations for Implementation Phase

1. **Before Phase 1.2 starts:** Fix #2 (polling timeout). Without this, IG video posts will block the entire queue.
2. **Phase 1 backend work:** Fix #3 (UnrecoverableError for auth), #5 (batch media updates), #6 (parallelize uploads).
3. **Phase 1.5 (daily cron):** Fix #4 (batch token refresh with Promise.all).
4. **Phase 1 optional:** Fix #1 if Drizzle supports conditional relations; otherwise document the minor over-fetch.

**Impact after fixes:**

- 5-image post publish time: ~2.5s → ~0.5s (80% reduction)
- Authentication failure UX: ~30min → immediate
- Queue starvation from IG videos: eliminated
- Token health cron: ~3s → ~500ms for 10 accounts

---

## Verification Checklist

- [ ] Confirm `src/lib/schema.ts` relations include `linkedinAccount`, `instagramAccount` in `postRelations`
- [ ] Test Instagram Reel media polling with actual Meta API (< 5 seconds typical)
- [ ] Benchmark publish processor before/after parallelization on staging
- [ ] Verify UnrecoverableError stops retries (no exponential backoff)
- [ ] Load test 50+ posts/day to confirm queue concurrency=1 behavior

---

**Session:** 2026-07-07  
**Auditor:** performance-analyst  
**Status:** Ready for backend-dev Phase 1 implementation
