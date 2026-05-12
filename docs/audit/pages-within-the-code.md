# AstraPost — Complete Page & Route Audit

**Audit date:** 2026-05-12  
**Scope:** All user-facing pages and routes in `src/app/`  
**Methodology:** Cross-referenced `page.tsx` glob, layout auth checks, sidebar nav data (`src/components/dashboard/sidebar-nav-data.ts`), command palette entries, sitemap (`src/app/sitemap.ts`), feature flags (`src/lib/feature-flags.ts`), and per-page `requireAdmin()` / `getTeamContext()` calls.

---

## 1. Public & Marketing Pages

No authentication required. Served under the `(marketing)` layout with `<SiteHeader />` + `<SiteFooter />`, except `/brand` which is standalone.

| #   | Route Path       | Page Title       | Auth | Description                                                                                               |
| --- | ---------------- | ---------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| 1   | `/`              | Landing Page     | No   | Main marketing homepage. Highest sitemap priority (1.0).                                                  |
| 2   | `/features`      | Features         | No   | Platform capability overview.                                                                             |
| 3   | `/pricing`       | Pricing          | No   | Subscription plans and pricing tiers. Sitemap priority 0.9.                                               |
| 4   | `/changelog`     | Changelog        | No   | Product updates and release notes.                                                                        |
| 5   | `/docs`          | Documentation    | No   | User guides and platform documentation.                                                                   |
| 6   | `/community`     | Community        | No   | Links to community and support channels.                                                                  |
| 7   | `/blog`          | Blog Index       | No   | Marketing blog post listing.                                                                              |
| 8   | `/blog/[slug]`   | Blog Post        | No   | Individual blog post (dynamic route). Sitemap priority 0.6.                                               |
| 9   | `/roadmap`       | Public Roadmap   | No   | Public-facing planned features.                                                                           |
| 10  | `/resources`     | Resources        | No   | Educational resources and guides.                                                                         |
| 11  | `/legal/terms`   | Terms of Service | No   | Legal terms and conditions. Sitemap priority 0.3.                                                         |
| 12  | `/legal/privacy` | Privacy Policy   | No   | Legal privacy policy. Sitemap priority 0.3.                                                               |
| 13  | `/brand`         | Brand Assets     | No   | Standalone page (not under marketing layout). Logo system, color tokens, typography, downloadable assets. |

---

## 2. Authentication & Onboarding Pages

Served under the `(auth)` layout (pass-through, no SiteHeader/SiteFooter).

| #   | Route Path              | Page Title      | Auth | Roles         | Description                                                                                                                                                                                      |
| --- | ----------------------- | --------------- | ---- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 14  | `/login`                | Login           | No   | Public        | Sign-in page. Accepts `?ref=` query param for referral attribution. Accepts `?callbackUrl=` for post-login redirect. Sitemap priority 0.5.                                                       |
| 15  | `/register`             | Register        | No   | Public        | New user registration. Sitemap priority 0.5.                                                                                                                                                     |
| 16  | `/forgot-password`      | Forgot Password | No   | Public        | Password recovery request form.                                                                                                                                                                  |
| 17  | `/reset-password`       | Reset Password  | No   | Public        | Password reset confirmation (token-based).                                                                                                                                                       |
| 18  | `/join-team`            | Join Team       | No\* | Invite Token  | Accept invitation to join an existing team. Requires valid token in URL params. (\*Token serves as auth gate — no session needed.)                                                               |
| 19  | `/dashboard/onboarding` | User Onboarding | Yes  | Authenticated | Initial setup checklist for new sign-ups. Auto-redirect: un-onboarded users are forced here; onboarded users are bounced to `/dashboard`. Rendered in a minimal header-only layout (no sidebar). |

---

## 3. Dashboard Core Pages (Authenticated)

Every route under `/dashboard/*` is wrapped by `DashboardLayout` which calls `getTeamContext()`. If no session, redirects to `/login`. If not onboarded, redirects to `/dashboard/onboarding`. All pages here require authentication.

### 3.1 Overview & Content

| #   | Route Path            | Page Title         | Roles         | Description                                                                    |
| --- | --------------------- | ------------------ | ------------- | ------------------------------------------------------------------------------ |
| 20  | `/dashboard`          | Dashboard Overview | Authenticated | Main hub: usage stats, upcoming posts, activity overview. Sidebar entry point. |
| 21  | `/dashboard/compose`  | Composer           | Authenticated | Create and schedule posts/threads. Sidebar entry.                              |
| 22  | `/dashboard/drafts`   | Drafts             | Authenticated | View and edit saved draft posts. Sidebar entry.                                |
| 23  | `/dashboard/queue`    | Post Queue         | Authenticated | List of scheduled posts in the publishing queue. Sidebar entry.                |
| 24  | `/dashboard/calendar` | Content Calendar   | Authenticated | Calendar view of scheduled and published content. Sidebar entry.               |

