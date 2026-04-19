PS C:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02> pnpm run test

> astrapost@0.1.0 test C:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02
> vitest run

RUN v4.0.18 C:/Users/saqqa/CodeX/AstraPost-main/AstraPost-main-02

✓ src/lib/security/token-encryption.test.ts (12 tests) 114ms
stdout | src/lib/services/x-api.test.ts > XApiService > should post a single tweet
{"ts":"2026-04-17T19:49:00.220Z","level":"info","msg":"x_tweet_posted","tweetId":"123","hasMedia":false}

stdout | src/lib/services/x-api.test.ts > XApiService > should post a tweet with media
{"ts":"2026-04-17T19:49:00.224Z","level":"info","msg":"x_tweet_posted","tweetId":"123","hasMedia":true}

stdout | src/lib/services/x-api.test.ts > XApiService > should upload media
{"ts":"2026-04-17T19:49:00.228Z","level":"info","msg":"x_media_upload_initialized","mediaId":"media-123","mediaCategory":"tweet_image","totalBytes":10}

stdout | src/lib/services/x-api.test.ts > XApiService > should upload media
{"ts":"2026-04-17T19:49:00.228Z","level":"debug","msg":"x_media_upload_chunk_appended","mediaId":"media-123","chunk":1,"total":1}
{"ts":"2026-04-17T19:49:00.228Z","level":"info","msg":"x_media_upload_chunks_complete","mediaId":"media-123","totalChunks":1}

stdout | src/lib/services/x-api.test.ts > XApiService > should upload media
{"ts":"2026-04-17T19:49:00.229Z","level":"info","msg":"x_media_upload_finalized","mediaId":"media-123"}

stdout | src/lib/services/x-api.test.ts > XApiService token refresh > should refresh token with lock when shouldRefresh is true
{"ts":"2026-04-17T19:49:00.230Z","level":"info","msg":"x_token_refresh_start","xAccountId":"acc_1","userId":"user_1"}

stdout | src/lib/services/x-api.test.ts > XApiService token refresh > should refresh token with lock when shouldRefresh is true
{"ts":"2026-04-17T19:49:00.231Z","level":"info","msg":"x_refresh_token_received","xAccountId":"acc_1","fingerprint":"2819de3016f55e3919f5e59c4e2caae5065bc22f9ada8e71758b44f9c0d247b0"}

stdout | src/lib/services/x-api.test.ts > XApiService token refresh > should refresh token with lock when shouldRefresh is true
{"ts":"2026-04-17T19:49:00.231Z","level":"info","msg":"x_token_refresh_success","xAccountId":"acc_1","userId":"user_1"}

stdout | src/lib/services/x-api.test.ts > XApiService token refresh > should wait for lock and re-read DB if lock is held  
{"ts":"2026-04-17T19:49:00.233Z","level":"info","msg":"x_token_refresh_lock_contended","xAccountId":"acc_1","userId":"user_1","waitMs":1500}

✓ src/app/api/ai/agentic/[id]/approve/route.test.ts (7 tests) 46ms
stderr | src/app/api/billing/change-plan/**tests**/route.test.ts > POST /api/billing/change-plan > handles Stripe API failure gracefully  
{"ts":"2026-04-17T19:49:00.320Z","level":"error","msg":"[billing] change-plan error:","error":{}}

✓ src/app/api/billing/change-plan/**tests**/route.test.ts (5 tests) 48ms
❯ src/lib/middleware/require-plan.test.ts (18 tests | 6 failed) 58ms
✓ trial user gets Pro feature access (agentic posting) 3ms
✓ trial user is capped at 3 X accounts (Pro limit) 2ms
✓ trial user AI quota is capped at Pro limit (100) 2ms
✓ trial user CANNOT access LinkedIn (Agency-only) 1ms
✓ trial user gets csv_pdf analytics export (not white_label_pdf) 1ms
× expired trial user is blocked from Pro features 8ms
× expired trial user is capped at Free post limit (20) 2ms
✓ paid Pro user can use agentic posting (unaffected by trial logic) 1ms
× paid Agency user can access LinkedIn (unaffected by trial logic) 1ms
× Free user blocked at 2nd account (limit is 1) 2ms
✓ Pro user allowed up to 3 accounts 1ms
✓ Pro user blocked at 4th account (limit is 3) 1ms
× Agency user allowed up to 10 accounts 1ms
✓ Agency user blocked at 11th account (limit is 10) 1ms
× Pro Annual user allowed up to 4 accounts 1ms
✓ Pro Annual user blocked at 5th account (limit is 4) 1ms
✓ builds a detailed and stable 402 payload 1ms
✓ returns HTTP 402 with JSON details 23ms
stdout | src/app/api/ai/thread/**tests**/route.test.ts > AI Thread API — Tier Validation > single mode with medium/long option > should trigger tier re-fetch when cached data is stale (>24h)
{"ts":"2026-04-17T19:49:01.673Z","level":"info","msg":"tier_refreshed_inline","accountId":"550e8400-e29b-41d4-a716-446655440001","tier":"None"}

