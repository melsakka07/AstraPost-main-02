# Phase 5: Admin Panel UI/UX Polish

**Completed:** 2026-04-11  
**Components:** 5 new, 4 modified  
**Status:** ✓ Production Ready

## Quick Reference

### New Components

| Component                  | Location                                     | Purpose                                                  |
| -------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `AdminSidebarContent`      | `src/components/admin/sidebar-content.tsx`   | Reusable sidebar nav rendering (handles collapsed state) |
| `AdminBreadcrumbs`         | `src/components/admin/breadcrumbs.tsx`       | Admin-specific breadcrumb navigation                     |
| `DateRangePicker`          | `src/components/admin/date-range-picker.tsx` | Preset + custom date range selector                      |
| `AdminActivityFeed`        | `src/components/admin/activity-feed.tsx`     | Real-time polling activity widget                        |
| `generateAdminBreadcrumbs` | `src/lib/breadcrumbs.ts`                     | Helper to auto-generate breadcrumbs from pathname        |

### Modified Components

| File                                          | Changes                                                        |
| --------------------------------------------- | -------------------------------------------------------------- |
| `src/components/admin/sidebar.tsx`            | Added collapse toggle, mobile drawer, localStorage persistence |
| `src/app/admin/layout.tsx`                    | Simplified margin handling                                     |
| `src/components/admin/admin-page-wrapper.tsx` | Added optional breadcrumbs prop                                |
| `src/app/admin/page.tsx`                      | Integrated activity feed widget                                |

## Component Documentation

### AdminSidebar (Enhanced)

**File:** `src/components/admin/sidebar.tsx`

**Features:**

- Collapse toggle (w-64 → w-20) with smooth transition
- localStorage persistence via `admin-sidebar-collapsed` key
- Mobile drawer via Sheet component
- Hamburger menu on mobile (< md breakpoint)
- Uses extracted `AdminSidebarContent` for nav logic

**Usage:**

```tsx
// Already used in src/app/admin/layout.tsx
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }) {
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <main className="ms-64 flex-1">{children}</main>
    </div>
  );
}
```

**localStorage Key:**

```
admin-sidebar-collapsed: "true" | "false"
```

### AdminSidebarContent (New)

**File:** `src/components/admin/sidebar-content.tsx`

**Props:**

```typescript
interface AdminSidebarContentProps {
  sections: SidebarSection[];
  collapsed: boolean;
  pathname: string;
}

interface SidebarSection {
  label: string;
  items: {
    href: string;
    label: string;
    icon: LucideIcon;
  }[];
}
```

**Notes:**

- Extracted from `AdminSidebar` for reusability (used in both desktop and drawer)
- Handles text hiding when collapsed
- Icon tooltips (via `title` attr) when collapsed
- Active link highlighting via pathname comparison

### AdminBreadcrumbs (New)

**File:** `src/components/admin/breadcrumbs.tsx`

**Props:**

```typescript
interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string; // omit for current page (non-link)
}
```

**Usage:**

```tsx
import { AdminBreadcrumbs } from "@/components/admin/breadcrumbs";

export default function SubscribersPage() {
  return (
    <AdminPageWrapper
      breadcrumbs={[
        { label: "Subscribers", href: "/admin/subscribers" },
        { label: "John Doe" }, // current page, no href
      ]}
      // ...
    >
      {/* ... */}
    </AdminPageWrapper>
  );
}
```

**Features:**

- Home icon linking to `/admin`
- ChevronRight separators
- Last item (current page) is non-clickable
- Semantic nav HTML
- Accessible with aria attributes

### generateAdminBreadcrumbs (Helper)

**File:** `src/lib/breadcrumbs.ts`

**Signature:**

```typescript
export function generateAdminBreadcrumbs(pathname: string, customLabel?: string): BreadcrumbItem[];
```

**Examples:**

```typescript
// /admin → []
generateAdminBreadcrumbs("/admin");

// /admin/subscribers → [
//   { label: "Subscribers" }
// ]
generateAdminBreadcrumbs("/admin/subscribers");

// /admin/subscribers/123 → [
//   { label: "Subscribers", href: "/admin/subscribers" },
//   { label: "John Doe" }
// ]
generateAdminBreadcrumbs("/admin/subscribers/123", "John Doe");

// /admin/billing/analytics → [
//   { label: "Billing", href: "/admin/billing" },
//   { label: "Analytics" }
// ]
generateAdminBreadcrumbs("/admin/billing/analytics");
```