### 3.2 AI Tools (Hub & Spoke)

Hub page `/dashboard/ai` lives in the sidebar; all sub-pages are reachable via hub cards, command palette, or direct URL.

| #   | Route Path                        | Page Title          | Roles               | Description                                                                            |
| --- | --------------------------------- | ------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| 25  | `/dashboard/ai`                   | AI Tools Hub        | Authenticated       | Central grid of all AI tools. Sidebar entry.                                           |
| 26  | `/dashboard/ai/writer`            | AI Writer           | Authenticated       | Generate posts/threads from prompts. Also serves `?tab=url` for URL-to-thread variant. |
| 27  | `/dashboard/ai/agentic`           | Agentic Auto-Pilot  | Authenticated (Pro) | Advanced multi-step AI content generation. Sidebar entry (Pro badge).                  |
| 28  | `/dashboard/ai/reply`             | AI Reply            | Authenticated       | Generate contextual replies to tweets. Command palette entry.                          |
| 29  | `/dashboard/ai/bio`               | Profile Bio Gen     | Authenticated       | Create optimized X/Twitter bios. Command palette entry.                                |
| 30  | `/dashboard/ai/calendar`          | AI Content Calendar | Authenticated       | Generate a week/month content strategy. Command palette entry.                         |
| 31  | `/dashboard/ai/youtube-to-thread` | YouTube to Thread   | Authenticated (Pro) | Convert a YouTube video into a thread. Pro-gated.                                      |
| 32  | `/dashboard/ai/pdf-to-thread`     | PDF to Thread       | Authenticated (Pro) | Convert uploaded PDF documents into a thread. Pro-gated.                               |

### 3.3 Analytics

| #   | Route Path                        | Page Title          | Roles         | Description                                                                       |
| --- | --------------------------------- | ------------------- | ------------- | --------------------------------------------------------------------------------- |
| 33  | `/dashboard/analytics`            | Analytics Overview  | Authenticated | General engagement and growth stats. Hub page; viral and competitor are sub-tabs. |
| 34  | `/dashboard/analytics/viral`      | Viral Analytics     | Authenticated | Track top-performing viral posts. Tab on analytics hub.                           |
| 35  | `/dashboard/analytics/competitor` | Competitor Analysis | Authenticated | Compare stats against competitor accounts. Tab on analytics hub.                  |

### 3.4 Growth & Engagement

| #   | Route Path                | Page Title          | Roles           | Description                                                                                                                                |
| --- | ------------------------- | ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 36  | `/dashboard/inspiration`  | Inspiration         | Authenticated   | View saved bookmarks and post inspiration. Sidebar entry.                                                                                  |
| 37  | `/dashboard/achievements` | Achievements        | Authenticated   | User milestones and gamification progress. Sidebar entry.                                                                                  |
| 38  | `/dashboard/affiliate`    | Affiliate Dashboard | Authenticated   | User's affiliate program stats and links. Sidebar entry.                                                                                   |
| 39  | `/dashboard/referrals`    | Referrals           | Authenticated\* | View referrals and earned credits. **Feature flagged** (`referral_program`). Redirects to `/dashboard` if flag is disabled. Sidebar entry. |

### 3.5 Settings (Tabbed Sub-Layout)

`/dashboard/settings` uses a client-side tab layout (`SettingsLayout`). All sub-pages require authentication. The main `/dashboard/settings` route returns a simple page; navigation is tab-based.

| #   | Route Path                          | Page Title            | Roles           | Description                                                                                                                                                                   |
| --- | ----------------------------------- | --------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 40  | `/dashboard/settings`               | Settings (Nav)        | Authenticated   | Settings landing — thin wrapper with tab navigation only.                                                                                                                     |
| 41  | `/dashboard/settings/profile`       | Profile Settings      | Authenticated   | Edit personal user profile, language, and preferences.                                                                                                                        |
| 42  | `/dashboard/settings/billing`       | Billing Settings      | Authenticated\* | Manage subscription, plan usage, and billing portal. \*No role gate — any authenticated user can view their own billing. Sidebar entry.                                       |
| 43  | `/dashboard/settings/notifications` | Notification Settings | Authenticated   | Manage email and app notification preferences. Tab entry.                                                                                                                     |
| 44  | `/dashboard/settings/integrations`  | Integrations          | Authenticated\* | Manage connected social accounts (X, LinkedIn, Instagram). \*No role gate — any authenticated user can view/manage their own connections. Tab entry.                          |
| 45  | `/dashboard/settings/team`          | Team Members          | Authenticated\* | View team members and invites. \*All authenticated users can view. `canManage` (invite/remove) restricted to Owner + Admin roles via `ctx.isOwner \|\| ctx.role === "admin"`. |

