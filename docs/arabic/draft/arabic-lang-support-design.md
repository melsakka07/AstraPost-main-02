After reviewing your codebase, I have great news: **you already have an excellent foundation for localization built into the app!**

You are already using `next-intl`, you have the `Cairo` font configured specifically for Arabic, and your `src/app/layout.tsx` is dynamically switching the text direction (`dir="rtl"`) based on the session language.

Since SEO is not your primary focus, here is the best industry-practice strategy to scale this up with the least complication.

### The Strategy: Session/Cookie-Based Localization (No URL Routing)

Instead of complicating your app with `/[locale]/` subpaths in the URL (like `/en/dashboard` or `/ar/dashboard`), you should keep your URLs exactly as they are (`/dashboard`).

**Why this is the best strategy for you:**

1. **Zero Routing Complexity:** You don't need complex Next.js middleware to rewrite or redirect URLs.
2. **Single Source of Truth:** The language is tied directly to the user's account (`session.user.language`) or a browser cookie.
3. **Plug-and-Play:** Your `NextIntlClientProvider` is already set up in `layout.tsx` to wrap the whole app.

### The Missing Link: Fixing `request.ts`

Right now, your app relies on `locale` being passed automatically to `src/i18n/request.ts`. Because we are _not_ using URL routing, Next.js won't pass this automatically. We need to update `request.ts` to actively read the session or the `locale` cookie.

I have generated a diff above for `src/i18n/request.ts`. Please **Review and Accept** it. This will securely lock in the Arabic/English translation capability across all Server and Client components.<mccoremem id="03g0ew6c5haviknj4270i316r" />

---

### Pages & Areas to Localize

To fully support Arabic users, here is the checklist of areas you need to localize by moving hardcoded strings into `src/i18n/messages/en.json` and `ar.json`:

1. **Authentication Pages (`src/app/(auth)`)**
   - `/login`, `/register`, `/forgot-password`, `/reset-password`
   - _Crucial for onboarding MENA users smoothly._
2. **Dashboard Navigation & Shell (`src/components/dashboard`)**
   - The Sidebar navigation and Mobile Menu (you already started this!).
   - The User Profile dropdown and Notification Bell.
3. **Core Dashboard Features (`src/app/dashboard`)**
   - **Post Management:** `/dashboard/compose`, `/dashboard/queue`, `/dashboard/drafts`
   - **Analytics:** General, Competitor, and Viral analytics.
   - **Settings:** Profile, Team, and Billing management.
4. **AI Tools (`src/app/dashboard/ai`)**
   - Writer, Reply Generator, Bio Generator, and Agentic Posting.
   - _Note: Ensure the AI prompts themselves are instructed to output Arabic when the user's language is set to `ar`._
5. **Marketing Pages (`src/app/(marketing)`)**
   - Homepage (`/`), Pricing (`/pricing`), and Features (`/features`).
   - Even without SEO, if you are driving traffic here, it needs to be in Arabic to convert.
6. **Transactional Emails (Resend)**
   - Team Invites, Password Resets, and Billing notifications should check the user's language preference before sending.

### How to Streamline the Scale-up

Whenever you build a new feature or refactor an old one, simply follow this pattern:

**For Client Components (`"use client"`):**

```tsx
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("my_namespace");
  return <div>{t("title")}</div>;
}
```

**For Server Components (Pages/Layouts):**

```tsx
import { getTranslations } from "next-intl/server";

export default async function MyPage() {
  const t = await getTranslations("my_namespace");
  return <h1>{t("heading")}</h1>;
}
```

By sticking to this cookie/session-based approach, you avoid all the headaches of localized static generation and middleware rewrites, keeping your codebase extremely clean and focused strictly on building product features.
