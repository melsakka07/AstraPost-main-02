# AstraPost — Database Schema

> **Generated from `src/lib/schema.ts` (1808 lines, verified 2026-07-06). 46 tables, 16 enums, 90 migrations.**

## Enum Types (16)

| Enum                     | Values                                                                                                                                                                                                                                                                                                                                                                                                  | Schema Line |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `discountTypeEnum`       | `percentage`, `fixed`                                                                                                                                                                                                                                                                                                                                                                                   | 17          |
| `billingCycleEnum`       | `monthly`, `annual`                                                                                                                                                                                                                                                                                                                                                                                     | 18          |
| `postStatusEnum`         | `draft`, `scheduled`, `published`, `failed`, `cancelled`, `awaiting_approval`, `paused_needs_reconnect`, `over_quota`                                                                                                                                                                                                                                                                                   | 23-32       |
| `planEnum`               | `free`, `pro_monthly`, `pro_annual`, `agency`                                                                                                                                                                                                                                                                                                                                                           | 34          |
| `subscriptionStatusEnum` | `active`, `past_due`, `cancelled`, `trialing`                                                                                                                                                                                                                                                                                                                                                           | 36-41       |
| `jobRunStatusEnum`       | `running`, `success`, `failed`, `retrying`                                                                                                                                                                                                                                                                                                                                                              | 43-48       |
| `platformEnum`           | `twitter`, `linkedin`, `instagram`                                                                                                                                                                                                                                                                                                                                                                      | 53          |
| `postTypeEnum`           | `tweet`, `thread`, `linkedin_post`, `instagram_post`                                                                                                                                                                                                                                                                                                                                                    | 56-61       |
| `recurrencePatternEnum`  | `daily`, `weekly`, `monthly`, `yearly`                                                                                                                                                                                                                                                                                                                                                                  | 64-69       |
| `teamRoleEnum`           | `admin`, `editor`, `viewer`                                                                                                                                                                                                                                                                                                                                                                             | 72          |
| `invitationStatusEnum`   | `pending`, `accepted`, `expired`                                                                                                                                                                                                                                                                                                                                                                        | 75          |
| `adminAuditActionEnum`   | 20 values (ban, unban, delete*user, suspend, impersonate, plan_change, feature_flag_toggle, promo*\*, announcement_update, roadmp_update, bulk_operation, user_update, post_update, webhook_replay)                                                                                                                                                                                                     | 78-99       |
| `analyticsRunStatusEnum` | `running`, `success`, `failed`                                                                                                                                                                                                                                                                                                                                                                          | 102-106     |
| `feedbackStatusEnum`     | `pending`, `approved`, `rejected`                                                                                                                                                                                                                                                                                                                                                                       | 109         |
| `feedbackCategoryEnum`   | `feature`, `bug`, `other`                                                                                                                                                                                                                                                                                                                                                                               | 112         |
| `aiGenerationTypeEnum`   | 28 values (thread, image, image_prompt, affiliate, inspiration, inspire, agentic_pipeline, agentic_regenerate, bio_optimizer, content_calendar, tools, hook, cta, rewrite, hashtags, translate, reply_generator, url_to_thread, template, variant_generator, competitor_analyzer, chat, voice_profile, viral_score, trends_discovery, agentic_approve, pdf_to_thread, youtube_to_thread, transcription) | 115-145     |
| `notificationTypeEnum`   | 22 values (billing events, post failures, referrals, trial events)                                                                                                                                                                                                                                                                                                                                      | 148-172     |
| `affiliatePlatformEnum`  | `amazon`, `noon`, `aliexpress`, `other`                                                                                                                                                                                                                                                                                                                                                                 | 175-180     |

---

## All Tables (46 total)

### Auth Tables (BetterAuth-compatible)

