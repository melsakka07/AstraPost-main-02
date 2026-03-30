# AstraPost — UI/UX Implementation Plan
> Landing Page & Footer Links Review
> Created: 2026-03-14 | Status: In Progress

---

## Executive Summary

This plan addresses UI/UX improvements across the landing page and all footer-linked pages of AstraPost. Issues were identified through a full visual audit of http://localhost:3000/ and each footer destination. The plan is broken into **6 phases**, each self-contained and shippable. Phases are ordered by impact and dependency.

**Overall Theme Constraint:** Maintain the existing design system — OKLch color tokens, Geist font, shadcn/ui components, Tailwind CSS 4, and the `from-primary/10 via-purple-500/10 to-pink-500/10` gradient language.

---

## Audit Findings

### Landing Page (`/`)

| Issue | Severity | Location |
|-------|----------|----------|
| Hero text is left-aligned on mobile — h1/p tags lack `text-center` | Medium | `page.tsx` hero section |
| Badge label has a leading space `" ✨ AI-Powered..."` | Low | `page.tsx` line 20 |
| No product screenshot or UI mockup in the hero | High | `page.tsx` hero section |
| Hero CTA buttons not centered on mobile | Medium | `page.tsx` line 29 |
| Company logos in social proof are plain text strings | High | `social-proof.tsx` |
| Testimonial avatars are single-letter placeholders | Medium | `social-proof.tsx` |
| Only 3 features shown; product has 6+ actual features | Medium | `page.tsx` features grid |
| No scroll-to-features smooth scroll from hero CTA | Low | `page.tsx` |

### Header (`/components/site-header.tsx`)

| Issue | Severity | Location |
|-------|----------|----------|
| No mobile hamburger menu — nav links just disappear on mobile | High | `site-header.tsx` |
| No active/current-page indicator on nav links | Medium | `site-header.tsx` |
| Header only shows 3 links (Features, Pricing, Blog) — Changelog and Resources missing | Low | `site-header.tsx` |
| No hover underline or visual affordance on nav links | Low | `site-header.tsx` |

### Footer (`/components/site-footer.tsx`)

| Issue | Severity | Location |
|-------|----------|----------|
| `/resources` page exists but is NOT linked anywhere in the footer | High | `site-footer.tsx` |
| Footer link hovers are missing `transition-colors` CSS | Medium | `site-footer.tsx` |
| No social media links (X/Twitter, Discord) | Medium | `site-footer.tsx` |
| Footer has no newsletter CTA or social proof element | Low | `site-footer.tsx` |
| Logo in footer lacks `aria-label` | Low | `site-footer.tsx` |
| Footer category headings lack `text-xs uppercase tracking-wider` visual hierarchy | Low | `site-footer.tsx` |
| Copyright bar could benefit from a status page or build trust signals | Low | `site-footer.tsx` |

### Footer Link Pages

| Page | Route | Status | Issues Found |
|------|-------|--------|--------------|
| Features | `/features` | ✅ Working | Consistent with design system. Minor: no hero image |
| Pricing | `/pricing` | ✅ Working | Good. Server-rendered with plan data |
| Changelog | `/changelog` | ✅ Working | Good timeline UI. Missing RSS feed link |
| Documentation | `/docs` | ✅ Working | Article links go to non-existent `/docs/intro` etc. (404s) |
| Blog | `/blog` | ✅ Working | Good design. Missing category filters |
| Community | `/community` | ✅ Working | Stats section well done. External Discord link OK |
| Resources | `/resources` | ✅ Working | **NOT linked from footer** — users can't find this page |
| Privacy Policy | `/legal/privacy` | ✅ Working | Minimal sections — real policy needs more content |
| Terms of Service | `/legal/terms` | ✅ Working | Minimal sections — real ToS needs more content |

---

## Phase 1 — Footer Fixes & Accessibility ✅ COMPLETE
**Priority:** P0 — These are functional gaps and broken discoverability.
**Files:** `src/components/site-footer.tsx`
**Completed:** 2026-03-14

### Steps

