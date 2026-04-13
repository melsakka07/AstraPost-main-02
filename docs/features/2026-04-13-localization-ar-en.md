# Localization Plan: Arabic + English (EN/AR)

**Date:** 2026-04-13  
**Scope:** All non-admin pages — full English ↔ Arabic localization  
**Future languages:** German (de), Spanish (es), French (fr) — architecture must support them from day one  
**Admin pages:** Excluded from localization

---

## 1. Assessment: Is It a Good Idea?

**Yes — strongly recommended.** Here's why:

### Business case

- AstraPost is explicitly MENA-focused. Arabic is the first language of your primary market.
- Twitter/X usage in Arab countries is among the highest per capita globally (Saudi Arabia, UAE, Egypt, Kuwait).
- Most Arabic-speaking content creators currently use English-only tools with poor UX — this is a real differentiator.
- Arabic UI + RTL layout signals trust and product quality to MENA users.

### Technical feasibility

- The app **already has the RTL infrastructure**: locale cookie, `dir` attribute on `<html>`, Cairo font loaded, `:lang(ar)` CSS applied, sidebar RTL-aware.
- This means the hardest layout work is done. You are adding **text translation**, not rebuilding the UI.

### Risks / Caveats

- **Scope is real.** ~47 non-admin pages + shared components + API error messages + email templates. This is a multi-week effort if done correctly.
- **AI-generated content** (tweet suggestions, bios, inspiration) should remain in the user's chosen language by default — the AI prompts must pass the locale.
- **Legal pages** (Privacy, Terms) need actual Arabic legal translation — not just UI strings. Budget for a translator.

---

## 2. Current i18n Infrastructure (What Already Exists)

The app has partial groundwork:

| Feature                                | Status            |
| -------------------------------------- | ----------------- |
| Locale cookie (`locale`)               | ✅ Exists         |
| `<html lang dir>` set from cookie      | ✅ Exists         |
| RTL detection (`ar`, `he`, `fa`, `ur`) | ✅ Exists         |
| Cairo font for Arabic                  | ✅ Loaded         |
| `:lang(ar)` CSS styles                 | ✅ Exists         |
| Sidebar RTL drawer direction           | ✅ Exists         |
| Translation files / i18n framework     | ❌ Does not exist |
| Translated strings                     | ❌ Does not exist |
| Locale URL routing (`/ar/...`)         | ❌ Does not exist |
| Language switcher UI                   | ❌ Does not exist |

**Conclusion:** The skeleton is there. What's missing is a translation framework and all the string translations.

---

## 3. Recommended Stack: `next-intl`