### 3.6 Admin-Gated Pages Under Dashboard Layout

These sit under the dashboard layout (which uses `getTeamContext()`) but individually call `requireAdmin()`. Listed in sidebar with `isAdmin: true`. Accessible via URL only if the user is a platform admin.

| #   | Route Path              | Page Title         | Roles          | Description                                                            |
| --- | ----------------------- | ------------------ | -------------- | ---------------------------------------------------------------------- |
| 46  | `/dashboard/jobs`       | Background Jobs    | **Admin Only** | Monitor BullMQ job queues and job run history. Calls `requireAdmin()`. |
| 47  | `/dashboard/ai/history` | Generation History | **Admin Only** | Platform-wide view of all AI generations. Calls `requireAdmin()`.      |

### 3.7 Standalone Authenticated Pages

These pages are outside `/dashboard` but require authentication via their own `auth.api.getSession()` checks.

| #   | Route Path | Page Title        | Roles         | Description                                                                              |
| --- | ---------- | ----------------- | ------------- | ---------------------------------------------------------------------------------------- |
| 48  | `/profile` | User Profile      | Authenticated | View user details, security info, and account preferences. Full-page client component.   |
| 49  | `/chat`    | AI Chat Assistant | Authenticated | Conversational AI interface using `@ai-sdk/react` `useChat`. Full-page client component. |

---

## 4. Admin Pages (🔒 Hidden & Restricted)

All routes under `/admin` are wrapped by `AdminLayout` which calls `requireAdmin()` (redirects to `/login` on failure). Force-dynamic rendering. Admin sidebar provides navigation.

| #   | Route Path                    | Page Title         | Description                                                   |
| --- | ----------------------------- | ------------------ | ------------------------------------------------------------- |
| 50  | `/admin`                      | Admin Dashboard    | High-level platform stats and KPIs.                           |
| 51  | `/admin/teams`                | Manage Teams       | View and manage all platform teams.                           |
| 52  | `/admin/subscribers`          | Subscribers        | User/subscriber management and list.                          |
| 53  | `/admin/subscribers/[id]`     | Subscriber Detail  | Detailed view and actions for a specific user. Dynamic route. |
| 54  | `/admin/billing`              | Billing Overview   | Platform revenue and Stripe integration status.               |
| 55  | `/admin/billing/analytics`    | Billing Analytics  | Deep dive into financial metrics.                             |
| 56  | `/admin/billing/promo-codes`  | Promo Codes        | Create and manage Stripe promo codes.                         |
| 57  | `/admin/ai-usage`             | AI Usage Stats     | Platform-wide AI generation usage tracking.                   |
| 58  | `/admin/ai-cost`              | AI Cost Analysis   | Track costs associated with OpenRouter/Replicate.             |
| 59  | `/admin/ai-metrics`           | AI Performance     | Analytics on AI model speed and success rates.                |
| 60  | `/admin/agentic`              | Agentic Monitor    | Monitor autonomous agent runs.                                |
| 61  | `/admin/affiliate`            | Affiliate Mgmt     | Global affiliate program administration.                      |
| 62  | `/admin/referrals`            | Referrals Mgmt     | Global referral program administration.                       |
| 63  | `/admin/content`              | Content Moderation | Review platform content and templates.                        |
| 64  | `/admin/announcement`         | Announcements      | Create global banners and announcements.                      |
| 65  | `/admin/notifications`        | Notifications Mgmt | Send platform-wide notifications.                             |
| 66  | `/admin/roadmap`              | Roadmap Mgmt       | Update the public-facing product roadmap.                     |
| 67  | `/admin/jobs`                 | Background Jobs    | Monitor BullMQ job queues and workers (admin-level view).     |
| 68  | `/admin/webhooks`             | Webhooks Monitor   | View system webhook logs and dead-letter queues.              |
| 69  | `/admin/health`               | System Health      | Monitor DB, Redis, and overall system status.                 |
| 70  | `/admin/audit`                | Audit Logs         | View security and action audit logs.                          |
| 71  | `/admin/feature-flags`        | Feature Flags      | Toggle platform feature flags globally.                       |
| 72  | `/admin/impersonation`        | Impersonation      | Impersonate users for support purposes.                       |
| 73  | `/admin/soft-delete-recovery` | Data Recovery      | Restore soft-deleted records.                                 |