1. **Add `/resources` to the Resources column**
   - Currently the Resources column lists: Documentation, Blog, Community
   - Add "Resources" as the first item linking to `/resources`
   - This page exists but is completely unreachable from the UI

2. **Add `transition-colors duration-200` to all footer links**
   - Current: `className="hover:text-foreground"`
   - Fixed: `className="hover:text-foreground transition-colors duration-200"`

3. **Add Social Media links section**
   - Add a row of icon-links below the brand description
   - Links: X/Twitter (`https://twitter.com/astrapost`), Discord (`https://discord.gg/astrapost`)
   - Use `lucide-react` icons: `Twitter` (or `X`), and a simple Discord SVG
   - Style: `text-muted-foreground hover:text-foreground transition-colors`

4. **Improve footer heading visual hierarchy**
   - Current: `<h4 className="font-semibold mb-4">Product</h4>`
   - Updated: `<h4 className="font-semibold mb-4 text-xs uppercase tracking-wider text-muted-foreground">Product</h4>`
   - This is a standard pattern for footer navigation headings

5. **Add `aria-label` to footer logo link**
   - Wrap the brand div in a `<Link>` with `aria-label="AstraPost - Home"`

6. **Improve copyright bar**
   - Add a trust signal: "Secured by industry-standard encryption"
   - Keep copyright text, add a small separator, then the trust signal on the same line on desktop

### Acceptance Criteria
- [x] `/resources` is accessible via footer link
- [x] All footer links have smooth hover transitions (`transition-colors duration-200`)
- [x] Social media links visible in footer (X/Twitter + Discord with inline brand SVGs)
- [x] Footer headings use uppercase tracking style (`text-xs font-semibold uppercase tracking-wider`)
- [x] Brand logo wrapped in `<Link>` with `aria-label="AstraPost — Go to homepage"`
- [x] `<footer>` has `aria-label="Site footer"` landmark
- [x] Social icons group has `aria-label="Social media links"`
- [x] Trust signal added to copyright bar (lock icon + "Secured with industry-standard encryption")
- [x] Brand column takes `lg:col-span-2` — wider presence on large screens
- [x] 5-column layout on lg, 2-col on sm, stacked on mobile
- [x] All 9 footer links return HTTP 200 — verified via browser
- [x] Light mode verified ✓ | Dark mode verified ✓ | Mobile (375px) verified ✓
- [x] `pnpm run check` passes — 0 errors, 0 new warnings

### Notes
- Hydration warning observed during testing is **pre-existing** (present before these changes). Root cause: `next-themes` + Next.js 16 script injection order. Only `src/components/site-footer.tsx` was modified (confirmed via `git diff --stat HEAD`). Flagged for Phase 6 investigation.

---

## Phase 2 — Header Mobile Navigation ✅ COMPLETE
**Priority:** P1 — Mobile users have zero navigation access.
**Files:** `src/components/site-header.tsx`, `src/components/header-nav.tsx` (new), `src/components/mobile-menu.tsx` (new)
**Completed:** 2026-03-14

### Steps

1. **`HeaderNav` — new client component for desktop nav** (`src/components/header-nav.tsx`)
   - `"use client"` with `usePathname()` for active state detection
   - Active link: `text-foreground font-semibold` + `aria-current="page"`
   - Inactive links: `text-muted-foreground hover:text-foreground`
   - Hover effect: `underline-offset-4 hover:underline`
   - Hidden on mobile via `hidden md:flex`

2. **`MobileMenu` — new client component** (`src/components/mobile-menu.tsx`)
   - Receives `isAuthenticated: boolean` prop from Server Component parent
   - Hamburger toggle (`md:hidden`) with `Menu`/`X` icon swap
   - Panel: `absolute top-full left-0 right-0 z-50` (positioned relative to sticky header)
   - Backdrop: `fixed inset-0 z-40 bg-background/80 backdrop-blur-sm` — closes on click
   - Animation: `visible/invisible` + `opacity` + `translate-y` transition (no layout shift)
   - Escape key closes via event listener in `useEffect`
   - Body scroll lock while open
   - All links use `onClick={close}` (avoids `react-hooks/set-state-in-effect` ESLint rule)
   - Auth CTAs: "Go to Dashboard" if authenticated, else "Sign In" + "Get Started Free"