Use **[next-intl](https://next-intl.dev/)** — the standard i18n solution for Next.js App Router.

### Why next-intl over alternatives

| Criterion                 | next-intl                              | i18next / react-i18next |
| ------------------------- | -------------------------------------- | ----------------------- |
| App Router support        | Native                                 | Requires adapter        |
| Server Components         | Yes (no client bundle cost)            | No (client-only)        |
| RTL-aware                 | Works with existing `dir` setup        | Same                    |
| Bundle size               | ~8KB per locale                        | ~40KB baseline          |
| Type safety               | Full TypeScript via `createTranslator` | Partial                 |
| Plurals / numbers / dates | Built-in (ICU format)                  | Plugin                  |
| Next.js 16 compatibility  | Yes                                    | Partial                 |

### Architecture choice: Locale in URL vs Cookie

Two options:

**Option A — URL prefix routing** (e.g. `/ar/dashboard`, `/en/dashboard`)

- SEO-friendly for marketing pages
- Standard next-intl pattern
- Requires middleware to detect and redirect
- Breaking change to all existing URLs

**Option B — Cookie-based** (keep existing cookie, wrap with next-intl)

- Zero URL changes
- Dashboard locale is user preference (not SEO content)
- Marketing pages won't be SEO-indexed in Arabic
- Less complex implementation

**Recommendation:** **Hybrid approach**

- Marketing pages (`/`, `/pricing`, `/blog`, etc.) → URL prefix (`/ar/pricing`) for SEO
- Auth + Dashboard pages → Cookie-based locale (no URL change) — already works, user sets preference in Settings
- Admin pages → English only, no change

---

## 4. Pages That Need Localization

### 4.1 Marketing Pages (13 pages — URL prefix + SEO)

These are public-facing and benefit from Arabic SEO indexing.

| Route            | File                                 | Priority                            |
| ---------------- | ------------------------------------ | ----------------------------------- |
| `/`              | `(marketing)/page.tsx`               | P0 — Homepage                       |
| `/pricing`       | `(marketing)/pricing/page.tsx`       | P0 — Revenue-critical               |
| `/features`      | `(marketing)/features/page.tsx`      | P0                                  |
| `/blog`          | `(marketing)/blog/page.tsx`          | P1                                  |
| `/blog/[slug]`   | `(marketing)/blog/[slug]/page.tsx`   | P1 — Blog posts need Arabic content |
| `/changelog`     | `(marketing)/changelog/page.tsx`     | P2                                  |
| `/community`     | `(marketing)/community/page.tsx`     | P2                                  |
| `/docs`          | `(marketing)/docs/page.tsx`          | P2                                  |
| `/resources`     | `(marketing)/resources/page.tsx`     | P2                                  |
| `/roadmap`       | `(marketing)/roadmap/page.tsx`       | P2                                  |
| `/legal/privacy` | `(marketing)/legal/privacy/page.tsx` | P1 — Needs legal translation        |
| `/legal/terms`   | `(marketing)/legal/terms/page.tsx`   | P1 — Needs legal translation        |
| Marketing layout | `(marketing)/layout.tsx`             | P0 — Nav, footer                    |

### 4.2 Auth Pages (4 pages)

| Route              | File                              | Priority |
| ------------------ | --------------------------------- | -------- |
| `/login`           | `(auth)/login/page.tsx`           | P0       |
| `/register`        | `(auth)/register/page.tsx`        | P0       |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | P0       |
| `/reset-password`  | `(auth)/reset-password/page.tsx`  | P0       |
| Auth layout        | `(auth)/layout.tsx`               | P0       |

### 4.3 Dashboard Pages (24 pages + shared components)

| Route                             | File                                      | Priority                          |
| --------------------------------- | ----------------------------------------- | --------------------------------- |
| `/dashboard`                      | `dashboard/page.tsx`                      | P0                                |
| `/dashboard/onboarding`           | `dashboard/onboarding/page.tsx`           | P0 — First experience             |
| `/dashboard/compose`              | `dashboard/compose/page.tsx`              | P0 — Core feature                 |
| `/dashboard/drafts`               | `dashboard/drafts/page.tsx`               | P0                                |
| `/dashboard/queue`                | `dashboard/queue/page.tsx`                | P0                                |
| `/dashboard/calendar`             | `dashboard/calendar/page.tsx`             | P0                                |
| `/dashboard/ai`                   | `dashboard/ai/page.tsx`                   | P0                                |
| `/dashboard/ai/agentic`           | `dashboard/ai/agentic/page.tsx`           | P1                                |
| `/dashboard/ai/bio`               | `dashboard/ai/bio/page.tsx`               | P1                                |
| `/dashboard/ai/calendar`          | `dashboard/ai/calendar/page.tsx`          | P1                                |
| `/dashboard/ai/reply`             | `dashboard/ai/reply/page.tsx`             | P1                                |
| `/dashboard/ai/writer`            | `dashboard/ai/writer/page.tsx`            | P1                                |
| `/dashboard/ai/history`           | `dashboard/ai/history/page.tsx`           | P2                                |
| `/dashboard/analytics`            | `dashboard/analytics/page.tsx`            | P0                                |
| `/dashboard/analytics/viral`      | `dashboard/analytics/viral/page.tsx`      | P1                                |
| `/dashboard/analytics/competitor` | `dashboard/analytics/competitor/page.tsx` | P1                                |
| `/dashboard/achievements`         | `dashboard/achievements/page.tsx`         | P1                                |
| `/dashboard/affiliate`            | `dashboard/affiliate/page.tsx`            | P1                                |
| `/dashboard/referrals`            | `dashboard/referrals/page.tsx`            | P1                                |
| `/dashboard/inspiration`          | `dashboard/inspiration/page.tsx`          | P1                                |
| `/dashboard/jobs`                 | `dashboard/jobs/page.tsx`                 | P2                                |
| `/dashboard/settings`             | `dashboard/settings/page.tsx`             | P0 — Language switcher lives here |
| `/dashboard/settings/team`        | `dashboard/settings/team/page.tsx`        | P1                                |
| Dashboard layout                  | `dashboard/layout.tsx`                    | P0                                |

### 4.4 Other Pages (3 pages)

| Route        | File                 | Priority |
| ------------ | -------------------- | -------- |
| `/chat`      | `chat/page.tsx`      | P1       |
| `/join-team` | `join-team/page.tsx` | P1       |
| `/profile`   | `profile/page.tsx`   | P1       |

### 4.5 Shared Components (must be localized)

| Component                | Location                                          | Notes                   |
| ------------------------ | ------------------------------------------------- | ----------------------- |
| Sidebar                  | `components/dashboard/sidebar.tsx`                | Nav labels, tooltips    |
| Dashboard page wrapper   | `components/dashboard/dashboard-page-wrapper.tsx` | Title/description props |
| Notification bell        | Likely in `components/`                           | Toast messages          |
| Plan upgrade dialogs     | Various                                           | Upgrade prompts         |
| Error boundaries         | Various                                           | Error text              |
| API error messages       | `lib/api/errors.ts`                               | Client-facing errors    |
| Toast notifications      | Various                                           | All user-facing toasts  |
| Form validation messages | Via Zod schemas                                   | Zod error maps          |

---

## 5. What Needs to Change in the Code

### 5.1 Install next-intl

```bash
pnpm add next-intl
```

### 5.2 Create Translation Files

```
messages/
  en.json      ← all English strings
  ar.json      ← all Arabic strings (future: de.json, es.json, fr.json)
```

Organized by namespace:

```json
{
  "common": { "save": "Save", "cancel": "Cancel", ... },
  "nav": { "dashboard": "Dashboard", "compose": "Compose", ... },
  "auth": { "login": { "title": "Sign in", ... } },
  "dashboard": { ... },
  "compose": { ... },
  "settings": { "language": "Language", ... },
  "errors": { "unauthorized": "...", "notFound": "..." },
  "marketing": { "hero": { "headline": "...", ... } }
}
```

### 5.3 Middleware (for marketing URL prefix)

Create `src/middleware.ts` (or update if exists) using next-intl middleware:

```typescript
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
```

### 5.4 Routing Config

```typescript
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  // Marketing pages use URL prefix; dashboard uses cookie
  localePrefix: {
    mode: "as-needed", // /en → /, /ar/pricing → /ar/pricing
  },
});
```

### 5.5 Root Layout Update

```typescript
// src/app/layout.tsx — add next-intl provider
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// Replace manual locale cookie reading with next-intl's locale detection
// Keep the existing RTL dir logic
```

### 5.6 Replace Hardcoded Strings

Every hardcoded UI string gets replaced with `t('key')`:

```tsx
// Before
<h1>Compose</h1>;

// After (Server Component)
import { getTranslations } from "next-intl/server";
const t = await getTranslations("compose");
<h1>{t("title")}</h1>;

// After (Client Component)
import { useTranslations } from "next-intl";
const t = useTranslations("compose");
<h1>{t("title")}</h1>;
```

### 5.7 Language Switcher in Settings

Add a language selector to `/dashboard/settings`. When user changes language:

1. Update locale cookie (existing mechanism)
2. Call `router.refresh()` to re-render with new locale

### 5.8 AI Prompt Locale Injection

All AI endpoints must receive the user's locale and pass it to prompts:

```typescript
// In AI route handlers — add locale parameter
const locale = req.headers.get("x-locale") ?? "en";
const systemPrompt =
  locale === "ar" ? "أنت مساعد محتوى محترف..." : "You are a professional content assistant...";
```

### 5.9 Date/Number Formatting

Replace direct `new Date().toLocaleDateString()` with next-intl's `useFormatter()` which handles Arabic numerals, Hijri calendar awareness, and locale-specific formatting.

### 5.10 Zod Error Maps

Register an Arabic Zod error map for form validation:

```typescript
import { zodI18nMap } from "zod-i18n-map";
import translation from "zod-i18n-map/locales/ar/zod.json";
z.setErrorMap(zodI18nMap); // Use i18n map per locale
```

---

## 6. What Does NOT Need Changing

- **Admin pages** — excluded by design
- **RTL CSS** — already implemented
- **Cairo font** — already loaded
- **Document dir attribute** — already set
- **Sidebar RTL drawer direction** — already implemented
- **Database schema** — no schema changes needed
- **API responses** — only client-visible error messages need translation
- **Redis / BullMQ** — backend only, not user-facing

---

## 7. Implementation Phases

### Phase 1 — Foundation (Week 1)

**Goal:** next-intl installed and working end-to-end with zero visible changes to users

- [ ] Install `next-intl`
- [ ] Create `messages/en.json` and `messages/ar.json` scaffolding
- [ ] Configure `src/i18n/routing.ts`
- [ ] Update root layout to use `NextIntlClientProvider`
- [ ] Add middleware for URL-prefix localization on marketing pages
- [ ] Add language switcher component to Settings page
- [ ] Validate RTL still works after migration
- [ ] `pnpm run check` passes

### Phase 2 — Auth + Marketing Pages (Week 1–2)

**Goal:** Public-facing pages fully translated (highest SEO and first-impression value)

- [ ] Translate all auth pages (login, register, forgot/reset password)
- [ ] Translate marketing layout (navbar, footer)
- [ ] Translate homepage
- [ ] Translate pricing page
- [ ] Translate features page
- [ ] Translate remaining marketing pages (blog, docs, changelog, community, resources, roadmap)
- [ ] Legal pages (Privacy, Terms) — Arabic text requires human translator
- [ ] `pnpm run check` passes

### Phase 3 — Dashboard Core (Week 2–3)

**Goal:** Core product pages fully translated

- [ ] Translate sidebar (all nav labels, tooltips, badges)
- [ ] Translate dashboard home page
- [ ] Translate onboarding page
- [ ] Translate compose page (all labels, placeholders, buttons)
- [ ] Translate drafts, queue, calendar pages
- [ ] Translate settings pages (language switcher live here)
- [ ] Translate shared components (page wrapper, notification bell, toasts)
- [ ] `pnpm run check` passes

### Phase 4 — AI Tools + Analytics (Week 3–4)

**Goal:** All feature pages translated; AI responses locale-aware

- [ ] Translate all AI tool pages (writer, agentic, bio, calendar, reply, history, inspiration)
- [ ] Inject locale into all AI endpoint system prompts
- [ ] Translate all analytics pages
- [ ] Translate achievements, affiliate, referrals pages
- [ ] Translate chat, profile, join-team pages
- [ ] `pnpm run check` passes

### Phase 5 — Polish + Edge Cases (Week 4)

**Goal:** Production-ready

- [ ] Arabic Zod error map for form validation
- [ ] Date/number formatting via `useFormatter()`
- [ ] API error messages translated (client-facing errors from `lib/api/errors.ts`)
- [ ] Email templates localized (if applicable)
- [ ] RTL regression testing across all pages
- [ ] Native Arabic speaker review of all translations
- [ ] `pnpm test` passes
- [ ] `pnpm run check` passes

---

## 8. Future Languages (de, es, fr)

The architecture described above makes adding new languages trivial:

1. Add locale to `routing.ts` locales array
2. Create `messages/de.json` (copy `en.json`, translate)
3. Update language switcher options
4. Zero code changes needed anywhere else

---

## 9. Effort Estimate

| Phase                          | Pages                 | Effort         |
| ------------------------------ | --------------------- | -------------- |
| Phase 1: Foundation            | Infrastructure        | 2–3 days       |
| Phase 2: Auth + Marketing      | 13 pages              | 3–5 days       |
| Phase 3: Dashboard Core        | 8 pages + sidebar     | 4–6 days       |
| Phase 4: AI + Analytics + Rest | 20 pages + AI prompts | 5–7 days       |
| Phase 5: Polish                | Cross-cutting         | 3–4 days       |
| **Total**                      | **47 pages**          | **~3–4 weeks** |

> **Note:** This assumes one developer writing translations directly. With a dedicated Arabic translator reviewing strings, add 1–2 weeks for back-and-forth on legal pages and marketing copy.

---

## 10. Key Risks and Mitigations

| Risk                                                                      | Mitigation                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Legal pages need accurate Arabic legal text                               | Hire a legal translator; do not use AI for this                              |
| AI-generated content in wrong language                                    | Inject locale into all AI system prompts (Phase 4)                           |
| RTL regression on newly added UI                                          | Test all pages in both LTR and RTL before each phase merges                  |
| Missing strings at runtime                                                | next-intl provides missing key warnings in dev mode                          |
| Date/number formatting edge cases (Hijri calendar, Arabic-Indic numerals) | Use `useFormatter()` from next-intl; test with Arabic locale explicitly      |
| SEO impact of URL structure change for marketing pages                    | Use `hreflang` tags and canonical URLs; next-intl handles this automatically |

---

## 11. Files to Create / Modify Summary

### New Files

```
messages/en.json                    ← English translation strings
messages/ar.json                    ← Arabic translation strings
src/i18n/routing.ts                 ← next-intl routing config
src/i18n/request.ts                 ← next-intl server request config
src/middleware.ts                   ← next-intl locale middleware (or update existing)
src/components/language-switcher.tsx ← Language selector UI component
```

### Modified Files

```
src/app/layout.tsx                  ← Add NextIntlClientProvider
src/app/dashboard/settings/page.tsx ← Add language switcher
src/components/dashboard/sidebar.tsx ← Replace hardcoded labels with t()
src/lib/api/errors.ts               ← Add locale-aware error messages
src/app/(auth)/*/page.tsx           ← All 4 auth pages
src/app/(marketing)/*/page.tsx      ← All 12 marketing pages
src/app/dashboard/*/page.tsx        ← All 24 dashboard pages
src/app/chat/page.tsx
src/app/join-team/page.tsx
src/app/profile/page.tsx
src/app/api/*/route.ts              ← AI endpoints: inject locale into prompts
package.json                        ← Add next-intl dependency
```

### Unchanged Files

```
src/app/admin/**                    ← All admin pages (excluded)
src/lib/schema.ts                   ← No DB changes needed
src/lib/queue/**                    ← Backend workers, not user-facing
```
