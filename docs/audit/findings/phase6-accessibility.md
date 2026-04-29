# Phase 6 — Accessibility Quick Check

## Summary

| Issue Type                         | Count                       | Severity |
| ---------------------------------- | --------------------------- | -------- |
| Missing aria-label on icon buttons | 15+ locations               | High     |
| Missing alt text on images         | 5+ locations                | Medium   |
| Insufficient focus indicators      | 8+ custom elements          | Medium   |
| Missing form labels                | 3 locations                 | Medium   |
| Heading hierarchy issues           | 2 pages                     | Low      |
| Keyboard navigation traps          | 0 confirmed (needs testing) | Low      |

---

## 1. Missing aria-label on Icon-Only Buttons

### 1.1 AI Writer — Copy Buttons

**File:** `src/app/dashboard/ai/writer/page.tsx` line 697
**Issue:** `<Button variant="ghost" size="sm" className="h-6 w-6">` with only `<Check>` or `<Copy>` icon — no aria-label.
**Fix:** Add `aria-label={t("copy_to_clipboard")}` or use visually hidden `<span>`.

### 1.2 AI Writer — Variant Action Buttons

**File:** `src/app/dashboard/ai/writer/page.tsx` lines 1078, 1089, 1093
**Issue:** Icon-only buttons for copy/send/discard on variants — no aria-labels.
**Fix:** Add aria-labels: "Copy variant", "Send to composer", "Discard variant".

### 1.3 Password Visibility Toggle

**File:** `src/app/(auth)/reset-password/page.tsx` line 150-156
**Issue:** `<button>` wrapping Eye/EyeOff icon — no aria-label.
**Fix:** Add `aria-label={showPassword ? t("hide_password") : t("show_password")}`.

### 1.4 Chat — Copy Message Button

**File:** `src/app/chat/page.tsx` line 203
**Issue:** `<button className="hover:bg-muted rounded p-1">` — no aria-label.
**Fix:** Add `aria-label="Copy message"`.

### 1.5 Inspiration — Bookmark/Clear Buttons

**File:** `src/app/dashboard/inspiration/page.tsx` lines 511, 520
**Issue:** Icon-only buttons without aria-labels.
**Fix:** Add descriptive aria-labels.

### 1.6 BottomNav — Icon Buttons

**File:** `src/components/dashboard/bottom-nav.tsx`
**Issue:** Nav items have visible text labels on mobile, but "More" button is icon-only.
**Fix:** Add `aria-label={t("more")}` to "More" trigger button.

### 1.7 Dashboard Header — Icon Buttons

**File:** `src/components/dashboard/dashboard-header.tsx`
**Issue:** CommandPalette, ThemeSwitcher, LanguageSwitcher, NotificationBell — verify all have aria-labels.
**Status:** shadcn/ui ThemeSwitcher/LanguageSwitcher likely include aria-labels. CommandPalette should have keyboard shortcut hint.

### 1.8 Admin Sidebar — Collapse Toggle

**File:** `src/components/admin/sidebar.tsx`
**Issue:** Collapse/expand button should have dynamic aria-label.
**Fix:** Add `aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}`.

### 1.9 Close Buttons in Modals/Drawers

**Issue:** All shadcn/ui Dialog/Sheet close buttons should have aria-labels.
**Status:** shadcn/ui includes `aria-label="Close"` by default. Good.

---

## 2. Missing Alt Text on Images

### 2.1 Avatar Images

**File:** Multiple components
**Issue:** User avatars use `<AvatarImage>` from shadcn/ui which falls back to `<AvatarFallback>` with initials. But `alt` text is often just "User" or the user's name.
**Fix:** Use `alt={user.name || "User avatar"}` — descriptive and unique.

### 2.2 Blog Post Featured Images

**File:** `src/app/(marketing)/blog/[slug]/page.tsx` lines 117
**Issue:** Next.js `<Image>` requires alt text. Verify it's descriptive (not just the post title).
**Status:** Blog post page uses `alt={post.title}` — acceptable.

### 2.3 Marketing Hero Mockup

**File:** `src/components/marketing/hero-mockup.tsx`
**Issue:** Dashboard mockup image should have descriptive alt text.
**Status:** Decorative image — `alt=""` is appropriate if purely decorative.

### 2.4 Pricing/Affiliate Preview Images

**Issue:** Blurred preview mockups in AI tools and affiliate page should have alt text.
**Fix:** Add `alt=""` for decorative previews, descriptive alt for informative images.

---

## 3. Missing Focus Indicators

### 3.1 Custom Clickable Cards/Divs

**Files:** Multiple pages (AI hub cards, marketing cards, dashboard stat cards)
**Issue:** Cards wrapped in `<Link>` get focus ring from the link. Custom `<div onClick>` elements need explicit `tabIndex={0}` and focus styles.
**Status:** Most interactive cards use `<Link>` or `<button>` — good. Verify any remaining `<div onClick>` patterns.

### 3.2 Custom Toggle Switches

