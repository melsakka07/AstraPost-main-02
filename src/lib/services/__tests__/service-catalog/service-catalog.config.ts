// ---------------------------------------------------------------------------
// Service Catalog — Data-Driven Test Configuration
// ---------------------------------------------------------------------------
// Single source of truth for the service-catalog test suite.
// Mirrors docs/service-catalog.md in machine-readable form.
//
// When you ADD a route or CHANGE a plan gate, update this file.
// The auto-discovery test will flag drift between this config and the codebase.
// ---------------------------------------------------------------------------

export type PlanType = "free" | "trial" | "pro_monthly" | "pro_annual" | "agency";

export const ALL_PLANS: PlanType[] = ["free", "trial", "pro_monthly", "pro_annual", "agency"];

export type ServiceCategory =
  | "ai-text"
  | "ai-image"
  | "content-to-thread"
  | "posts"
  | "analytics"
  | "social"
  | "team"
  | "billing"
  | "other";

export interface PlanAccess {
  free: boolean;
  trial: boolean;
  pro_monthly: boolean;
  pro_annual: boolean;
  agency: boolean;
}

export interface ServiceExpectation {
  /** Human-readable service name */
  name: string;
  /** API route path (e.g. "/api/ai/thread"). undefined for non-HTTP services. */
  route?: string;
  /** HTTP method */
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Plan gate function name from require-plan.ts. undefined = no gate (all tiers). */
  gate?: string;
  /** Expected access per plan */
  access: PlanAccess;
  /** Quota weight (0 = no quota consumption, undefined = not applicable) */
  quotaWeight?: number;
  /** Category for grouping */
  category: ServiceCategory;
  /** Whether this is a mutation endpoint — skipped in production smoke tests */
  isMutation: boolean;
  /** Minimal valid request body for integration tests (undefined for GET) */
  minimalPayload?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** All 5 plans have access */
const ALL_ACCESS: PlanAccess = {
  free: true,
  trial: true,
  pro_monthly: true,
  pro_annual: true,
  agency: true,
};

/** Only Pro+ (including Trial) have access */
const PRO_PLUS_ACCESS: PlanAccess = {
  free: false,
  trial: true,
  pro_monthly: true,
  pro_annual: true,
  agency: true,
};

/** Only Agency has access */
const AGENCY_ONLY_ACCESS: PlanAccess = {
  free: false,
  trial: false,
  pro_monthly: false,
  pro_annual: false,
  agency: true,
};

// ---------------------------------------------------------------------------
// Minimal payloads for integration test mutation endpoints
// ---------------------------------------------------------------------------

const P_TEMPLATE_GENERATE = {
  templateId: "tmpl_1",
  variables: { topic: "test" },
};

const P_AI_THREAD = {
  topic: "اختبار منشور تجريبي",
  tone: "professional",
  language: "ar",
};

const P_AI_TRANSLATE = {
  text: "مرحبا بالعالم",
  targetLanguage: "en",
};

const P_AI_HASHTAGS = { content: "Test post about technology and AI" };
const P_AI_REFINE = { content: "Test draft content", tone: "professional" };
const P_AI_ENHANCE_TOPIC = { topic: "AI in healthcare" };
const P_AI_SUMMARIZE = { url: "https://example.com/article" };
const P_AI_SCORE = { content: "Test tweet content for scoring" };
const P_AI_VARIANTS = { content: "Original post content", count: 3 };
const P_AI_REPLY = { originalTweet: "Original tweet text", tone: "friendly" };
const P_AI_BIO = {};
const P_AI_TOOLS = { content: "Test content", action: "rewrite" };
const P_AI_AFFILIATE = { product: "Test product", audience: "general" };
const P_AI_CALENDAR = { niche: "technology", days: 7 };
const P_AI_AGENTIC = { prompt: "Daily tech tip" };
const P_AI_INSPIRE = { category: "tech" };
const P_AI_IMAGE = { prompt: "A test image of a cat" };
const P_LINK_PREVIEW = { url: "https://example.com" };
const P_FEEDBACK = { message: "Test feedback" };
const P_CONTACT = { name: "Test", email: "test@test.com", message: "Hello" };
const P_POST = {
  content: "Test post",
  scheduledAt: "2099-01-01T00:00:00Z",
  xAccountId: "test",
};
const P_BOOKMARK = { inspirationId: "insp_1" };
const P_TWEET_LOOKUP = { url: "https://x.com/user/status/123" };

// ---------------------------------------------------------------------------
// Master catalog
// ---------------------------------------------------------------------------

export const SERVICE_CATALOG: ServiceExpectation[] = [
  // =========================================================================
  // AI TEXT GENERATION (21 services)
  // =========================================================================

  // -- All tiers (no gate, quota-gated via aiPreamble) --
  {
    name: "Thread Generator",
    route: "/api/ai/thread",
    method: "POST",
    access: ALL_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_THREAD,
  },
  {
    name: "Translate",
    route: "/api/ai/translate",
    method: "POST",
    access: ALL_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_TRANSLATE,
  },
  {
    name: "Hashtag Generator",
    route: "/api/ai/hashtags",
    method: "POST",
    access: ALL_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_HASHTAGS,
  },
  {
    name: "Refine Text",
    route: "/api/ai/refine",
    method: "POST",
    access: ALL_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_REFINE,
  },
  {
    name: "Enhance Topic",
    route: "/api/ai/enhance-topic",
    method: "POST",
    access: ALL_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_ENHANCE_TOPIC,
  },
  {
    name: "Template Generate",
    route: "/api/ai/template-generate",
    method: "POST",
    access: ALL_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_TEMPLATE_GENERATE,
  },
  {
    name: "AI History",
    route: "/api/ai/history",
    method: "GET",
    access: ALL_ACCESS,
    quotaWeight: 0,
    category: "ai-text",
    isMutation: false,
  },
  {
    name: "AI Quota Status",
    route: "/api/ai/quota",
    method: "GET",
    access: ALL_ACCESS,
    quotaWeight: 0,
    category: "ai-text",
    isMutation: false,
  },
  {
    name: "AI Feedback",
    route: "/api/ai/feedback",
    method: "POST",
    access: ALL_ACCESS,
    quotaWeight: 0,
    category: "ai-text",
    isMutation: true,
    minimalPayload: { rating: 4, generationId: "gen_1" },
  },

  // -- Pro+ gated --
  {
    name: "URL-to-Thread",
    route: "/api/ai/summarize",
    method: "POST",
    gate: "checkUrlToThreadAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_SUMMARIZE,
  },
  {
    name: "Viral Score",
    route: "/api/ai/score",
    method: "POST",
    gate: "checkViralScoreAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 0, // skipQuota
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_SCORE,
  },
  {
    name: "Variant Generator",
    route: "/api/ai/variants",
    method: "POST",
    gate: "checkVariantGeneratorAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_VARIANTS,
  },
  {
    name: "Smart Reply",
    route: "/api/ai/reply",
    method: "POST",
    gate: "checkReplyGeneratorAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_REPLY,
  },
  {
    name: "Bio Optimizer",
    route: "/api/ai/bio",
    method: "POST",
    gate: "checkBioOptimizerAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_BIO,
  },
  {
    name: "AI Writing Tools",
    route: "/api/ai/tools",
    method: "POST",
    gate: "checkToolsAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_TOOLS,
  },
  {
    name: "Affiliate Generator",
    route: "/api/ai/affiliate",
    method: "POST",
    gate: "checkAffiliateGeneratorAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_AFFILIATE,
  },
  {
    name: "Content Calendar",
    route: "/api/ai/calendar",
    method: "POST",
    gate: "checkContentCalendarAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_CALENDAR,
  },
  {
    name: "Agentic Posting",
    route: "/api/ai/agentic",
    method: "POST",
    gate: "checkAgenticPostingAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 5,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_AGENTIC,
  },
  {
    name: "Inspiration Feed (AI)",
    route: "/api/ai/inspire",
    method: "POST",
    gate: "checkInspirationAccessDetailed",
    access: ALL_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: P_AI_INSPIRE,
  },
  {
    name: "Trends Analysis",
    route: "/api/ai/trends",
    method: "GET",
    // No explicit feature gate — gated via aiPreamble quota check only
    access: ALL_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: false,
  },
  {
    name: "Inbox Smart Reply",
    route: "/api/ai/reply",
    method: "POST",
    gate: "checkInboxReplyAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-text",
    isMutation: true,
    minimalPayload: { ...P_AI_REPLY, mode: "inbox" },
  },

  // =========================================================================
  // AI IMAGE GENERATION (5 services)
  // =========================================================================

  {
    name: "Generate Image",
    route: "/api/ai/image",
    method: "POST",
    gate: "checkImageModelAccessDetailed",
    access: {
      free: true, // base models only — gate checks model, not feature
      trial: true, // base models only
      pro_monthly: true,
      pro_annual: true,
      agency: true,
    },
    quotaWeight: 1,
    category: "ai-image",
    isMutation: true,
    minimalPayload: P_AI_IMAGE,
  },
  {
    name: "Thread-First-Image",
    route: "/api/ai/thread-first-image",
    method: "POST",
    gate: "checkPdfToThreadAccessDetailed", // one of two possible gates
    access: PRO_PLUS_ACCESS,
    quotaWeight: 1,
    category: "ai-image",
    isMutation: true,
    minimalPayload: { topic: "Test image thread" },
  },
  {
    name: "Image Status",
    route: "/api/ai/image/status",
    method: "GET",
    access: ALL_ACCESS,
    category: "ai-image",
    isMutation: false,
  },
  {
    name: "Image Quota",
    route: "/api/ai/image/quota",
    method: "GET",
    access: ALL_ACCESS,
    category: "ai-image",
    isMutation: false,
  },
  {
    name: "Image Download",
    route: "/api/ai/image/download",
    method: "GET",
    access: ALL_ACCESS,
    category: "ai-image",
    isMutation: false,
  },

  // =========================================================================
  // CONTENT-TO-THREAD (3 services)
  // =========================================================================

  {
    name: "PDF-to-Thread",
    route: "/api/ai/pdf-to-thread/enqueue",
    method: "POST",
    gate: "checkPdfToThreadAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 5,
    category: "content-to-thread",
    isMutation: true,
    minimalPayload: { fileUrl: "https://example.com/test.pdf" },
  },
  {
    name: "YouTube-to-Thread",
    route: "/api/ai/youtube-to-thread",
    method: "POST",
    gate: "checkYoutubeToThreadAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 5,
    category: "content-to-thread",
    isMutation: true,
    minimalPayload: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  },
  {
    name: "YouTube Discovery",
    route: "/api/ai/discover/youtube",
    method: "POST",
    gate: "checkAiDiscoveryAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 0,
    category: "other",
    isMutation: false,
    minimalPayload: { query: "news" },
  },
  {
    name: "Trends Discovery",
    route: "/api/ai/discover/trends",
    method: "POST",
    gate: "checkAiDiscoveryAccessDetailed",
    access: PRO_PLUS_ACCESS,
    quotaWeight: 0,
    category: "ai-text",
    isMutation: false,
    minimalPayload: { query: "ai marketing" },
  },
  {
    name: "YT Capabilities",
    route: "/api/ai/youtube-to-thread/capabilities",
    method: "GET",
    access: ALL_ACCESS,
    category: "content-to-thread",
    isMutation: false,
  },

  // =========================================================================
  // POSTS & SCHEDULING (9 services)
  // =========================================================================

  {
    name: "Create Post",
    route: "/api/posts",
    method: "POST",
    gate: "checkPostLimitDetailed",
    access: {
      free: true, // 20/mo limit
      trial: true, // 20/mo limit
      pro_monthly: true,
      pro_annual: true,
      agency: true,
    },
    quotaWeight: 0,
    category: "posts",
    isMutation: true,
    minimalPayload: P_POST,
  },
  {
    name: "List Posts",
    route: "/api/posts",
    method: "GET",
    access: ALL_ACCESS,
    category: "posts",
    isMutation: false,
  },
  {
    name: "Get/Edit/Delete Post",
    route: "/api/posts/[postId]",
    method: "GET",
    access: ALL_ACCESS,
    category: "posts",
    isMutation: false,
  },
  {
    name: "Reschedule Post",
    route: "/api/posts/[postId]/reschedule",
    method: "POST",
    access: ALL_ACCESS,
    category: "posts",
    isMutation: true,
    minimalPayload: { scheduledAt: "2099-02-01T00:00:00Z" },
  },
  {
    name: "Retry Failed Post",
    route: "/api/posts/[postId]/retry",
    method: "POST",
    access: ALL_ACCESS,
    category: "posts",
    isMutation: true,
  },
  {
    name: "Bulk Create Posts",
    route: "/api/posts/bulk",
    method: "POST",
    gate: "checkPostLimitDetailed",
    access: {
      free: true,
      trial: true,
      pro_monthly: true,
      pro_annual: true,
      agency: true,
    },
    category: "posts",
    isMutation: true,
    minimalPayload: { posts: [P_POST, P_POST] },
  },
  {
    name: "Media Upload",
    route: "/api/media/upload",
    method: "POST",
    gate: "checkVideoUploadAccessDetailed",
    access: PRO_PLUS_ACCESS,
    category: "posts",
    isMutation: true,
    minimalPayload: {}, // multipart — handled specially in integration test
  },
  {
    name: "Media Library",
    route: "/api/media/library",
    method: "GET",
    access: ALL_ACCESS,
    category: "posts",
    isMutation: false,
  },
  {
    name: "Thread Scheduling",
    route: "/api/posts",
    method: "POST",
    gate: "checkThreadAccessDetailed",
    access: PRO_PLUS_ACCESS,
    category: "posts",
    isMutation: true,
    minimalPayload: {
      ...P_POST,
      thread: [{ content: "Tweet 1" }, { content: "Tweet 2" }],
    },
  },

  // =========================================================================
  // ANALYTICS (10 services)
  // =========================================================================

  {
    name: "Follower Analytics",
    route: "/api/analytics/followers",
    method: "GET",
    access: ALL_ACCESS,
    category: "analytics",
    isMutation: false,
  },
  {
    name: "Self Stats",
    route: "/api/analytics/self-stats",
    method: "GET",
    access: ALL_ACCESS,
    category: "analytics",
    isMutation: false,
  },
  {
    name: "Tweet Analytics",
    route: "/api/analytics/tweet/[id]",
    method: "GET",
    access: ALL_ACCESS,
    category: "analytics",
    isMutation: false,
  },
  {
    name: "Refresh Analytics",
    route: "/api/analytics/refresh",
    method: "POST",
    access: ALL_ACCESS,
    category: "analytics",
    isMutation: true,
    minimalPayload: { xAccountId: "test" },
  },
  {
    name: "Analytics Runs",
    route: "/api/analytics/runs",
    method: "GET",
    access: ALL_ACCESS,
    category: "analytics",
    isMutation: false,
  },
  {
    name: "Best Time to Post",
    route: "/api/analytics/best-time",
    method: "GET",
    gate: "checkBestTimesAccessDetailed",
    access: PRO_PLUS_ACCESS,
    category: "analytics",
    isMutation: false,
  },
  {
    name: "Best Times Analysis",
    route: "/api/analytics/best-times",
    method: "GET",
    gate: "checkBestTimesAccessDetailed",
    access: PRO_PLUS_ACCESS,
    category: "analytics",
    isMutation: false,
  },
  {
    name: "Viral Score Analysis",
    route: "/api/analytics/viral",
    method: "GET",
    gate: "checkViralScoreAccessDetailed",
    access: PRO_PLUS_ACCESS,
    category: "analytics",
    isMutation: false,
  },
  {
    name: "Competitor Analysis",
    route: "/api/analytics/competitor",
    method: "POST",
    gate: "checkCompetitorAnalyzerAccessDetailed",
    access: PRO_PLUS_ACCESS,
    category: "analytics",
    isMutation: true,
    minimalPayload: { targetUsername: "test_competitor" },
  },
  {
    name: "Export Analytics",
    route: "/api/analytics/export",
    method: "GET",
    gate: "checkAnalyticsExportLimitDetailed",
    access: PRO_PLUS_ACCESS,
    category: "analytics",
    isMutation: false,
  },

  // =========================================================================
  // SOCIAL ACCOUNTS (6 services)
  // =========================================================================

  {
    name: "Connect X Account",
    route: "/api/x/accounts",
    method: "POST",
    gate: "checkAccountLimitDetailed",
    access: {
      free: true, // limit: 1
      trial: true, // limit: 1
      pro_monthly: true, // limit: 3
      pro_annual: true, // limit: 3
      agency: true, // limit: 10
    },
    category: "social",
    isMutation: true,
    minimalPayload: {},
  },
  {
    name: "List X Accounts",
    route: "/api/x/accounts",
    method: "GET",
    access: ALL_ACCESS,
    category: "social",
    isMutation: false,
  },
  {
    name: "Delete X Account",
    route: "/api/x/accounts/[id]",
    method: "DELETE",
    access: ALL_ACCESS,
    category: "social",
    isMutation: true,
  },
  {
    name: "Set Default X Account",
    route: "/api/x/accounts/default",
    method: "POST",
    access: ALL_ACCESS,
    category: "social",
    isMutation: true,
    minimalPayload: { xAccountId: "test" },
  },
  {
    name: "Sync X Accounts",
    route: "/api/x/accounts/sync",
    method: "POST",
    gate: "checkAccountLimitDetailed",
    access: {
      free: true,
      trial: true,
      pro_monthly: true,
      pro_annual: true,
      agency: true,
    },
    category: "social",
    isMutation: true,
  },
  {
    name: "X Account Health",
    route: "/api/x/health",
    method: "GET",
    access: ALL_ACCESS,
    category: "social",
    isMutation: false,
  },

  // =========================================================================
  // TEAM & COLLABORATION (3 services)
  // =========================================================================

  {
    name: "Team Members",
    route: "/api/team/members",
    method: "GET",
    access: AGENCY_ONLY_ACCESS,
    category: "team",
    isMutation: false,
  },
  {
    name: "Invite Member",
    route: "/api/team/invite",
    method: "POST",
    gate: "checkTeamMemberLimitDetailed",
    access: AGENCY_ONLY_ACCESS,
    category: "team",
    isMutation: true,
    minimalPayload: { email: "test@example.com", role: "editor" },
  },
  {
    name: "Role Management",
    route: "/api/team/members/[memberId]",
    method: "PATCH",
    access: AGENCY_ONLY_ACCESS,
    category: "team",
    isMutation: true,
    minimalPayload: { role: "viewer" },
  },

  // =========================================================================
  // BILLING & SUBSCRIPTION (7 services)
  // =========================================================================

  {
    name: "Stripe Checkout",
    route: "/api/billing/checkout",
    method: "POST",
    access: ALL_ACCESS,
    category: "billing",
    isMutation: true,
    minimalPayload: { priceId: "price_test", successUrl: "/", cancelUrl: "/" },
  },
  {
    name: "Customer Portal",
    route: "/api/billing/portal",
    method: "POST",
    access: ALL_ACCESS,
    category: "billing",
    isMutation: true,
    minimalPayload: { returnUrl: "/" },
  },
  {
    name: "Change Plan",
    route: "/api/billing/change-plan",
    method: "POST",
    access: ALL_ACCESS,
    category: "billing",
    isMutation: true,
    minimalPayload: { plan: "pro_monthly", billingCycle: "monthly" },
  },
  {
    name: "Preview Plan Change",
    route: "/api/billing/change-plan/preview",
    method: "POST",
    access: ALL_ACCESS,
    category: "billing",
    isMutation: true,
    minimalPayload: { plan: "pro_monthly", billingCycle: "monthly" },
  },
  {
    name: "Subscription Status",
    route: "/api/billing/status",
    method: "GET",
    access: ALL_ACCESS,
    category: "billing",
    isMutation: false,
  },
  {
    name: "Usage Stats",
    route: "/api/billing/usage",
    method: "GET",
    access: ALL_ACCESS,
    category: "billing",
    isMutation: false,
  },
  {
    name: "Validate Promo Code",
    route: "/api/billing/validate-promo",
    method: "POST",
    access: ALL_ACCESS,
    category: "billing",
    isMutation: true,
    minimalPayload: { code: "TEST_PROMO" },
  },

  // =========================================================================
  // INSPIRATION & BOOKMARKS (2 services)
  // =========================================================================

  {
    name: "Inspiration Feed",
    route: "/api/ai/inspiration",
    method: "GET",
    access: ALL_ACCESS,
    category: "other",
    isMutation: false,
  },
  {
    name: "Bookmark Inspiration",
    route: "/api/inspiration/bookmark",
    method: "POST",
    gate: "checkBookmarkLimitDetailed",
    access: {
      free: true, // 5 max
      trial: true, // unlimited
      pro_monthly: true, // unlimited
      pro_annual: true, // unlimited
      agency: true, // unlimited
    },
    category: "other",
    isMutation: true,
    minimalPayload: P_BOOKMARK,
  },

  // =========================================================================
  // VOICE PROFILE (1 service)
  // =========================================================================

  {
    name: "Voice Profile",
    route: "/api/user/voice-profile",
    method: "POST",
    gate: "checkVoiceProfileAccessDetailed",
    access: PRO_PLUS_ACCESS,
    category: "other",
    isMutation: true,
    minimalPayload: { sample: "Sample writing for voice analysis" },
  },

  // =========================================================================
  // OTHER USER-FACING SERVICES (11 services)
  // =========================================================================

  {
    name: "Notifications",
    route: "/api/notifications",
    method: "GET",
    access: ALL_ACCESS,
    category: "other",
    isMutation: false,
  },
  {
    name: "Mark Notifications Read",
    route: "/api/notifications",
    method: "PATCH",
    access: ALL_ACCESS,
    category: "other",
    isMutation: true,
    minimalPayload: { ids: ["notif_1"] },
  },
  {
    name: "Queue SSE (Real-time)",
    route: "/api/queue/sse",
    method: "GET",
    access: ALL_ACCESS,
    category: "other",
    isMutation: false,
  },
  {
    name: "Templates",
    route: "/api/templates",
    method: "GET",
    access: ALL_ACCESS,
    category: "other",
    isMutation: false,
  },
  {
    name: "Link Preview",
    route: "/api/link-preview",
    method: "POST",
    access: ALL_ACCESS,
    category: "other",
    isMutation: true,
    minimalPayload: P_LINK_PREVIEW,
  },
  {
    name: "Tweet Lookup",
    route: "/api/x/tweet-lookup",
    method: "POST",
    access: ALL_ACCESS,
    category: "other",
    isMutation: true,
    minimalPayload: P_TWEET_LOOKUP,
  },
  {
    name: "User Feedback",
    route: "/api/feedback",
    method: "POST",
    access: ALL_ACCESS,
    category: "other",
    isMutation: true,
    minimalPayload: P_FEEDBACK,
  },
  {
    name: "Referral Program",
    route: "/api/user/set-referrer",
    method: "POST",
    access: ALL_ACCESS,
    category: "other",
    isMutation: true,
    minimalPayload: { referralCode: "REF_TEST" },
  },
  {
    name: "GDPR Data Export",
    route: "/api/user/export",
    method: "GET",
    access: ALL_ACCESS,
    category: "other",
    isMutation: false,
  },
  {
    name: "Delete Account",
    route: "/api/user/delete",
    method: "DELETE",
    access: ALL_ACCESS,
    category: "other",
    isMutation: true,
  },
  {
    name: "Contact Form",
    route: "/api/community/contact",
    method: "POST",
    access: ALL_ACCESS,
    category: "other",
    isMutation: true,
    minimalPayload: P_CONTACT,
  },
  {
    name: "Changelog",
    route: "/api/changelog",
    method: "GET",
    access: ALL_ACCESS,
    category: "other",
    isMutation: false,
  },
  {
    name: "System Announcements",
    route: "/api/announcement",
    method: "GET",
    access: ALL_ACCESS,
    category: "other",
    isMutation: false,
  },
];

// ---------------------------------------------------------------------------
// Derived helpers used by tests
// ---------------------------------------------------------------------------

/** Services with a plan gate (used by gate unit tests) */
export const GATED_SERVICES = SERVICE_CATALOG.filter((s) => s.gate);

/** Services without a plan gate (all tiers) */
export const UNGATED_SERVICES = SERVICE_CATALOG.filter((s) => !s.gate);

/** Services safe for production smoke (read-only GET endpoints) */
export const PROD_SMOKE_SERVICES = SERVICE_CATALOG.filter((s) => !s.isMutation && s.route);

/** All unique gate function names used in the catalog */
export const ALL_GATES = Array.from(
  new Set(SERVICE_CATALOG.filter((s) => s.gate).map((s) => s.gate!))
).sort();

/** Get services by category */
export function getServicesByCategory(category: ServiceCategory): ServiceExpectation[] {
  return SERVICE_CATALOG.filter((s) => s.category === category);
}

/** Get expected access for a plan */
export function getExpectedAccess(service: ServiceExpectation, plan: PlanType): boolean {
  return service.access[plan];
}

/** Count services accessible per plan */
export function countAccessibleServices(plan: PlanType): number {
  return SERVICE_CATALOG.filter((s) => s.access[plan]).length;
}

/** Count services with a specific gate */
export function countServicesByGate(gate: string): number {
  return SERVICE_CATALOG.filter((s) => s.gate === gate).length;
}
