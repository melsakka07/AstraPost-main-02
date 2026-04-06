# AstraPost Pricing Page Audit & Gap Analysis

**Date:** 2026-04-06
**Scope:** Free, Pro, Agency plans — pricing page vs backend enforcement
**Source files:** `pricing-table.tsx`, `plan-limits.ts`, `require-plan.ts`, 22 API routes

---

## 1. Executive Summary

The pricing page communicates roughly **30% of the product's actual feature set**. AstraPost has 17+ enforced features that users cannot discover from the pricing page. Simultaneously, the page makes 3 claims the code does not deliver (Instagram support, multi-platform for all plans, priority support for all plans).

| Risk Level | Count | Examples |
|------------|-------|---------|
| **Critical** | 3 | Instagram not implemented, multi-platform misleading, 14-day trial hidden |
| **High** | 5 | 15+ Pro features invisible, AI credit split unclear, calendar claim for Free |
| **Moderate** | 6 | Analytics retention unspecified, support tiers vague, post limit mismatch |
| **Low** | 4 | Bookmarks, bio optimizer, affiliate generator not listed |

**Bottom line:** The pricing page undersells the product and overpromises on platforms. Fixing this will improve conversion (more visible value), reduce churn (accurate expectations), and enable proper benchmarking against competitors.

---

## 2. Classification Framework

Each gap is classified as one of:

- **Over-promise** — Pricing page claims something code does not deliver
- **Under-sell** — Code delivers something the pricing page never mentions
- **Wrong limit** — Both mention the feature but numbers disagree
- **Ambiguous** — Language is vague enough to confuse users

---

## 3. Plan-by-Plan Gap Analysis

### 3.1 FREE Plan ($0/month)

| # | Feature | Pricing Page Says | Code Enforces | Gap Type | Severity |
|---|---------|-------------------|---------------|----------|----------|
| 1 | Posts/month | **10** | **20** | Wrong limit | Moderate |
| 2 | Connected accounts | 1 | 1 | Match | — |
| 3 | Analytics | "Basic Analytics" | 7-day retention, no export | Ambiguous | Low |
| 4 | AI text generations/month | Not mentioned | 20 | Under-sell | Moderate |
| 5 | AI image generations/month | Not mentioned | 10 | Under-sell | Moderate |
| 6 | AI tools access | Not mentioned | Yes (all basic AI tools) | Under-sell | Moderate |
| 7 | Inspiration / tweet import | Not mentioned | Yes | Under-sell | Low |
| 8 | Bookmarks | Not mentioned | 5 max | Under-sell | Low |
| 9 | **14-day full trial** | **Not mentioned** | **Bypasses ALL plan limits** | Under-sell | **Critical** |
| 10 | Content calendar | "Smart Scheduling" (core section) | **No** (Pro+ only) | Over-promise | High |
| 11 | Multi-platform | "X, LinkedIn, Instagram" (core section) | **X only** | Over-promise | **Critical** |
| 12 | Priority Support | "for all plans" (core section) | No enforcement / no ticketing | Over-promise | Moderate |
| 13 | Thread scheduling | Not mentioned | No | N/A | — |
| 14 | Video/GIF upload | Not mentioned | No | N/A | — |

### 3.2 PRO Plan ($29/month or $290/year)