✓ src/app/api/ai/thread/**tests**/route.test.ts (10 tests) 49ms
stderr | src/lib/services/x-api.test.ts > XApiService.getSubscriptionTier > throws 'X_SESSION_EXPIRED' on 401 response
{"ts":"2026-04-17T19:49:01.747Z","level":"error","msg":"x_subscription_tier_fetch_failed","status":401,"body":"Unauthorized"}

stderr | src/lib/services/x-api.test.ts > XApiService.getSubscriptionTier > throws 'X_RATE_LIMITED' on 429 response
{"ts":"2026-04-17T19:49:01.749Z","level":"error","msg":"x_subscription_tier_fetch_failed","status":429,"body":"Rate limited"}

stderr | src/lib/services/x-api.test.ts > XApiService.getSubscriptionTier > throws generic error on other HTTP errors
{"ts":"2026-04-17T19:49:01.749Z","level":"error","msg":"x_subscription_tier_fetch_failed","status":500,"body":"Internal Server Error"}

✓ src/lib/services/x-api.test.ts (14 tests) 1532ms
✓ should wait for lock and re-read DB if lock is held 1510ms
✓ src/app/api/team/invite/**tests**/route.test.ts (6 tests) 47ms
✓ src/app/api/billing/checkout/**tests**/route.test.ts (4 tests) 81ms
✓ src/app/api/x/accounts/[id]/route.test.ts (10 tests) 51ms
✓ src/app/api/ai/image/**tests**/route.test.ts (5 tests) 89ms
✓ src/app/api/team/join/**tests**/route.test.ts (7 tests) 42ms
stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > sets post status to 'published' after successful tweet
{"ts":"2026-04-17T19:49:04.702Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > sets post status to 'published' after successful tweet
{"ts":"2026-04-17T19:49:04.707Z","level":"info","msg":"recurrence_scheduled","oldPostId":"post-1","newPostId":"ddb90630-7f32-425e-956f-14c992edba9d","nextDate":"2026-04-17T19:49:04.701Z"}
{"ts":"2026-04-17T19:49:04.707Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a jobRuns 'running' record and then updates it to 'success'
{"ts":"2026-04-17T19:49:04.709Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a jobRuns 'running' record and then updates it to 'success'
{"ts":"2026-04-17T19:49:04.709Z","level":"info","msg":"recurrence_scheduled","oldPostId":"post-1","newPostId":"0521d52f-7c8f-47a8-8612-927a09d92dfd","nextDate":"2026-04-17T19:49:04.709Z"}
{"ts":"2026-04-17T19:49:04.709Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > publishes all tweets in a thread with correct reply chaining
{"ts":"2026-04-17T19:49:04.710Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > publishes all tweets in a thread with correct reply chaining
{"ts":"2026-04-17T19:49:04.711Z","level":"info","msg":"recurrence_scheduled","oldPostId":"post-1","newPostId":"e54e34c6-421e-4f63-afac-d7c45e013fd7","nextDate":"2026-04-17T19:49:04.710Z"}
{"ts":"2026-04-17T19:49:04.711Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > sets post status to 'failed' when the X API rejects
{"ts":"2026-04-17T19:49:04.713Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > sets post status to 'failed' when the X API rejects  
{"ts":"2026-04-17T19:49:04.714Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"403 Forbidden","attempts":1,"attemptsMade":0,"final":true}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a jobRuns record with status 'failed' on X API error
{"ts":"2026-04-17T19:49:04.716Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a jobRuns record with status 'failed' on X API error
{"ts":"2026-04-17T19:49:04.716Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"429 Too Many Requests","attempts":1,"attemptsMade":0,"final":true}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > exits without calling the X API when post is not in 'scheduled' status
{"ts":"2026-04-17T19:49:04.717Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > exits without calling the X API when post is not in 'scheduled' status
{"ts":"2026-04-17T19:49:04.717Z","level":"info","msg":"schedule_job_skipped","queue":"schedule-queue","jobId":"job-1","postId":"post-1","status":"draft"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > throws when the post is not found (so BullMQ records the failure)
{"ts":"2026-04-17T19:49:04.718Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > throws when the post is not found (so BullMQ records the failure)  
{"ts":"2026-04-17T19:49:04.718Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"Post post-1 not found","attempts":5,"attemptsMade":0,"final":false}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > throws when xAccountId is null  
{"ts":"2026-04-17T19:49:04.719Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > throws when xAccountId is null  
{"ts":"2026-04-17T19:49:04.719Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"Post has no associated X account","attempts":5,"attemptsMade":0,"final":false}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > sets post status to 'failed' (not 'scheduled') on the final retry attempt  
{"ts":"2026-04-17T19:49:04.720Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > sets post status to 'failed' (not 'scheduled') on the final retry attempt
{"ts":"2026-04-17T19:49:04.720Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"X API permanently unavailable","attempts":3,"attemptsMade":2,"final":true}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > keeps post status as 'scheduled' on a non-final retry attempt  
{"ts":"2026-04-17T19:49:04.721Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > keeps post status as 'scheduled' on a non-final retry attempt
{"ts":"2026-04-17T19:49:04.722Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"X API transient error","attempts":5,"attemptsMade":1,"final":false}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a jobRuns record with status 'retrying' on a non-final attempt  
{"ts":"2026-04-17T19:49:04.722Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a jobRuns record with status 'retrying' on a non-final attempt
{"ts":"2026-04-17T19:49:04.723Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"Temporary failure","attempts":5,"attemptsMade":0,"final":false}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a notification on the final failed attempt  
{"ts":"2026-04-17T19:49:04.723Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a notification on the final failed attempt
{"ts":"2026-04-17T19:49:04.724Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"Permanent X API error","attempts":1,"attemptsMade":0,"final":true}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > inserts a notification on the final failed attempt
{"ts":"2026-04-17T19:49:04.725Z","level":"warn","msg":"email_resend_not_configured","to":"user@example.com","subject":"Action Required: Post Publishing Failed","metadata":{"postId":"post-1","reason":"Permanent X API error","type":"post_failure"}}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > does NOT insert a notification on a non-final retry attempt  
{"ts":"2026-04-17T19:49:04.726Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > does NOT insert a notification on a non-final retry attempt  
{"ts":"2026-04-17T19:49:04.726Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"Transient failure","attempts":5,"attemptsMade":0,"final":false}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > deactivates account and pauses post on X 401 errors (no throw when no token)  
{"ts":"2026-04-17T19:49:04.727Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > deactivates account and pauses post on X 401 errors (no throw when no token)
{"ts":"2026-04-17T19:49:04.727Z","level":"warn","msg":"schedule_job_paused_needs_reconnect","queue":"schedule-queue","jobId":"job-1","postId":"post-1","xAccountId":"acc-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > skips already-published tweets (idempotency on retry)  
{"ts":"2026-04-17T19:49:04.727Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > skips already-published tweets (idempotency on retry)  
{"ts":"2026-04-17T19:49:04.728Z","level":"info","msg":"recurrence_scheduled","oldPostId":"post-1","newPostId":"48f2de56-2243-4627-a761-33ee6d6c634c","nextDate":"2026-04-17T19:49:04.727Z"}  
{"ts":"2026-04-17T19:49:04.728Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > fails with TIER_LIMIT_EXCEEDED when Free tier account has content > 280 chars
{"ts":"2026-04-17T19:49:04.728Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > fails with TIER_LIMIT_EXCEEDED when Free tier account has content > 280 chars  
{"ts":"2026-04-17T19:49:04.729Z","level":"warn","msg":"schedule_job_tier_limit_exceeded","queue":"schedule-queue","jobId":"job-1","postId":"post-1","code":"TIER_LIMIT_EXCEEDED","message":"Post exceeds 280 characters but the target X account (@freeuser) is on the None tier. X Premium is required for posts longer than 280 characters.","postLength":300,"accountTier":"None","maxAllowed":280}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > fails with TIER_LIMIT_EXCEEDED when Free tier account has content > 280 chars  
{"ts":"2026-04-17T19:49:04.729Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"[vitest] No \"UnrecoverableError\" export is defined on the \"bullmq\" mock. Did you forget to return it from \"vi.mock\"?\nIf you need to partially mock a module, you can use \"importOriginal\" helper inside:\n","attempts":1,"attemptsMade":0,"final":true}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > fails with TIER_LIMIT_EXCEEDED when Premium tier account has content > 2000 chars  
{"ts":"2026-04-17T19:49:04.730Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > fails with TIER_LIMIT_EXCEEDED when Premium tier account has content > 2000 chars  
{"ts":"2026-04-17T19:49:04.730Z","level":"warn","msg":"schedule_job_tier_limit_exceeded","queue":"schedule-queue","jobId":"job-1","postId":"post-1","code":"TIER_LIMIT_EXCEEDED","message":"Post exceeds 2000 characters but the target X account (@premiumuser) is on the Premium tier. Posts longer than 2,000 characters are not supported.","postLength":2100,"accountTier":"Premium","maxAllowed":2000}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > fails with TIER_LIMIT_EXCEEDED when Premium tier account has content > 2000 chars  
{"ts":"2026-04-17T19:49:04.730Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"[vitest] No \"UnrecoverableError\" export is defined on the \"bullmq\" mock. Did you forget to return it from \"vi.mock\"?\nIf you need to partially mock a module, you can use \"importOriginal\" helper inside:\n","attempts":1,"attemptsMade":0,"final":true}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > allows Premium tier account to post content between 281-2000 chars
{"ts":"2026-04-17T19:49:04.731Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > allows Premium tier account to post content between 281-2000 chars
{"ts":"2026-04-17T19:49:04.734Z","level":"info","msg":"recurrence_scheduled","oldPostId":"post-1","newPostId":"c439f56c-4f84-4106-aeb9-7ff930862a76","nextDate":"2026-04-17T19:49:04.731Z"}
{"ts":"2026-04-17T19:49:04.734Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > allows Free tier account to post content <= 280 chars
{"ts":"2026-04-17T19:49:04.735Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > allows Free tier account to post content <= 280 chars
{"ts":"2026-04-17T19:49:04.735Z","level":"info","msg":"recurrence_scheduled","oldPostId":"post-1","newPostId":"3b87a602-b2c8-40e9-b6a3-19877dda2cef","nextDate":"2026-04-17T19:49:04.735Z"}
{"ts":"2026-04-17T19:49:04.735Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > allows Basic tier account to post long content
{"ts":"2026-04-17T19:49:04.736Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > allows Basic tier account to post long content
{"ts":"2026-04-17T19:49:04.736Z","level":"info","msg":"recurrence_scheduled","oldPostId":"post-1","newPostId":"a2539bd8-fff7-43f8-8f19-8c6ef7879182","nextDate":"2026-04-17T19:49:04.736Z"}
{"ts":"2026-04-17T19:49:04.736Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stdout | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > handles null tier as Free tier (280 char limit)
{"ts":"2026-04-17T19:49:04.737Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job-1","postId":"post-1"}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > handles null tier as Free tier (280 char limit)  
{"ts":"2026-04-17T19:49:04.737Z","level":"warn","msg":"schedule_job_tier_limit_exceeded","queue":"schedule-queue","jobId":"job-1","postId":"post-1","code":"TIER_LIMIT_EXCEEDED","message":"Post exceeds 280 characters but the target X account (@unknownuser) is on the None tier. X Premium is required for posts longer than 280 characters.","postLength":300,"accountTier":"None","maxAllowed":280}

stderr | src/lib/queue/processors.integration.test.ts > scheduleProcessor — integration > handles null tier as Free tier (280 char limit)  
{"ts":"2026-04-17T19:49:04.738Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job-1","postId":"post-1","error":"[vitest] No \"UnrecoverableError\" export is defined on the \"bullmq\" mock. Did you forget to return it from \"vi.mock\"?\nIf you need to partially mock a module, you can use \"importOriginal\" helper inside:\n","attempts":1,"attemptsMade":0,"final":true}

✓ src/lib/queue/processors.integration.test.ts (21 tests) 41ms  
stderr | src/app/api/billing/webhook/route.test.ts > POST /api/billing/webhook > returns 500 when STRIPE_SECRET_KEY is missing
{"ts":"2026-04-17T19:49:05.105Z","level":"error","msg":"[billing] Stripe config missing — webhook disabled"}

stderr | src/app/api/billing/webhook/route.test.ts > POST /api/billing/webhook > returns 500 when STRIPE_WEBHOOK_SECRET is missing
{"ts":"2026-04-17T19:49:05.110Z","level":"error","msg":"[billing] Stripe config missing — webhook disabled"}

stderr | src/app/api/billing/webhook/route.test.ts > POST /api/billing/webhook > returns 400 when Stripe signature verification fails
{"ts":"2026-04-17T19:49:05.112Z","level":"error","msg":"Webhook signature verification failed","error":{}}

stderr | src/app/api/billing/webhook/route.test.ts > POST /api/billing/webhook > syncs user.plan and upserts subscription on checkout.session.completed
{"ts":"2026-04-17T19:49:05.120Z","level":"error","msg":"webhook_side_effect_failed:referral_credit_award","error":{}}

stderr | src/app/api/billing/webhook/route.test.ts > POST /api/billing/webhook > returns 500 when checkout.session.completed is missing userId metadata
{"ts":"2026-04-17T19:49:05.121Z","level":"error","msg":"Stripe webhook processing failed","eventType":"checkout.session.completed","eventId":"evt_checkout_session_completed","error":{}}

✓ src/app/api/billing/validate-promo/**tests**/route.test.ts (4 tests) 41ms  
stderr | src/app/api/billing/webhook/route.test.ts > POST /api/billing/webhook > updates user.plan when subscription plan changes
{"ts":"2026-04-17T19:49:05.124Z","level":"warn","msg":"webhook_subscription_plan_synced","userId":"user-1","oldPlan":"pro_monthly","newPlan":"pro_annual","stripeSubscriptionId":"sub_test"}

✓ src/app/api/billing/status/**tests**/route.test.ts (4 tests) 39ms
✓ src/app/api/billing/webhook/route.test.ts (12 tests) 50ms
✓ src/lib/services/agentic-pipeline.test.ts (5 tests) 14ms
✓ src/app/api/billing/usage/**tests**/route.test.ts (3 tests) 38ms
✓ src/lib/services/**tests**/ai-image.test.ts (7 tests) 81ms
✓ src/lib/services/x-subscription.test.ts (26 tests) 11ms
✓ src/lib/x-post-length.test.ts (31 tests) 10ms
✓ src/lib/ai/agentic-types.test.ts (11 tests) 9ms
✓ src/lib/**tests**/cache.test.ts (3 tests) 6ms
✓ src/lib/plan-limits.test.ts (2 tests) 4ms
✓ src/lib/services/ai-quota.test.ts (2 tests) 6ms
✓ src/lib/services/analytics.test.ts (1 test) 6ms
stdout | src/lib/queue/bullmq.test.ts > Schedule Processor > should process a single scheduled tweet
{"ts":"2026-04-17T19:49:08.537Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job1","postId":"post1"}

stdout | src/lib/queue/bullmq.test.ts > Schedule Processor > should process a single scheduled tweet
{"ts":"2026-04-17T19:49:08.541Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job1","postId":"post1"}

stdout | src/lib/queue/bullmq.test.ts > Schedule Processor > should process a thread
{"ts":"2026-04-17T19:49:08.545Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job2","postId":"post2"}

stdout | src/lib/queue/bullmq.test.ts > Schedule Processor > should process a thread
{"ts":"2026-04-17T19:49:08.546Z","level":"info","msg":"schedule_job_completed","queue":"schedule-queue","jobId":"job2","postId":"post2"}

stdout | src/lib/queue/bullmq.test.ts > Schedule Processor > should skip if post is not scheduled
{"ts":"2026-04-17T19:49:08.547Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job3","postId":"post3"}

stdout | src/lib/queue/bullmq.test.ts > Schedule Processor > should skip if post is not scheduled
{"ts":"2026-04-17T19:49:08.547Z","level":"info","msg":"schedule_job_skipped","queue":"schedule-queue","jobId":"job3","postId":"post3","status":"draft"}

stdout | src/lib/queue/bullmq.test.ts > Schedule Processor > should handle errors and update status to failed
{"ts":"2026-04-17T19:49:08.548Z","level":"info","msg":"schedule_job_started","queue":"schedule-queue","jobId":"job4","postId":"post4"}

stderr | src/lib/queue/bullmq.test.ts > Schedule Processor > should handle errors and update status to failed  
{"ts":"2026-04-17T19:49:08.549Z","level":"error","msg":"schedule_job_failed","queue":"schedule-queue","jobId":"job4","postId":"post4","error":"API Error","attempts":2,"attemptsMade":1,"final":true}

✓ src/lib/queue/bullmq.test.ts (4 tests) 17ms  
stdout | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > does nothing when no tokens are expiring
{"ts":"2026-04-17T19:49:09.748Z","level":"info","msg":"token_health_job_started","queue":"token-health-queue","jobId":"job-123","correlationId":"corr-123"}

stdout | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > does nothing when no tokens are expiring
{"ts":"2026-04-17T19:49:09.750Z","level":"info","msg":"token_health_no_expiring_tokens","correlationId":"corr-123"}

stdout | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > creates notifications for expiring tokens
{"ts":"2026-04-17T19:49:09.752Z","level":"info","msg":"token_health_job_started","queue":"token-health-queue","jobId":"job-123","correlationId":"corr-123"}

stdout | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > creates notifications for expiring tokens
{"ts":"2026-04-17T19:49:09.752Z","level":"info","msg":"token_health_expiring_found","correlationId":"corr-123","count":1}

stdout | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > creates notifications for expiring tokens
{"ts":"2026-04-17T19:49:09.752Z","level":"info","msg":"token_health_notification_created","correlationId":"corr-123","userId":"user-123","xUsername":"testuser","hoursUntilExpiry":23}
{"ts":"2026-04-17T19:49:09.752Z","level":"info","msg":"token_health_job_completed","queue":"token-health-queue","jobId":"job-123","correlationId":"corr-123","summary":{"totalChecked":1,"notificationsCreated":1,"notificationErrors":0}}

stdout | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > continues processing if one notification insert fails
{"ts":"2026-04-17T19:49:09.753Z","level":"info","msg":"token_health_job_started","queue":"token-health-queue","jobId":"job-123","correlationId":"corr-123"}

stdout | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > continues processing if one notification insert fails
{"ts":"2026-04-17T19:49:09.754Z","level":"info","msg":"token_health_expiring_found","correlationId":"corr-123","count":2}

stderr | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > continues processing if one notification insert fails  
{"ts":"2026-04-17T19:49:09.754Z","level":"warn","msg":"token_health_notification_failed","correlationId":"corr-123","userId":"user-1","xUsername":"user1","error":"DB Error"}

stdout | src/lib/queue/**tests**/token-health-processor.test.ts > tokenHealthProcessor > continues processing if one notification insert fails  
{"ts":"2026-04-17T19:49:09.754Z","level":"info","msg":"token_health_notification_created","correlationId":"corr-123","userId":"user-2","xUsername":"user2","hoursUntilExpiry":23}  
{"ts":"2026-04-17T19:49:09.754Z","level":"info","msg":"token_health_job_completed","queue":"token-health-queue","jobId":"job-123","correlationId":"corr-123","summary":{"totalChecked":2,"notificationsCreated":1,"notificationErrors":1}}

✓ src/lib/queue/**tests**/token-health-processor.test.ts (3 tests) 10ms
stdout | src/lib/queue/**tests**/analytics-processor.test.ts > analyticsProcessor > calls refreshFollowersAndMetricsForRuns when runIds are provided
{"ts":"2026-04-17T19:49:09.996Z","level":"info","msg":"analytics_job_started","queue":"analytics-queue","jobId":"job-123","correlationId":"corr-123"}

stdout | src/lib/queue/**tests**/analytics-processor.test.ts > analyticsProcessor > calls refreshFollowersAndMetricsForRuns when runIds are provided
{"ts":"2026-04-17T19:49:09.997Z","level":"info","msg":"analytics_job_completed","queue":"analytics-queue","jobId":"job-123","correlationId":"corr-123","mode":"runs","runIdsCount":2}

stdout | src/lib/queue/**tests**/analytics-processor.test.ts > analyticsProcessor > calls updateTweetMetrics when runIds are empty
{"ts":"2026-04-17T19:49:09.999Z","level":"info","msg":"analytics_job_started","queue":"analytics-queue","jobId":"job-123","correlationId":"corr-123"}

stdout | src/lib/queue/**tests**/analytics-processor.test.ts > analyticsProcessor > calls updateTweetMetrics when runIds are empty
{"ts":"2026-04-17T19:49:09.999Z","level":"info","msg":"analytics_job_completed","queue":"analytics-queue","jobId":"job-123","correlationId":"corr-123","mode":"periodic"}

stdout | src/lib/queue/**tests**/analytics-processor.test.ts > analyticsProcessor > calls updateTweetMetrics when runIds are missing
{"ts":"2026-04-17T19:49:09.999Z","level":"info","msg":"analytics_job_started","queue":"analytics-queue","jobId":"job-123","correlationId":"corr-123"}

stdout | src/lib/queue/**tests**/analytics-processor.test.ts > analyticsProcessor > calls updateTweetMetrics when runIds are missing
{"ts":"2026-04-17T19:49:09.999Z","level":"info","msg":"analytics_job_completed","queue":"analytics-queue","jobId":"job-123","correlationId":"corr-123","mode":"periodic"}

✓ src/lib/queue/**tests**/analytics-processor.test.ts (3 tests) 6ms

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

FAIL src/lib/middleware/require-plan.test.ts > Trial System > expired trial user is blocked from Pro features
AssertionError: expected true to be false // Object.is equality

- Expected

* Received

- false

* true

❯ src/lib/middleware/require-plan.test.ts:119:28
117| mockFindFirst.mockResolvedValue({ plan: "free", trialEndsAt: pastDate, createdAt: new Date() });
118| const result = await checkAgenticPostingAccessDetailed("user-1");
119| expect(result.allowed).toBe(false);
| ^
120| });
121|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

FAIL src/lib/middleware/require-plan.test.ts > Trial System > expired trial user is capped at Free post limit (20)  
AssertionError: expected true to be false // Object.is equality

- Expected

* Received

- false

* true

❯ src/lib/middleware/require-plan.test.ts:130:28
128| });
129| const result = await checkPostLimitDetailed("user-1", 1);
130| expect(result.allowed).toBe(false);
| ^
131| if (!result.allowed) {
132| expect(result.limit).toBe(20);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

FAIL src/lib/middleware/require-plan.test.ts > Trial System > paid Agency user can access LinkedIn (unaffected by trial logic)
AssertionError: expected false to be true // Object.is equality

- Expected

* Received

- true

* false

❯ src/lib/middleware/require-plan.test.ts:149:28
147| mockFindFirst.mockResolvedValue({ plan: "agency", trialEndsAt: null, createdAt: new Date() });
148| const result = await checkLinkedinAccessDetailed("user-1");
149| expect(result.allowed).toBe(true);
| ^
150| });
151| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯

FAIL src/lib/middleware/require-plan.test.ts > Multi-Account Limits > Free user blocked at 2nd account (limit is 1)  
AssertionError: expected true to be false // Object.is equality

- Expected

* Received

- false

* true

❯ src/lib/middleware/require-plan.test.ts:170:28
168| });
169| const result = await checkAccountLimitDetailed("user-1", 1);
170| expect(result.allowed).toBe(false);
| ^
171| });
172|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/6]⎯

FAIL src/lib/middleware/require-plan.test.ts > Multi-Account Limits > Agency user allowed up to 10 accounts
AssertionError: expected false to be true // Object.is equality

- Expected

* Received

- true

* false

❯ src/lib/middleware/require-plan.test.ts:211:28
209| });
210| const result = await checkAccountLimitDetailed("user-1", 1);
211| expect(result.allowed).toBe(true);
| ^
212| });
213|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯

FAIL src/lib/middleware/require-plan.test.ts > Multi-Account Limits > Pro Annual user allowed up to 4 accounts
AssertionError: expected false to be true // Object.is equality

- Expected

* Received

- true

* false

❯ src/lib/middleware/require-plan.test.ts:237:28
235| });
236| const result = await checkAccountLimitDetailed("user-1", 1);
237| expect(result.allowed).toBe(true);
| ^
238| });
239|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯

Test Files 1 failed | 27 passed (28)
Tests 6 failed | 234 passed (240)
Start at 23:48:57
Duration 12.05s (transform 9.63s, setup 0ms, import 52.09s, tests 2.55s, environment 5ms)

 ELIFECYCLE  Test failed. See above for more details.
PS C:\Users\saqqa\CodeX\AstraPost-main\AstraPost-main-02>