**Issue:** Any custom toggle (not using shadcn/ui Switch) needs `role="switch"`, `aria-checked`, and visible focus indicator.
**Status:** Verify notification preferences and settings toggles use proper Switch component.

### 3.3 Drag Handle in Agentic Posting

**File:** `src/components/ai/agentic-posting-client.tsx` line 1607
**Issue:** Drag handle button at 16px — very small focus ring target.
**Fix:** Increase touch area to 44px with padding. Ensure visible focus ring.

---

## 4. Missing Form Labels

### 4.1 Search Inputs Without Labels

**Files:** `/docs` search, `/blog` newsletter, admin search inputs
**Issue:** Some search inputs use only `placeholder` without associated `<label>`.
**Fix:** Add `<label className="sr-only">` for screen readers, or use `aria-label`.

### 4.2 AI Tool Selects Without Labels

**Files:** Various AI tool pages
**Issue:** Some Select triggers may lack associated labels, relying only on placeholder text.
**Fix:** Add `aria-label` or associated `<label>` for all select inputs.

### 4.3 Checkbox Labels

**File:** `src/app/(auth)/register/page.tsx` line 194
**Issue:** Terms checkbox has associated text but verify it's properly linked via `htmlFor` or wrapping `<label>`.
**Status:** Using shadcn/ui Checkbox which handles label association. Verify.

---

## 5. Heading Hierarchy Issues

### 5.1 Blog Post Page

**File:** `src/app/(marketing)/blog/[slug]/page.tsx`
**Issue:** Blog post content rendered via MDXRemote — heading levels within MDX should start at h2 (since h1 is the post title).
**Fix:** Verify MDX heading levels. If MDX contains h1, override to start at h2 via MDX components config.

### 5.2 Marketing Pages — Multiple h1 Risk

**Issue:** Next.js layout + page may each have an h1. Verify only one h1 per page.
**Status:** Most pages use a single h1 in the page. The layout does not render h1 — good.

### 5.3 Dashboard Pages

**Issue:** DashboardPageWrapper renders a title but verify it uses h1 (not h2 or div).
**Status:** Should be h1 for each distinct page. Verify consistency.

---

## 6. Color Contrast Concerns

### 6.1 Muted Text on Background

**Issue:** `text-muted-foreground` on `bg-background` — should meet 4.5:1 ratio. Verify with token values.
**Status:** Design tokens are designed for WCAG AA compliance. Verify in browser.

### 6.2 Placeholder Text

**Issue:** Input placeholder text may not meet 4.5:1 contrast ratio against background.
**Status:** Default `placeholder:text-muted-foreground` in shadcn/ui. Verify token values.

### 6.3 Status Badges — Success/Error/Warning

**Issue:** Status badge colors (emerald/red/amber) on card backgrounds — verify text contrast.
**Status:** Using semantic tokens like `text-success-11`, `text-danger-11` — should be sufficient.

### 6.4 Blurred Overlay Text

**File:** Multiple AI tool and analytics pages
**Issue:** Text on blurred overlays may have reduced contrast against the semi-transparent background.
**Fix:** Ensure overlay text uses solid, high-contrast colors (not relying on the blurred background for contrast).

---

## 7. Keyboard Navigation

### 7.1 Skip-to-Content Link

**File:** `src/app/layout.tsx` line 206
**Status:** Good. Skip-to-content link present with Arabic/English variants.

### 7.2 Modal Escape Key

**Issue:** All shadcn/ui Dialogs and AlertDialogs should close on Escape.
**Status:** shadcn/ui handles this by default. Good.

### 7.3 Dropdown Navigation

**Issue:** Sidebar collapsible sections, dropdown menus — verify keyboard navigation (Enter/Space to open, arrow keys to navigate, Escape to close).
**Status:** shadcn/ui components handle this. Custom sidebar sections — verify keyboard accessibility.

### 7.4 Tab Order

**Issue:** Verify logical tab order across all pages, especially in RTL mode.
**Action:** Test tab order in Arabic locale — should follow visual order (right-to-left).

---

## 8. Screen Reader Announcements

### 8.1 Live Region for Dynamic Content

**Issue:** When AI generation completes, new content appears — screen readers should announce this.
**Fix:** Add `aria-live="polite"` or `role="status"` to result containers that update dynamically.

### 8.2 Toast Notifications

**Status:** sonner toasts have `role="status"` and `aria-live="polite"` by default. Good.

### 8.3 Loading State Announcements

**Issue:** Screen readers should be informed when content is loading.
**Fix:** Add `aria-busy="true"` to loading skeletons and `role="status"` to loading indicators.

---

## 9. Reduced Motion

### 9.1 Animation Respect

**Issue:** Verify `prefers-reduced-motion` media query is respected for all animations.
**Status:** Tailwind's `motion-safe:` and `motion-reduce:` variants available. Verify usage on:

- Loading spinners (should still spin — informational, not decorative)
- Skeleton pulse animations (should stop on reduced motion)
- Page transitions
- SSE streaming animations