3. **`SiteHeader` — updated** (`src/components/site-header.tsx`)
   - Remains a Server Component (reads auth session server-side)
   - Extracts `isAuthenticated = !!session` → passes to `<MobileMenu>`
   - Desktop auth buttons wrapped in `hidden md:flex`
   - Uses `<HeaderNav />` for desktop nav links

### Acceptance Criteria
- [x] Hamburger menu visible on mobile (< md breakpoint) — `md:hidden`
- [x] All nav links accessible on mobile (Features, Pricing, Blog, Changelog)
- [x] Active page highlighted in nav — desktop: `font-semibold text-foreground`, mobile: `bg-primary/10`
- [x] `aria-current="page"` set on active links (both desktop and mobile) — verified via DOM
- [x] Menu closes on link click (`onClick={close}` on all links)
- [x] Escape key closes mobile menu — verified in browser
- [x] Backdrop closes menu on click outside panel
- [x] Body scroll locked while mobile menu open
- [x] No layout shift when menu opens (opacity + translate animation, not height)
- [x] Auth state reflected in mobile menu (shows Dashboard vs Sign In/Get Started)
- [x] Desktop nav links hidden on mobile; hamburger hidden on desktop
- [x] Dark mode verified ✓ | Mobile (375px) verified ✓ | Desktop (1280px) verified ✓
- [x] `pnpm run check` passes — 0 errors, 0 warnings in Phase 2 files

---

## Phase 3 — Landing Page Hero Enhancement ✅ COMPLETE
**Priority:** P1 — First impression and conversion rate directly impacted.
**Files:** `src/app/page.tsx`, `src/components/marketing/social-proof.tsx`, `src/components/marketing/hero-mockup.tsx` (new)
**Completed:** 2026-03-14

### Steps

1. **Fixed badge leading space** — `" ✨ AI-Powered..."` → `"✨ AI-Powered..."`

2. **Centered hero content** — Added `text-center` to hero container div; reduced `max-w-5xl` → `max-w-3xl` for tighter, more readable centered copy

3. **Added `HeroMockup` component** (`src/components/marketing/hero-mockup.tsx`)
   - Pure Server Component — no `"use client"` needed
   - Browser chrome with macOS-style traffic lights + URL bar (`app.astrapost.com/dashboard`)
   - Left sidebar (nav items, active state, brand logo)
   - 4 stat cards with label/value/trend indicators (green/blue)
   - Bar chart skeleton with progressively darker bars (older→lighter, recent→primary/80)
   - Scheduled post queue with avatar circles, content lines, badge pills
   - Ambient glow (gradient) behind the chrome frame
   - Bottom fade overlay (`from-background to-transparent`) masks the cutoff
   - `role="img" aria-label="AstraPost dashboard preview"` for accessibility
   - Dark mode: adapts automatically via Tailwind color tokens

4. **Section divider** — Added `h-px bg-gradient-to-r from-transparent via-border to-transparent` between hero and social proof

5. **Logo pills** in social proof — Each company name now rendered as `border border-border/40 bg-card rounded-lg px-5 py-2.5` pill with hover transition