| #   | Table          | Key Columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Schema Line |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | `user`         | id, name, email, emailVerified, image, createdAt, updatedAt, isAdmin, isSuspended, timezone, language, plan, planExpiresAt, stripeCustomerId, trialEndsAt, trialExtendedAt, onboardingCompleted, onboardingSkippedAt, onboardingState (jsonb), dashboardLayout (jsonb), voiceProfile (jsonb), voiceVariant, notificationSettings (jsonb), requiresApproval, referralCode, referredBy, referralCredits, referralCreditedAt, twoFactorEnabled, twoFactorSecret, twoFactorBackupCodes, preferredImageModel, bannedAt, deletedAt, lastActiveAt (37 columns) | 186-264     |
| 2   | `session`      | id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId, impersonatedBy, impersonationStartedAt                                                                                                                                                                                                                                                                                                                                                                                                                                        | 266-288     |
| 3   | `account`      | id, accountId, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt                                                                                                                                                                                                                                                                                                                                                                                               | 290-315     |
| 4   | `verification` | id, identifier, value, expiresAt, createdAt, updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | 317-334     |

### Social Account Tables

| #   | Table               | Key Columns                                                                                                                                                                                                         | Schema Line |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 5   | `xAccounts`         | id, userId, xUserId, xUsername, xDisplayName, xAvatarUrl, accessTokenEnc, refreshTokenEnc, tokenExpiresAt, followersCount, isDefault, isActive, xSubscriptionTier, consecutiveRefreshFailures, lastRefreshFailureAt | 352-381     |
| 6   | `linkedinAccounts`  | id, userId, linkedinUserId, linkedinName, linkedinAvatarUrl, accessTokenEnc, refreshTokenEnc, tokenExpiresAt, isActive                                                                                              | 383-403     |
| 7   | `instagramAccounts` | id, userId, instagramUserId, instagramUsername, instagramAvatarUrl, accessTokenEnc, tokenExpiresAt, isActive                                                                                                        | 405-425     |

### Content / Post Tables

| #   | Table    | Key Columns                                                                                                                                                                                                                                                                                                                                          | Schema Line |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 8   | `posts`  | id, userId, xAccountId, linkedinAccountId, instagramAccountId, platform, groupId, type, status, scheduledAt, publishedAt, failReason, lastErrorCode, lastErrorAt, retryCount, aiGenerated, requiresApproval, approvedBy, approvedAt, reviewerNotes, inspiredByTweetId, recurrencePattern, recurrenceEndDate, idempotencyKey, deletedAt (soft-delete) | 427-480     |
| 9   | `tweets` | id, postId, content, position, xTweetId, mediaIds (jsonb)                                                                                                                                                                                                                                                                                            | 592-609     |
| 10  | `media`  | id, postId, userId, tweetId, fileUrl, fileType, fileSize, xMediaId                                                                                                                                                                                                                                                                                   | 611-633     |

### Analytics Tables

| #   | Table                     | Key Columns                                                                                                           | Schema Line |
| --- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| 11  | `tweetAnalytics`          | id, tweetId, xTweetId, impressions, likes, retweets, replies, linkClicks, engagementRate, performanceScore, fetchedAt | 635-656     |
| 12  | `tweetAnalyticsSnapshots` | id, tweetId, xTweetId, impressions, likes, retweets, replies, linkClicks, engagementRate, performanceScore, fetchedAt | 658-681     |
| 13  | `socialAnalytics`         | id, postId, impressions, likes, comments, shares, clicks, engagementRate, fetchedAt                                   | 683-702     |
| 14  | `followerSnapshots`       | id, userId, xAccountId, followersCount, capturedAt                                                                    | 482-499     |
| 15  | `analyticsRefreshRuns`    | id, userId, xAccountId, linkedinAccountId, instagramAccountId, platform, status, error, startedAt, finishedAt         | 501-525     |

### 💰 Money Path Tables (subscriptions, payments, quotas, usage tracking)

