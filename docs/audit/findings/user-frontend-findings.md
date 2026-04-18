# AstraPost User-Facing Frontend Audit

**Scope:** Components, page layouts, and UX patterns for user-facing pages (public, auth, dashboard, AI tools, settings).

---

## High Severity Issues

### FH-1: AI Sub-Tools Completely Orphaned — Bio, Reply, Calendar Not Discovered

**Files:**

- `src/app/dashboard/ai/page.tsx` (hub)
- `src/app/dashboard/ai/bio/page.tsx` (orphaned)
- `src/app/dashboard/ai/reply/page.tsx` (orphaned)
- `src/app/dashboard/ai/calendar/page.tsx` (orphaned)
- `src/components/dashboard/sidebar-nav-data.ts` (sidebar)

**Issue:** The AI hub (`/dashboard/ai`) displays 4 tool cards: Thread Writer, URL→Thread, A/B Variants, Hashtag Generator. Three fully-implemented AI tools are completely missing:

- Bio Generator (`/dashboard/ai/bio`)
- Reply Generator (`/dashboard/ai/reply`)
- AI Calendar (`/dashboard/ai/calendar`)

These pages are real implementations with full UI, but they are not linked in the hub's card grid and not in the sidebar's AI Tools section. Users cannot discover them.

**Impact:** Pro plan users who paid for these features cannot access them. Feature discoverability is 0%.

**Fix:**

1. Add cards to `/dashboard/ai` hub page:

```typescript
const tools = [
  { title: "Thread Writer", description: "...", href: "/dashboard/ai/writer", icon: PenIcon },
  { title: "AI Bio Generator", description: "...", href: "/dashboard/ai/bio", icon: UserIcon },
  {
    title: "AI Reply Suggester",
    description: "...",
    href: "/dashboard/ai/reply",
    icon: MessageIcon,
  },
  {
    title: "Content Calendar",
    description: "...",
    href: "/dashboard/ai/calendar",
    icon: CalendarIcon,
  },
  // ... others
];
```

2. Add sidebar entries in `sidebar-nav-data.ts` under `AI Tools` section:

```typescript
{
  title: "AI Bio",
  href: "/dashboard/ai/bio",
  icon: UserIcon,
  badge: "Pro",
},
{
  title: "AI Reply",
  href: "/dashboard/ai/reply",
  icon: MessageIcon,
  badge: "Pro",
},
{
  title: "Content Calendar",
  href: "/dashboard/ai/calendar",
  icon: CalendarIcon,
  badge: "Pro",
},
```

---

### FH-2: Instagram/LinkedIn Account Disconnect Are Non-Functional Stubs

**Files:**

- `src/components/settings/connected-instagram-accounts.tsx`
- `src/components/settings/connected-linkedin-accounts.tsx`

**Current:** Both components render a trash icon for each connected account. Clicking it shows a toast:

```typescript
const handleDisconnect = () => {
  toast.info("Disconnect feature coming soon");
};
```

**Issue:** Users see an interactive Trash button that appears functional but does nothing. The API endpoint likely doesn't exist or is incomplete.

**Additional Issue:** When/if implemented, no confirmation dialog exists before disconnecting (compare to X account disconnect which uses an `AlertDialog`).

**Impact:** Users cannot revoke Instagram/LinkedIn credentials. If a user's Instagram account is compromised, they cannot disconnect it from AstraPost. This is a security and UX issue.

**Fix:**

1. Implement the disconnect endpoints at:
   - `src/app/api/accounts/instagram/disconnect/route.ts`
   - `src/app/api/accounts/linkedin/disconnect/route.ts`

2. Update components to show confirmation before disconnecting:

```typescript
const [open, setOpen] = useState(false);

const handleDisconnect = async (accountId: string) => {
  setOpen(false);

  try {
    const res = await fetch("/api/accounts/instagram/disconnect", {
      method: "POST",
      body: JSON.stringify({ accountId }),
    });

    if (!res.ok) throw new Error("Disconnect failed");

    toast.success("Account disconnected");
    // Refetch accounts list
  } catch (error) {
    toast.error("Failed to disconnect account");
  }
};

return (
  <AlertDialog open={open} onOpenChange={setOpen}>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="sm">
        <Trash2 className="h-4 w-4" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Disconnect Instagram Account?</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogDescription>
        AstraPost will no longer be able to publish posts to this account. This cannot be undone.
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={() => handleDisconnect(account.id)}>
          Disconnect
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
```