6. **Testimonial cards enhanced:**
   - Left accent border: `absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent`
   - Large opening quote mark: `&ldquo;` in `font-serif text-5xl text-primary/20`
   - Author section: `border-t border-border/40 pt-4` divider
   - Avatar: `ring-2 ring-primary/15 ring-offset-1` ring + gradient fallback `from-primary/80 to-purple-500/80 text-white`
   - Added `role` field (Tech Content Creator / Indie Developer / Marketing Specialist)
   - Card hover: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`

7. **Feature cards** — Upgraded from `transition-shadow` to `transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`

8. **Features CTA** — `mt-12` → `mt-16`

### Acceptance Criteria
- [x] No leading space in badge text — `✨ AI-Powered Social Media Growth`
- [x] Hero content is centered on all viewport sizes (375px, 1280px verified)
- [x] Product dashboard mockup visible below CTA buttons with browser chrome
- [x] Mockup bottom-fades into page background (no abrupt cutoff)
- [x] Dark mode mockup renders correctly with dark tokens
- [x] Company logos are styled pills with borders, not plain text
- [x] Testimonials: quote mark, left accent border, stars, author role, avatar ring
- [x] Feature cards lift on hover (`-translate-y-1`)
- [x] Section divider between hero and social proof
- [x] Light mode ✓ | Dark mode ✓ | Mobile (375px) ✓ | Desktop (1280px) ✓
- [x] `pnpm run check` passes — 0 errors, 0 warnings in Phase 3 files

---

## Phase 4 — Page-Level Consistency Audit ✅ COMPLETE
**Priority:** P2 — Ensures all footer-linked pages meet quality bar.
**Files:** All pages in `src/app/(marketing)/`
**Completed:** 2026-03-14

### Steps

1. **Documentation page (`/docs`) — Fix article links**
   - All article links (e.g., `/docs/intro`, `/docs/connecting-accounts`) lead to 404s
   - Either: add `cursor-not-allowed opacity-60` + `onClick` prevention + a "Coming Soon" badge
   - Or: redirect them to `/docs` itself until individual articles are created
   - Current behavior (404) is bad UX and appears broken

2. **Resources page (`/resources`) — Add to footer navigation**
   - This is tracked in Phase 1 but the page itself needs a title alignment fix:
   - Current h1: "Resources" (same as badge) — change h1 to "Everything you need to succeed"

3. **Blog page (`/blog`) — Newsletter form**
   - The newsletter `<input>` and `<button>` in the blog CTA are raw HTML, not using shadcn `Input`/`Button`
   - Refactor to use `<Input>` and `<Button>` from `@/components/ui/` for consistency

4. **Changelog page (`/changelog`) — Consistent with other pages**
   - Good as-is. Minor: consider adding a "Subscribe to updates" link near the header

5. **Legal pages — Trust signals**
   - Both Privacy and Terms use the same 3-card trust-signal pattern — good consistency
   - Minor: Add `"Last updated: [date]"` with a proper `<time datetime="...">` element for SEO

6. **All marketing pages — Consistent page titles**
   - Verify each page exports proper `metadata` for SEO
   - None of the marketing pages currently export a `metadata` object
   - Add `export const metadata: Metadata` to each page with title + description

### Acceptance Criteria
- [x] No broken links on documentation page — all `/docs/*` show "Soon" badge; `/legal/privacy` remains a real link
- [x] Blog newsletter uses shadcn `Input` + `Button` components
- [x] All 8 marketing pages export `metadata: Metadata` with title + description
- [x] Resources page h1 changed from "Resources" → "Everything you need to succeed"
- [x] Invalid `pl-13` CSS class removed from docs page article list
- [x] `pnpm run check` passes — 0 errors, 0 new warnings in Phase 4 files
- [x] Verified in browser: /docs, /blog, /resources, /features, /legal/privacy all render correctly with correct `<title>` tags
- [x] Light mode ✓ | Dark mode ✓

---

## Phase 5 — Visual Polish & Micro-interactions ✅ COMPLETE
**Priority:** P2 — Elevates perceived quality and user delight.
**Files:** `src/app/(marketing)/features/page.tsx`, `src/components/site-footer.tsx`, `src/app/page.tsx`, `src/app/(marketing)/docs/page.tsx`, `src/app/(marketing)/resources/page.tsx`, `src/app/(marketing)/changelog/page.tsx`
**Completed:** 2026-03-14

### Changes Made

1. **Feature cards on `/features` page** — Upgraded from `hover:shadow-lg transition-shadow` to `hover:-translate-y-1 hover:shadow-lg transition-all duration-200` (matches landing page cards)

2. **Footer gradient separator** — Replaced hard `border-t` on `<footer>` with an inner `h-px bg-gradient-to-r from-transparent via-border to-transparent` element, consistent with section divider pattern used throughout the site

3. **Landing page CTA button consistency** — Fixed `size="lg" className="h-12 px-8 group"` missing `text-lg` on primary "Start Your Free Trial" button; added `className="h-12 px-8"` to secondary "View Pricing" button so both buttons match hero sizing

4. **Landing page CTA gradient enhancement** — Upgraded `shadow-lg` → `shadow-xl`; increased gradient overlay opacity `from-primary/8 via-purple-500/6 to-pink-500/8` (was /5); changed to `bg-gradient-to-br` for diagonal sweep

5. **Features page CTA section** — Added `shadow-lg`; upgraded gradient overlay to `from-primary/8 via-purple-500/6 to-pink-500/8 bg-gradient-to-br`; primary button `h-11 px-8`, secondary `h-11 px-8` for consistent pair height

6. **Docs category cards** — `transition-shadow` → `transition-all duration-200 hover:-translate-y-0.5` micro-lift

7. **Resources page cards** — `transition-shadow` → `transition-all duration-200 hover:-translate-y-0.5` micro-lift

8. **Changelog timeline dots** — `border bg-background ring-4 ring-muted` → `border-2 border-primary/40 bg-background ring-4 ring-primary/10` — subtle primary tint connects dots to brand color

9. **Scroll-to-top** — Verified: Next.js App Router handles this by default ✓

### Acceptance Criteria
- [x] Feature cards lift slightly on hover (`-translate-y-1 duration-200`) — `/features` page
- [x] Docs and Resources cards have matching `hover:-translate-y-0.5` micro-lift
- [x] Footer uses gradient separator instead of hard border — consistent with page section dividers
- [x] CTA primary buttons: `text-lg h-12 px-8` — landing hero and final CTA section both match
- [x] CTA sections on features page enhanced with gradient + shadow
- [x] Changelog timeline dots are primary-tinted (`border-primary/40 ring-primary/10`)
- [x] Dark mode: CTA gradient more visible, mockup crisp, footer separator clean ✓
- [x] Light mode ✓ | Dark mode ✓ | Verified in browser
- [x] `pnpm run check` passes — 0 errors, 0 new warnings

---

## Phase 6 — SEO & Accessibility ✅ COMPLETE (2026-03-14)
**Priority:** P3 — Critical before public launch.
**Files:** Root layout, all marketing pages, sitemap, robots
**Estimated Effort:** Medium (2–4 hours)

### Completed Steps

1. **Fixed title duplication** — All 8 marketing page `metadata.title` entries had "— AstraPost" suffix
   which caused `"X — AstraPost | AstraPost"` with the root layout template. Corrected to bare names:
   - `"Blog"`, `"Changelog"`, `"Community"`, `"Documentation"`, `"Features"`, `"Resources"`,
     `"Privacy Policy"`, `"Terms of Service"` — template renders clean `"Name | AstraPost"`

2. **Added `openGraph` + `alternates.canonical`** to all 8 marketing pages:
   - `openGraph.title` retains the full `"Page — AstraPost"` form for social sharing
   - `openGraph.url` set to the canonical path
   - `alternates.canonical` set to prevent duplicate indexing

3. **Enhanced `src/app/sitemap.ts`**:
   - Made async to support dynamic blog post routes
   - Added missing routes: `/features`, `/resources`, `/community`
   - Differentiated priorities: home (1.0), pricing (0.9), features/resources/blog (0.8),
     changelog/docs/community (0.7), auth (0.5), legal (0.3)
   - Dynamic blog posts fetched via `getAllBlogPosts()` with `priority: 0.6`
   - Wrapped blog fetch in try/catch to handle missing `content/blog/` gracefully

4. **Improved `src/app/robots.ts`**:
   - Added `/profile/`, `/chat/`, `/onboarding/` to disallow list alongside `/dashboard/`, `/api/`

5. **Semantic `<time>` elements on legal pages**:
   - Both `privacy/page.tsx` and `terms/page.tsx` — "Last updated" text now uses
     `<time dateTime="2026-03-09">March 9, 2026</time>` for machine-readable dates

6. **Verified pre-existing requirements** (already met):
   - `lang="en"` on `<html>` ✓
   - `robots` meta in root layout ✓
   - `metadataBase` set for absolute OG URLs ✓

### Acceptance Criteria
- [x] All pages have unique `<title>` tags (no duplication)
- [x] All pages have `<meta name="description">` tags
- [x] All pages have `openGraph` for social sharing
- [x] All pages have canonical URLs
- [x] `lang` attribute set on html element
- [x] sitemap.xml accessible at `/sitemap.xml` (includes dynamic blog posts)
- [x] robots.txt accessible at `/robots.txt` (all private routes disallowed)
- [x] Semantic `<time dateTime>` on legal pages
- [x] `pnpm run check` — 0 errors, 0 new warnings

---

## Implementation Order & Summary

```
Phase 1 — Footer Fixes          [CRITICAL]     ~2h   → Ship first, immediate user impact
Phase 2 — Mobile Navigation     [HIGH]         ~3h   → Ship second, fixes mobile experience
Phase 3 — Hero Enhancement      [HIGH]         ~4h   → Ship third, improves conversions
Phase 4 — Page Consistency      [MEDIUM]       ~4h   → Ship fourth, fixes broken links
Phase 5 — Visual Polish         [MEDIUM]       ~4h   → Ship fifth, elevates quality
Phase 6 — SEO & Accessibility   [IMPORTANT]    ~3h   → ✅ COMPLETE 2026-03-14
```

**Total estimated effort: ~20 hours**

---

## File Impact Summary

| File | Phases | Type of Change |
|------|--------|----------------|
| `src/components/site-footer.tsx` | 1, 5 | Add links, styles, social icons |
| `src/components/site-header.tsx` | 2 | Add mobile menu (client component) |
| `src/app/page.tsx` | 3 | Hero alignment, badge fix, mockup |
| `src/components/marketing/social-proof.tsx` | 3 | Logo/testimonial visual polish |
| `src/app/(marketing)/docs/page.tsx` | 4 | Fix broken article links |
| `src/app/(marketing)/blog/page.tsx` | 4 | Refactor newsletter form |
| `src/app/(marketing)/resources/page.tsx` | 4 | Fix duplicate h1 |
| All marketing pages | 6 | Add metadata exports |
| `src/app/layout.tsx` | 6 | Verify lang attribute |

---

## Design Principles to Maintain

Throughout all phases, adhere to these constraints:

1. **Color system**: Only use `bg-primary`, `text-muted-foreground`, `bg-background`, `border-border` tokens. No hardcoded hex values.
2. **Gradients**: Stick to the existing pattern: `from-primary/[n] via-purple-500/[n] to-pink-500/[n]`
3. **Components**: Use shadcn/ui primitives (`Button`, `Badge`, `Card`, `Input`) — do not write raw HTML equivalents
4. **Typography**: Geist font, existing size scale. No new font families.
5. **Dark mode**: All new UI must work in both light and dark mode. Test both.
6. **Responsiveness**: Mobile-first. All new layouts must be tested at 375px, 768px, 1280px.

---

## Tracking Progress

Update this file as phases are completed. Mark each phase with one of:
- `[ ] Pending`
- `[~] In Progress`
- `[x] Complete`

### Phase Status

- [x] **Phase 1** — Footer Fixes & Accessibility ✅ Complete (2026-03-14)
- [x] **Phase 2** — Header Mobile Navigation ✅ Complete (2026-03-14)
- [x] **Phase 3** — Landing Page Hero Enhancement ✅ Complete (2026-03-14)
- [x] **Phase 4** — Page-Level Consistency Audit ✅ Complete (2026-03-14)
- [x] **Phase 5** — Visual Polish & Micro-interactions ✅ Complete (2026-03-14)
- [ ] **Phase 6** — SEO & Accessibility