**Behavior:**

- Skips dynamic segments (UUIDs, numeric IDs) unless it's the last segment with a custom label
- Formats segments: `billing-analytics` → `Billing Analytics`
- Returns empty array for `/admin` home page

### DateRangePicker (New)

**File:** `src/components/admin/date-range-picker.tsx`

**Props:**

```typescript
interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: ("7d" | "30d" | "90d" | "custom")[];
  disabled?: boolean;
}

interface DateRange {
  from?: Date;
  to?: Date;
}
```

**Usage:**

```tsx
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { useState } from "react";

export default function BillingAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  return (
    <DateRangePicker
      value={dateRange}
      onChange={setDateRange}
      presets={["7d", "30d", "90d", "custom"]}
    />
  );
}
```

**Presets:**

- **7d:** Last 7 days (start of day 7 days ago → end of today)
- **30d:** Last 30 days
- **90d:** Last 90 days
- **custom:** Opens dual calendar picker (From / To)

**Features:**

- Disables future dates
- Responsive button (full-width mobile, auto width desktop)
- Shows human-readable range: "Jan 1, 2026 - Jan 31, 2026"
- Hydration-safe (checks mounted state)
- Uses shadcn/ui Calendar + Popover

### AdminActivityFeed (New)

**File:** `src/components/admin/activity-feed.tsx`

**Props:**

```typescript
interface ActivityFeedProps {
  limit?: number; // default 10
}

export function AdminActivityFeed({ limit = 10 }: ActivityFeedProps);
```

**Usage:**

```tsx
import { AdminActivityFeed } from "@/components/admin/activity-feed";

export default function AdminDashboard() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">{/* Dashboard stats */}</div>
      <AdminActivityFeed limit={10} />
    </div>
  );
}
```

**Features:**

- Real-time polling: 30s interval, 8s timeout
- AbortController pattern (prevents connection leaks)
- Fetches from `/api/admin/audit?limit=10&sort=desc`
- Shows: admin name, action, target type/ID, timestamp
- Action icons: ban (shield), suspend (alert), delete (trash), etc
- Relative timestamps: "5 minutes ago"
- Error state with retry button
- Loading skeleton
- Empty state messaging

**Polling Pattern:**

```typescript
// Internal implementation:
const inFlightRef = useRef(false);
const abortRef = useRef<AbortController | null>(null);

useEffect(() => {
  const poll = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("/api/admin/audit?limit=10&sort=desc", {
        signal: controller.signal,
      });
      // ... handle response
    } finally {
      clearTimeout(timeoutId);
      inFlightRef.current = false;
    }
  };

  const id = setInterval(poll, 30_000);
  void poll(); // run immediately
  return () => clearInterval(id);
}, []);
```

**API Response Format:**

```typescript
interface AuditLog {
  id: string;
  action: string;
  adminId: string;
  adminName?: string | null;
  adminEmail?: string | null;
  targetType: string | null;
  targetId: string | null;
  details?: unknown;
  createdAt: string;
}

// Response:
{
  data: AuditLog[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

### AdminPageWrapper (Enhanced)

**File:** `src/components/admin/admin-page-wrapper.tsx`

**New Props:**

```typescript
interface AdminPageWrapperProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[]; // NEW
  children: ReactNode;
}
```

**Usage:**

```tsx
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { generateAdminBreadcrumbs } from "@/lib/breadcrumbs";

export default function SubscriberDetailPage({ params }) {
  const breadcrumbs = generateAdminBreadcrumbs(`/admin/subscribers/${params.id}`, "John Doe");

  return (
    <AdminPageWrapper
      icon={User}
      title="Subscriber Details"
      description="View and manage subscriber information"
      breadcrumbs={breadcrumbs}
    >
      {/* ... */}
    </AdminPageWrapper>
  );
}
```

**Note:** Breadcrumbs are optional and backward compatible.

## Integration Guide

### For New Admin Pages

**Step 1: Use AdminPageWrapper**

```tsx
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { Users } from "lucide-react";