---

### FH-3: No Global 401 Interceptor for Session Expiry

**Files:** All client components that call `fetch()` directly

**Issue:** When a user's session expires, they see generic error toasts or error boundary states like "Something went wrong" instead of being redirected to `/login`. Example problematic flows:

- `/dashboard/compose`: "Error saving draft" without explanation
- `/dashboard/queue`: "Failed to load queue" with no recovery path
- `/dashboard/analytics`: "Failed to fetch analytics" instead of "Please log in again"

There is no global client-side 401 handler.

**Impact:** Users are left confused and with no way to recover. They must manually navigate to `/login`.

**Fix:** Create `src/lib/fetch-with-auth.ts`:

```typescript
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status === 401) {
    // Session expired
    const { signOut } = await import("@/lib/auth-client");
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        },
      },
    });
    // Never returns — redirects
    return new Promise(() => {});
  }

  return res;
}
```

Then replace all `fetch()` calls in client components with `fetchWithAuth()`.

---

## Medium Severity Issues

### FM-1: Composer SPA Navigation Loses Unsaved Drafts

**File:** `src/components/composer/composer.tsx`

**Issue:** The composer has a `beforeunload` listener that warns if unsaved content exists:

```typescript
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (hasUnsavedContent) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [hasUnsavedContent]);
```

However, this **only fires on hard tab close.** Clicking a sidebar link triggers Next.js client-side navigation, which bypasses the `beforeunload` event entirely. Users can navigate away mid-draft without any warning.

**Impact:** Data loss. Users lose draft content silently if they click the sidebar while composing.

**Fix:** Add a Next.js navigation guard using the `useRouter` hook (if using app router) or implement a custom router event:

```typescript
const router = useRouter();

useEffect(() => {
  const handleRouteChange = (url: string) => {
    if (hasUnsavedContent && !window.confirm("Discard unsaved draft?")) {
      router.events.emit("routeChangeError");
      throw "Abort route change";
    }
  };

  router.events.on("routeChangeStart", handleRouteChange);
  return () => router.events.off("routeChangeStart", handleRouteChange);
}, [hasUnsavedContent, router]);
```

Alternative: Use Next.js 16 experimental `onNavigate` hook if available.

---

### FM-2: Main Analytics Charts Missing ARIA Labels

**Files:**

- `src/components/analytics/charts-client.tsx`
- `src/components/analytics/follower-chart.tsx`
- `src/components/analytics/impressions-chart.tsx`
- `src/components/analytics/engagement-rate-chart.tsx`

**Current:** The charts render using Recharts `ResponsiveContainer` with no accessibility attributes:

```typescript
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={data}>
    {/* ... */}
  </AreaChart>
</ResponsiveContainer>
```

**Issue:** Screen reader users get no semantic description. The chart is non-text content with no alternative text. This violates WCAG 1.1.1.

Other charts like `BestTimeHeatmap` correctly have `aria-label` on the table and cells.

**Impact:** Accessibility failure. Vision-impaired users cannot understand the analytics.

**Fix:** Add `aria-label` to each chart container:

```typescript
<ResponsiveContainer
  width="100%"
  height={300}
  aria-label="Follower growth over the past 30 days"
>
  <AreaChart data={data}>
    {/* ... */}
  </AreaChart>
</ResponsiveContainer>
```

---

### FM-3: Settings Forms Have No Dirty-State Tracking

**Files:**

- `src/components/settings/profile-form.tsx`
- `src/components/settings/voice-profile-form.tsx` (if exists)
- Any form in `/dashboard/settings/*`

**Issue:** The forms use React Hook Form but never check `form.formState.isDirty`. The Save button is enabled unconditionally (only disabled during `loading`):

```typescript
<Button disabled={loading}>
  Save
</Button>
```

**Problems:**

1. User lands on settings and immediately clicks Save → unnecessary API call
2. No visual indicator that the form has unsaved changes
3. No warning if user navigates away after making changes

**Standard SaaS pattern:** Save button is disabled when `!isDirty`, and a confirmation dialog appears if navigating away with unsaved changes.

**Impact:** Wasted API calls, poor UX signal.

**Fix:**

```typescript
const { isDirty, isSubmitting } = form.formState;

// Before navigation
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [isDirty]);

// Save button
<Button disabled={!isDirty || isSubmitting}>
  {isSubmitting ? "Saving..." : "Save"}
</Button>
```