| # | Feature | Pricing Page Says | Code Enforces | Gap Type | Severity |
|---|---------|-------------------|---------------|----------|----------|
| 1 | Posts/month | Unlimited | Unlimited | Match | — |
| 2 | Connected accounts | 3 | 3 | Match | — |
| 3 | Analytics | "Advanced Analytics" | 90-day retention, CSV & PDF export | Ambiguous | Moderate |
| 4 | AI Writer | "100 credits" | 100 text generations + 50 image generations (separate) | Wrong limit | High |
| 5 | Thread Scheduling | Listed | Yes | Match | — |
| 6 | **Agentic Posting** | **Not mentioned** | **Yes** | Under-sell | **High** |
| 7 | **Viral Score** | **Not mentioned** | **Yes** | Under-sell | **High** |
| 8 | **Competitor Analyzer** | **Not mentioned** | **Yes** | Under-sell | **High** |
| 9 | **A/B Variant Generator** | **Not mentioned** | **Yes** | Under-sell | **High** |
| 10 | Best Posting Times | Not mentioned | Yes | Under-sell | Moderate |
| 11 | Voice Profile | Not mentioned | Yes | Under-sell | Moderate |
| 12 | Content Calendar | Not mentioned | Yes | Under-sell | Moderate |
| 13 | URL-to-Thread Converter | Not mentioned | Yes | Under-sell | Moderate |
| 14 | Reply Generator | Not mentioned | Yes | Under-sell | Moderate |
| 15 | Bio Optimizer | Not mentioned | Yes | Under-sell | Low |
| 16 | Analytics Export (CSV & PDF) | Not mentioned | Yes | Under-sell | Moderate |
| 17 | Video/GIF Upload | Not mentioned | Yes | Under-sell | Moderate |
| 18 | Affiliate Tweet Generator | Not mentioned | Yes | Under-sell | Low |
| 19 | AI Image Generation (50/mo) | Not mentioned | Yes | Under-sell | High |
| 20 | Premium image model access | Not mentioned | nano-banana-pro | Under-sell | Low |
| 21 | Inspiration bookmarks | Not mentioned | Unlimited | Under-sell | Low |
| 22 | Multi-platform | "X, LinkedIn, Instagram" (core section) | **X only** (LinkedIn = Agency) | Over-promise | High |

**Summary:** The Pro plan lists **5 features** on the pricing page. The code enforces **17+ features**. This is the single largest under-sell in the product.

### 3.3 AGENCY Plan ($99/month or $990/year)

| # | Feature | Pricing Page Says | Code Enforces | Gap Type | Severity |
|---|---------|-------------------|---------------|----------|----------|
| 1 | Everything in Pro | Listed | Yes | Match | — |
| 2 | Connected accounts | 10 | 10 (X accounts) | Match (but ambiguous — "accounts" vs "X accounts") | Moderate |
| 3 | Team Members | Up to 5 | 5 (enforced in `/api/team/invite`) | Match | — |
| 4 | LinkedIn | Listed | Yes (enforced via `checkLinkedinAccessDetailed`) | Match | — |
| 5 | **Instagram** | **Listed** | **Not implemented anywhere** | Over-promise | **Critical** |
| 6 | White-label Reports | Listed | White-label PDF export in analytics | Needs verification | High |
| 7 | Unlimited AI text generations | Not mentioned | Yes (unlimited) | Under-sell | Moderate |
| 8 | Unlimited AI image generations | Not mentioned | Yes (unlimited) | Under-sell | Moderate |
| 9 | 365-day analytics retention | Not mentioned | Yes | Under-sell | Moderate |

---

## 4. Hidden Value — Features in Code but NOT on Pricing Page

These features are fully implemented and enforced but invisible to prospective customers:

| Feature | Free | Pro | Agency | Revenue Impact |
|---------|------|-----|--------|----------------|
| AI Image Generation | 10/mo | 50/mo | Unlimited | **High** — unique vs competitors |
| Agentic Posting (autonomous AI pipeline) | No | Yes | Yes | **High** — no competitor has this |
| Viral Score Analysis | No | Yes | Yes | **High** — strong differentiator |
| A/B Variant Generator | No | Yes | Yes | **High** — justifies Pro price |
| Competitor Analyzer | No | Yes | Yes | **High** — enterprise-grade feature |
| Best Posting Times | No | Yes | Yes | Medium |
| Content Calendar (AI-generated) | No | Yes | Yes | Medium |
| URL-to-Thread Converter | No | Yes | Yes | Medium |
| Reply Generator | No | Yes | Yes | Medium |
| Voice Profile | No | Yes | Yes | Medium |
| Bio Optimizer | No | Yes | Yes | Low |
| Affiliate Tweet Generator | No | Yes | Yes | Low |
| Video/GIF Upload | No | Yes | Yes | Medium |
| Analytics Export (CSV/PDF) | No | Yes | White-label | Medium |
| Inspiration / Tweet Import | Yes | Yes | Yes | Low |
| Bookmarks | 5 | Unlimited | Unlimited | Low |
| **14-day Full Trial** | **Yes** | N/A | N/A | **Critical** — conversion lever |