| #   | Table                    | Key Columns                                                                                                                                                                            | Schema Line |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 16  | `subscriptions`          | id, userId, stripeSubscriptionId (unique), stripePriceId, plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, billingCycle, cancelledAt, trialEnd                   | 805-831     |
| 17  | `processedWebhookEvents` | id, stripeEventId (unique, dedup key), eventType, retryCount, errorMessage, processedAt                                                                                                | 847-854     |
| 18  | `planChangeLog`          | id, userId, oldPlan, newPlan, reason, stripeSubscriptionId, createdAt (immutable audit trail)                                                                                          | 863-880     |
| 19  | `webhookDeadLetterQueue` | id, stripeEventId (unique), eventType, eventData (jsonb), errorMessage, failureCount, failedAt, movedToDlqAt, resolvedAt, resolvedBy, resolution, notes, requestBody, requestSignature | 938-954     |
| 20  | `webhookDeliveryLog`     | id, stripeEventId, eventType, status, statusCode, processingTimeMs, errorMessage, requestBody, requestSignature, processedAt                                                           | 956-974     |
| 21  | `userAiCounters`         | userId (PK), periodStart, used, limit, updatedAt (atomic per-user quota counter)                                                                                                       | 1265-1273   |
| 22  | `userImageCounters`      | userId (PK), periodStart, used, limit, updatedAt (atomic image quota counter)                                                                                                          | 1292-1300   |
| 23  | `aiQuotaGrants`          | id, userId, amount, remaining, grantedBy, reason, createdAt (admin manual quota top-ups)                                                                                               | 1318-1338   |

### Admin / Billing Tables

| #   | Table                  | Key Columns                                                                                                                                                                                              | Schema Line |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 24  | `promoCodes`           | id, code (unique), description, discountType, discountValue, validFrom, validTo, maxRedemptions, redemptionsCount, applicablePlans (jsonb), isActive, stripeCouponId, createdBy, deletedAt (soft-delete) | 1505-1532   |
| 25  | `promoCodeRedemptions` | id, promoCodeId, userId, stripeSessionId, discountAmount, redeemedAt                                                                                                                                     | 1535-1553   |
| 26  | `featureFlags`         | id, key (unique), enabled, description, rolloutPercentage                                                                                                                                                | 1560-1575   |
| 27  | `adminAuditLog`        | id, adminId, action, targetType, targetId, details (jsonb), ipAddress, userAgent, createdAt (immutable, append-only)                                                                                     | 1608-1629   |

### Other Tables

| #   | Table                    | Key Columns                                                                                                                                                                                                                                       | Schema Line |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 28  | `teamMembers`            | id, userId, teamId, role, joinedAt                                                                                                                                                                                                                | 527-549     |
| 29  | `teamInvitations`        | id, teamId, email, role, token (unique), expiresAt, status                                                                                                                                                                                        | 551-570     |
| 30  | `aiGenerations`          | id, userId, type, inputPrompt, outputContent (jsonb), tone, language, tokensUsed, model, subFeature, costEstimateCents, promptVersion, feedback, latencyMs, fallbackUsed                                                                          | 704-732     |
| 31  | `moderationFlag`         | id, userId, generationId, categories (text[]), snippet                                                                                                                                                                                            | 741-757     |
| 32  | `inspirationBookmarks`   | id, userId, sourceTweetId, sourceTweetUrl, sourceAuthorHandle, sourceText, adaptedText, action, tone, language                                                                                                                                    | 759-780     |
| 33  | `inspirationHistory`     | id, userId, sourceTweetId, sourceTweetUrl, sourceAuthorHandle, sourceText, adaptedText, action, tone, language                                                                                                                                    | 782-803     |
| 34  | `jobRuns`                | id, userId, queueName, jobId (unique composite), correlationId, postId, status, attempts, attemptsMade, error, startedAt, finishedAt                                                                                                              | 882-906     |
| 35  | `failedJobs`             | id, jobName, jobData (jsonb), errorMessage, failureCount, correlationId, postId, userId, lastAttemptAt                                                                                                                                            | 915-936     |
| 36  | `affiliateLinks`         | id, userId, destinationUrl, shortCode (unique), platform, clicks, amazonAsin, productTitle, productImageUrl, productPrice, productCurrency, affiliateTag, generatedTweet, wasScheduled                                                            | 976-1001    |
| 37  | `affiliateClicks`        | id, affiliateLinkId, ipAddress, ipHash, userAgent, country, referer, clickedAt                                                                                                                                                                    | 1003-1021   |
| 38  | `notifications`          | id, userId, type, title, message, isRead, metadata (jsonb), adminStatus, deletedAt, targetType                                                                                                                                                    | 1023-1044   |
| 39  | `notificationDismissals` | id, userId, notificationKey, dismissedAt, snapshotData (jsonb)                                                                                                                                                                                    | 1046-1062   |
| 40  | `templates`              | id, userId, title, description, content (jsonb), category, aiMeta (jsonb)                                                                                                                                                                         | 1067-1090   |
| 41  | `milestones`             | id, userId, milestoneId, unlockedAt, metadata (jsonb)                                                                                                                                                                                             | 1093-1108   |
| 42  | `feedback`               | id, userId, title, description, category, status, upvotes, adminNotes, reviewedAt                                                                                                                                                                 | 1110-1134   |
| 43  | `feedbackVotes`          | id, userId, feedbackId (unique composite with userId+feedbackId)                                                                                                                                                                                  | 1136-1152   |
| 44  | `agenticPosts`           | id, userId, xAccountId, topic, researchBrief (jsonb), contentPlan (jsonb), tweets (jsonb), qualityScore, summary, status, postId, correlationId                                                                                                   | 1638-1668   |
| 45  | `pdfThreadJobs`          | id, userId, correlationId, status, fileUrl, fileName, fileSizeBytes, pageCount, charCount, extractedText, language, tweetCount, tone, attestationAt, threadResult (jsonb), error, quotaConsumed, quotaReleased, completedAt                       | 1687-1731   |
| 46  | `youtubeThreadJobs`      | id, userId, correlationId, status, youtubeUrl, youtubeVideoId, videoTitle, provider, language, tone, tweetCount, durationSeconds, durationVerified, transcript, threadResult (jsonb), error, errorCode, quotaConsumed, quotaReleased, completedAt | 1735-1784   |