export default function Page() {
  return (
    <AdminPageWrapper icon={Users} title="Subscribers" description="Manage app subscribers">
      {/* content */}
    </AdminPageWrapper>
  );
}
```

**Step 2 (Optional): Add Breadcrumbs**

```tsx
import { generateAdminBreadcrumbs } from "@/lib/breadcrumbs";

export default function SubscriberDetail({ params }) {
  const breadcrumbs = generateAdminBreadcrumbs(`/admin/subscribers/${params.id}`, subscriberName);

  return (
    <AdminPageWrapper
      breadcrumbs={breadcrumbs}
      // ...
    >
      {/* content */}
    </AdminPageWrapper>
  );
}
```

### For Date Filtering

**Step 1: Import and Initialize State**

```tsx
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { useState } from "react";

export default function Analytics() {
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });
```

**Step 2: Use in Template**

```tsx
return (
  <div className="space-y-6">
    <DateRangePicker
      value={dateRange}
      onChange={setDateRange}
      presets={["7d", "30d", "90d", "custom"]}
    />
    {/* ... */}
  </div>
);
```

**Step 3: Pass to API**

```tsx
useEffect(() => {
  const params = new URLSearchParams({
    ...(dateRange.from && { from: dateRange.from.toISOString() }),
    ...(dateRange.to && { to: dateRange.to.toISOString() }),
  });

  const res = await fetch(`/api/admin/analytics?${params}`);
  // ...
}, [dateRange]);
```

## Styling & Dark Mode

All components use shadcn/ui color tokens:

**Text Colors:**

- `text-foreground` — Primary text
- `text-muted-foreground` — Secondary text
- `text-destructive` — Error states

**Background Colors:**

- `bg-background` — Page background
- `bg-muted` — Hover/secondary backgrounds
- `bg-primary/10` — Active state highlight

**Automatic Dark Mode:**

- Components automatically adjust in dark mode
- No custom dark mode classes needed
- Uses CSS custom properties from theme

## Performance Notes

- **Sidebar collapse:** localStorage write only on change (not every render)
- **Activity feed:** Polling uses AbortController to prevent stale connections
- **Date picker:** Lazy calendar rendering (only shown in popover)
- **Breadcrumbs:** Simple string manipulation, no database calls

## Known Limitations

1. **Activity feed limit:** Max 10 items per poll (by design)
   - To increase, change `POLL_INTERVAL_MS` constant
2. **Date range picker:** Does not support time selection
   - Only date granularity (start of day → end of day)

3. **Breadcrumbs:** Cannot detect user/subscriber names from URL
   - Require explicit `customLabel` prop for dynamic segments

## Future Enhancements

- [ ] Activity feed infinite scroll pagination
- [ ] Activity feed filtering (by admin, action type)
- [ ] Sidebar user menu (profile, settings, logout)
- [ ] Sidebar search (filter nav items)
- [ ] Breadcrumbs auto-generation from route metadata
- [ ] Date range picker with time selection
- [ ] Activity feed real-time updates via WebSocket

## Troubleshooting

### Sidebar not collapsing

- Check localStorage key: `admin-sidebar-collapsed`
- Verify `useEffect` is running (check mounted state)
- Check CSS classes applied (use browser dev tools)

### Activity feed not polling

- Check `/api/admin/audit` endpoint exists
- Verify no network errors in console
- Check `POLL_INTERVAL_MS` (30s default)
- Ensure `inFlightRef` logic is working (no duplicate requests)

### Date picker not working

- Verify `react-day-picker` is installed (`package.json`)
- Check `Calendar` component imported correctly
- Ensure `onChange` callback is defined
- Check if date values are `Date` objects (not strings)

### Breadcrumbs not showing

- Verify `breadcrumbs` prop passed to `AdminPageWrapper`
- Check `BreadcrumbItem[]` format (label + optional href)
- Ensure `AdminBreadcrumbs` imported correctly

## Related Files

- **Admin layout:** `src/app/admin/layout.tsx`
- **Admin page wrapper:** `src/components/admin/admin-page-wrapper.tsx`
- **Audit API:** `src/app/api/admin/audit/route.ts`
- **Sidebar config:** `src/components/admin/sidebar.tsx` (sidebarSections array)
- **Admin middleware:** `src/lib/admin.ts` (requireAdmin, requireAdminApi)