**17 features** are invisible on the pricing page. The most impactful ones (AI image gen, agentic posting, viral score, competitor analyzer, A/B variants) are unique differentiators that no direct competitor offers.

---

## 5. Over-promises — On Pricing Page but NOT in Code

| # | Claim | Where Listed | Reality | Risk |
|---|-------|-------------|---------|------|
| 1 | **Instagram support** | Agency plan + core features section | Not implemented — no Instagram API integration, no routes, no schema | **Critical** — trust/legal risk |
| 2 | **Multi-platform for all plans** | Core features: "X, LinkedIn, Instagram" | Free/Pro = X only; Agency = X + LinkedIn; Instagram = nonexistent | **Critical** — misleading |
| 3 | **Priority Support for all plans** | Core features section | No ticketing system, no SLA, no code enforcement | Moderate — expectation mismatch |
| 4 | **Smart Scheduling with calendar** (all plans) | Core features section | Content Calendar is Pro+ only; Free has basic scheduling but no calendar UI | High — feature gating mismatch |

---

## 6. Numeric Mismatches

| Item | Pricing Page | Code | Recommendation |
|------|-------------|------|----------------|
| Free posts/month | 10 | 20 | **Decision needed:** Update page to 20 (more generous, better conversion) or tighten code to 10 (stricter free tier) |
| Pro AI credits | "100 credits" (unified) | 100 text + 50 images (separate quotas) | Either: (a) show "100 AI text + 50 AI images" or (b) unify into a single credit pool of 150 |
| Free AI credits | Not shown | 20 text + 10 images | Show on page: "20 AI generations + 10 AI images" |
| Pro analytics | "Advanced Analytics" | 90-day retention + CSV/PDF export | Specify: "90-day analytics history, CSV & PDF export" |
| Agency analytics | Not stated beyond "Everything in Pro" | 365-day retention + white-label PDF | Specify: "1-year analytics history, white-label reports" |
| Free analytics | "Basic Analytics" | 7-day retention, no export | Specify: "7-day analytics window" |
| Annual savings | "Save ~20%" (toggle label) | Actual: ~17% ($29→$24/mo; $99→$83/mo) | Fix to "Save ~17%" or adjust pricing |

---

## 7. Industry Benchmarking

### 7.1 Competitor Pricing

| Platform | Free | Mid Tier | Team/Agency | AI Features | Platforms |
|----------|------|----------|-------------|-------------|-----------|
| **Buffer** | 3 channels | $6/mo/channel | $12/mo/channel | No | X, FB, IG, LI, TikTok, Pinterest |
| **Hootsuite** | None | $99/mo (10 accts) | $249/mo (20 accts) | Yes (paid) | X, FB, IG, LI, TikTok, YouTube, Pinterest |
| **Later** | 1 social set | $25/mo | $80/mo | Limited | IG, FB, X, LI, TikTok, Pinterest |
| **Typefully** | 1 account | $12.50/mo | $29/mo | Yes | X, LI |
| **Hypefury** | 1 account | $29/mo | $99/mo | Yes | X, LI, IG |
| **AstraPost** | 1 account | $29/mo | $99/mo | **Extensive** | X (+ LI on Agency) |

### 7.2 Competitive Positioning

**Strengths (vs competitors):**
- AI depth is unmatched: agentic posting, AI image gen, viral score, competitor analysis, A/B variants — no competitor offers all of these
- Free tier is generous (20 posts + 20 AI generations vs most competitors offering 0 AI)
- Pro at $29/mo includes features that Hootsuite charges $99+/mo for

**Weaknesses:**
- Platform coverage: Only X (+ LinkedIn on Agency). Competitors support 5-8 platforms
- Instagram absence is a dealbreaker for many social media managers
- Pricing page fails to communicate AI advantages

### 7.3 Feature Parity Matrix