---

## 5. Deprecated / Redirected Pages

| #   | Route Path                  | Status         | Description                                                                           |
| --- | --------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| 74  | `/dashboard/admin/webhooks` | **Deprecated** | Legacy path. Automatically issues `redirect("/admin/webhooks")`. No content rendered. |

---

## 6. Non-Page Routes (API / Utility)

These are registered in the App Router but are not HTML pages. Included for completeness.

| Route Path        | Type            | Description                                                                                |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `/go/[shortCode]` | API Route (GET) | Affiliate link shortener. Tracks click, then `NextResponse.redirect()` to destination URL. |
| `/api/*`          | API Routes      | 100+ API endpoints under `src/app/api/`. Not user-facing pages.                            |

---

## 7. Feature Flag Gates

Feature flags stored in `featureFlags` DB table, cached in Redis for 10 min. Managed via `/admin/feature-flags`. The following flags affect page/route accessibility:

| Flag Key               | Default | Effect When Disabled                             |
| ---------------------- | ------- | ------------------------------------------------ |
| `referral_program`     | `true`  | `/dashboard/referrals` redirects to `/dashboard` |
| `ai_image_generation`  | `true`  | AI image generation via Replicate is blocked     |
| `instagram_publishing` | `false` | Instagram publishing features hidden             |
| `linkedin_publishing`  | `false` | LinkedIn publishing features hidden              |
| `team_collaboration`   | `true`  | Team workspace features hidden                   |
| `promo_codes`          | `true`  | Promo code entry at checkout hidden              |

---

## 8. Auth Enforcement Summary

| Layout / Area                                                  | Auth Mechanism                              | Behavior on Fail                                                                   |
| -------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `(marketing)` layout                                           | None                                        | Public access                                                                      |
| `(auth)` layout                                                | None                                        | Public access                                                                      |
| Root layout                                                    | None (renders providers only)               | Public access                                                                      |
| `DashboardLayout` (`/dashboard/*`)                             | `getTeamContext()`                          | Redirect to `/login` if null; redirect to `/dashboard/onboarding` if not onboarded |
| `AdminLayout` (`/admin/*`)                                     | `requireAdmin()`                            | Redirect to `/login` if not admin                                                  |
| Standalone pages (`/profile`, `/chat`, `/join-team`, `/brand`) | Per-page `auth.api.getSession()` or no auth | Redirect to `/login` or public                                                     |
| `/dashboard/jobs`, `/dashboard/ai/history`                     | `requireAdmin()` (individual)               | Redirect to `/login` if not admin                                                  |

---

## 9. Sitemap Coverage

The `src/app/sitemap.ts` exports the following public routes for search engines. All authenticated, admin, deprecated, and API routes are excluded by design.

`/`, `/pricing`, `/features`, `/resources`, `/blog`, `/changelog`, `/docs`, `/community`, `/login`, `/register`, `/legal/privacy`, `/legal/terms`, plus dynamic `/blog/[slug]` entries.

**Notable omissions from sitemap** (marked for review):

- `/brand` — public page but not listed in sitemap
- `/roadmap` — public page but not listed in sitemap

---

## 10. Verification Checklist

- [x] All `src/app/**/page.tsx` files accounted for (74 entries in sections 1–5)
- [x] Cross-referenced against `src/components/dashboard/sidebar-nav-data.ts`
- [x] Cross-referenced against `src/components/command-palette.tsx`
- [x] Cross-referenced against `src/app/sitemap.ts`
- [x] Cross-referenced against `src/lib/feature-flags.ts`
- [x] Auth enforcement verified per-layout and per-page (`requireAdmin`, `getTeamContext`, `auth.api.getSession`)
- [x] Role-based access verified for settings pages (team management gated to Owner/Admin)
- [x] Dynamic routes documented (`/blog/[slug]`, `/admin/subscribers/[id]`, `/go/[shortCode]`)
- [x] Deprecated route documented (`/dashboard/admin/webhooks` → `/admin/webhooks`)
- [x] Feature-flagged pages identified (`/dashboard/referrals`)
- [x] Error boundaries noted (`error.tsx` in 20+ route segments)
- [x] `not-found.tsx` exists at root app level