---

## Key Relationships

- `user` → one-to-many: sessions, accounts, xAccounts, linkedinAccounts, instagramAccounts, posts, subscriptions, notifications, aiGenerations, templates, affiliateLinks, milestones, teamMemberships, teamInvitations, inspirationBookmarks, jobRuns, followerSnapshots, analyticsRefreshRuns, feedback, feedbackVotes, socialAnalytics, auditLogEntries, moderationFlags, aiQuotaGrants
- `user` → self-referential: referredBy / referrals
- `posts` → belongsTo: user, xAccount, linkedinAccount, instagramAccount, approvedByUser; hasMany: tweets, media
- `tweets` → belongsTo: post; hasMany: media, analyticsSnapshots
- `subscriptions` → belongsTo: user
- `aiQuotaGrants` → belongsTo: user (grant recipient), admin (granter)

**All relationship definitions:** `src/lib/schema.ts:1169-1450`

---

## Migrations

- **Directory:** `drizzle/`
- **Count:** 90 migrations (`0000_chilly_the_phantom.sql` through `0089_fast_frank_castle.sql`)
- **Journal:** `drizzle/meta/_journal.json` (90 entries)
- **Snapshots:** 81 `meta/NNNN_snapshot.json` files
- **Config:** `drizzle.config.ts` — dialect: postgresql, schema: `./src/lib/schema.ts`

---

## Connection Config

**File:** `src/lib/db.ts`

- **Driver:** `postgres-js` (not `pg`)
- **Pool:** `connect_timeout: 10s`, `idle_timeout: 20s` (dev) / `60s` (production), `max_lifetime: 60s` (dev) / `1800s` (production)
- **Singleton:** `globalThis._postgresClient` prevents connection leaks in HMR/Next.js dev
- **Connection string:** `POSTGRES_URL` environment variable

---

## Schema Change Workflow

1. Edit `src/lib/schema.ts`
2. Run `pnpm db:generate` — creates new migration in `drizzle/`
3. Commit the generated SQL files
4. CI `schema-drift` job verifies no uncommitted migration changes
5. Production auto-migrates on deploy (`build:ci` runs `db:migrate` when `VERCEL_ENV=production`)

**Never use `db:push` without `db:generate`** — it creates schema drift that breaks production migrations. See `docs/CODEBASE-INTERNALS.md` §1.

---

_All table definitions verified against `src/lib/schema.ts` on 2026-07-06. For the full Drizzle schema with relations, indexes, and triggers, see the source file._