---

### FM-4: AI Hub Shows No Usage Quota Before Generation Attempts

**File:** `src/app/dashboard/ai/page.tsx`

**Issue:** The hub displays 4 tool cards but fetches no usage data. A user with 0 AI credits remaining can click into any tool, fill a complex prompt, click Generate, and only then receive an error: "AI quota exhausted."

The quota **is** displayed in the sidebar (`post-usage-bar.tsx`), but only if the user is on the dashboard and can see the sidebar. The hub page itself is blind to the user's quota.

**Impact:** UX friction. Users waste effort typing prompts before learning they're out of quota. No upgrade CTA appears at the point of friction.

**Fix:** Fetch and display quota on the hub:

```typescript
const session = await auth.api.getSession();
const usage = await getMonthlyAiUsage(session.user.id);
const remaining = usage.limit - usage.used;

// Display banner
{remaining === 0 && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>AI Quota Exhausted</AlertTitle>
    <AlertDescription>
      You have used all {usage.limit} AI generations this month.
      <Link href="/dashboard/settings/billing" className="font-semibold underline">
        Upgrade to Pro
      </Link>
    </AlertDescription>
  </Alert>
)}

// Show quota bar above tools
<ProgressBar label="AI Usage" value={usage.used} max={usage.limit} />
```

---

### FM-5: Error Boundaries Never Call Sentry

**Files:** All `src/app/**/error.tsx` files

**Current:** Error boundaries catch errors and log to console:

```typescript
"use client";

export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return <DashboardError message="Something went wrong" />;
}
```

**Issue:** Errors are never sent to Sentry. Production errors are invisible to observability.

There is a `src/lib/client-error-handler.ts` with a `reportError` function that calls Sentry, but it's never imported in `error.tsx` files.

**Impact:** Runtime errors in production are lost. The team has no visibility into frontend failures.

**Fix:** Add Sentry call in all `error.tsx`:

```typescript
import { reportError } from "@/lib/client-error-handler";

export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    reportError(error, { context: "dashboard-error-boundary" });
  }, [error]);

  return <DashboardError message="Something went wrong" />;
}
```

---

### FM-6: /dashboard/affiliate Missing From Sidebar Navigation

**File:** `src/components/dashboard/sidebar-nav-data.ts`

**Issue:** The `/dashboard/affiliate` page exists and is fully implemented (product URL form, AI-generated tweets, send-to-composer CTA), but there is no sidebar link.

Users who are affiliate partners cannot self-serve; they must guess the URL.

**Impact:** Affiliate feature is invisible.

**Fix:** Add entry to `sidebar-nav-data.ts` under Growth section:

```typescript
{
  title: "Affiliate Dashboard",
  href: "/dashboard/affiliate",
  icon: Link2Icon,
  badge: "New",
},
```

---

## Low Severity Issues

### FL-1: Pricing Page "Contact Sales" Button is Mislabeled

**File:** `src/app/(marketing)/pricing/page.tsx`

**Current:** The "Contact Sales" button links to `/community`:

```typescript
<Link href="/community">Contact Sales</Link>
```

**Issue:** `/community` is a general community page, not a sales contact form. The label is misleading.

**Fix:** Either:

1. Create a dedicated `/contact-sales` page with a form
2. Change the link to an external URL like `mailto:sales@astrapost.com`
3. Change label to "Join Community" if the intent is community engagement

---

### FL-2: /dashboard/admin/webhooks Uses Dashboard Layout, Should Use Admin Layout

**File:** `src/app/dashboard/admin/webhooks/page.tsx`

**Issue:** The webhook DLQ admin page:

- Uses the dashboard layout (`DashboardPageWrapper`)
- Calls `requireAdmin()` manually
- Is not linked in either the dashboard sidebar or admin sidebar

Architecturally, it should be at `/admin/webhooks` and use the admin layout.

**Impact:** Admin can only reach this page via direct URL. Feature is hidden.

**Fix:**

1. Move file from `src/app/dashboard/admin/webhooks/page.tsx` to `src/app/admin/webhooks/page.tsx`
2. Remove manual `requireAdmin()` call (admin layout handles it)
3. Add sidebar entry in admin sidebar under System section:

```typescript
{
  title: "Webhooks",
  href: "/admin/webhooks",
  icon: WebhookIcon,
},
```

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| High      | 3      |
| Medium    | 6      |
| Low       | 2      |
| **Total** | **11** |