| Feature | AstraPost | Buffer | Hootsuite | Typefully | Hypefury |
|---------|-----------|--------|-----------|-----------|----------|
| AI Text Generation | All tiers | No | Paid only | Yes | Yes |
| AI Image Generation | All tiers | No | No | No | No |
| Agentic/Auto Posting | Pro+ | No | No | No | Partial |
| A/B Variants | Pro+ | No | Yes | No | Yes |
| Competitor Analysis | Pro+ | No | Yes | No | No |
| Viral Score | Pro+ | No | No | No | Partial |
| Content Calendar | Pro+ | Yes | Yes | No | Yes |
| Analytics Export | Pro+ | Paid | Yes | No | Yes |
| Multi-platform | X (+LI Agency) | 6+ | 7+ | 2 | 3 |

**Key insight:** AstraPost has the deepest AI feature set in the market but communicates none of it on the pricing page. The platform gap (X-only for most users) is the main competitive weakness.

---

## 8. Prioritized Recommendations

### P0 — Critical (immediate)

| # | Action | Rationale |
|---|--------|-----------|
| 1 | **Remove Instagram from all pricing page mentions** | Not implemented. Listing it is misleading and risks trust/legal issues. Add "Coming Soon" badge if on roadmap. |
| 2 | **Fix "Multi-platform Support" in core features** | Replace with "X (Twitter) scheduling for all plans. LinkedIn on Agency." |
| 3 | **Advertise the 14-day trial prominently** | This is a major conversion lever currently invisible. Add a banner: "Start your 14-day free trial — access all Pro features." |

### P1 — High (this sprint)

| # | Action | Rationale |
|---|--------|-----------|
| 4 | **Expand Pro feature list from 5 to 12+ items** | Group into: AI Suite, Scheduling, Analytics, Content Tools. Surface agentic posting, viral score, A/B variants, competitor analyzer. |
| 5 | **Align Free plan post limit** | Decide: update page to 20 or tighten code to 10. Recommend showing 20 (more generous = better conversion). |
| 6 | **Split AI credits display** | Show "100 AI text generations + 50 AI images/month" instead of vague "100 credits." |
| 7 | **Move Content Calendar out of core features** | It's Pro+ only. List it under Pro features, not as available to all plans. |
| 8 | **Add AI Image Generation as visible feature** | Unique differentiator — no competitor has it. Show per-plan quotas. |

### P2 — Medium (next sprint)

| # | Action | Rationale |
|---|--------|-----------|
| 9 | **Add explicit analytics retention per plan** | "7-day" (Free), "90-day" (Pro), "1-year" (Agency) |
| 10 | **Add analytics export to Pro/Agency features** | "CSV & PDF export" (Pro), "White-label PDF reports" (Agency) |
| 11 | **Add Video/GIF upload to Pro features** | Users won't know they can upload media unless told. |
| 12 | **Clarify support tiers** | Either implement tiered support or change to: "Community Support" (Free), "Email Support" (Pro), "Priority Support" (Agency). |
| 13 | **Specify "X accounts" instead of "Connected Accounts"** | Prevents confusion when LinkedIn is Agency-only. |
| 14 | **Fix annual savings label** | Toggle says "Save ~20%" but actual discount is ~17%. |

### P3 — Low (backlog)

| # | Action | Rationale |
|---|--------|-----------|
| 15 | Add a full feature comparison table to pricing page | Industry standard practice — helps users compare tiers at a glance. |
| 16 | List bookmarks, inspiration, reply generator, bio optimizer | Complete the feature picture for each tier. |
| 17 | Document affiliate generator on pricing page | Currently hidden Pro+ feature. |
| 18 | Add voice profile to Pro feature list | Differentiator for content creators. |
| 19 | Verify white-label PDF export end-to-end | Listed on Agency — confirm it works before keeping the claim. |

---

## 9. Suggested Revised Feature Lists

Based on this audit, here are recommended feature lists for the pricing page:

### FREE (Revised)
- 20 posts per month
- 1 X (Twitter) account
- 20 AI text generations/month
- 10 AI image generations/month
- 7-day analytics
- Tweet inspiration & import
- 14-day Pro trial included

### PRO (Revised)
- Unlimited posts
- 3 X (Twitter) accounts
- 100 AI text generations/month
- 50 AI image generations/month
- **AI Suite:** Agentic Posting, A/B Variants, Content Calendar, URL-to-Thread, Reply Generator, Bio Optimizer
- **Analytics:** 90-day history, Viral Score, Best Posting Times, Competitor Analyzer, CSV & PDF export
- Thread scheduling
- Video & GIF uploads
- Voice Profile
- Unlimited bookmarks

### AGENCY (Revised)
- Everything in Pro
- 10 X (Twitter) accounts
- LinkedIn integration
- Unlimited AI generations (text & image)
- 1-year analytics history
- White-label PDF reports
- Team collaboration (up to 5 members)
- ~~Instagram~~ *(remove until implemented)*

---

## 10. Backend Enforcement Inventory

All 22 routes that enforce plan limits, for reference:

### AI Routes (11)
| Route | Gate Function | Plan Required |
|-------|-------------|---------------|
| `POST /api/ai/agentic` | `checkAgenticPostingAccessDetailed` | Pro+ |
| `POST /api/ai/bio` | `checkBioOptimizerAccessDetailed` | Pro+ |
| `POST /api/ai/calendar` | `checkContentCalendarAccessDetailed` | Pro+ |
| `POST /api/ai/image` | `checkAiImageQuotaDetailed` + `checkImageModelAccessDetailed` | All (quota varies) |
| `GET /api/ai/inspiration` | `checkAiLimitDetailed` | All |
| `POST /api/ai/inspire` | `checkInspirationAccessDetailed` + `checkAiQuotaDetailed` | All (quota varies) |
| `POST /api/ai/reply` | `checkReplyGeneratorAccessDetailed` | Pro+ |
| `POST /api/ai/score` | `checkViralScoreAccessDetailed` | Pro+ |
| `POST /api/ai/summarize` | `checkUrlToThreadAccessDetailed` | Pro+ |
| `GET /api/ai/trends` | `checkAgenticPostingAccessDetailed` | Pro+ |
| `POST /api/ai/variants` | `checkVariantGeneratorAccessDetailed` | Pro+ |

### Analytics Routes (3)
| Route | Gate Function | Plan Required |
|-------|-------------|---------------|
| `GET /api/analytics/best-time` | `checkBestTimesAccessDetailed` | Pro+ |
| `GET /api/analytics/best-times` | `checkBestTimesAccessDetailed` | Pro+ |
| `POST /api/analytics/competitor` | `checkCompetitorAnalyzerAccessDetailed` + `checkAiQuotaDetailed` | Pro+ |

### Account & Resource Routes (8)
| Route | Gate Function | Plan Required |
|-------|-------------|---------------|
| `POST /api/x/accounts` | `checkAccountLimitDetailed` | All (limit varies) |
| `POST /api/x/accounts/sync` | `checkAccountLimitDetailed` | All (limit varies) |
| `POST /api/posts` | `checkPostLimitDetailed` | All (limit varies) |
| `POST /api/chat` | `checkAiQuotaDetailed` | All (quota varies) |
| `POST /api/inspiration/bookmark` | `checkBookmarkLimitDetailed` | All (limit varies) |
| `GET /api/linkedin/callback` | `checkLinkedinAccessDetailed` | Agency only |
| `POST /api/team/invite` | `maxTeamMembers` check | Agency only |
| `POST /api/user/voice-profile` | Custom Pro+ check | Pro+ |

---

## 11. Code References

| File | Purpose |
|------|---------|
| `src/components/billing/pricing-table.tsx` | Pricing page feature lists (lines 10-78) |
| `src/lib/plan-limits.ts` | Plan tier definitions, quotas, feature flags |
| `src/lib/middleware/require-plan.ts` | All gate functions and enforcement logic |
| `src/lib/api/ai-preamble.ts` | Centralized AI route preamble (auth + quota) |
| `src/app/(marketing)/pricing/page.tsx` | Pricing page server component |
| `src/components/billing/pricing-card.tsx` | Individual plan card rendering |

---

*Generated by pricing audit on 2026-04-06. Review and update quarterly.*
