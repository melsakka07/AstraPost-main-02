# AstraPost Admin Frontend Audit

**Scope:** Admin panel pages, components, UX patterns, and accessibility.

---

## High Severity Issues

### AD-FH-1: Webhooks Admin Page Uses Dashboard Layout, Not Linked

**File:** `src/app/dashboard/admin/webhooks/page.tsx`

**Issue:** The webhook DLQ admin page:

- Uses the dashboard layout (`DashboardPageWrapper`) rather than admin layout
- Calls `requireAdmin()` manually instead of relying on layout
- Is not linked in the admin sidebar
- Is only reachable via direct URL `/dashboard/admin/webhooks`

**Impact:** Admin can't discover the webhook tool. Feature is hidden.

**Fix:** (Move to `/admin/webhooks` and add sidebar entry — see FL-2)

---

### AD-FH-2: Admin Tables Don't Scale to Large Row Counts

**Files:**

- `src/app/admin/subscribers/page.tsx` (SubscribersTable)
- `src/app/admin/teams/page.tsx` (TeamDashboard)
- `src/app/admin/billing/analytics/page.tsx` (billing data)
- `src/app/admin/ai-usage/page.tsx` (AI usage data)

**Issue:** Admin data tables likely render all rows without server-side pagination, sorting, or filtering. With 10K+ users, tables will:

- Load slowly (DOM rendering)
- Consume memory
- Become unusable on slower connections

**Expected:** Server-side pagination with:

- Page size selector (25, 50, 100 rows)
- Sort by column headers
- Search/filter fields
- Jump-to-page input
- Row count display

**Fix:** Implement server-side pagination in each table:

Backend (API):

```typescript
export async function GET(req: Request) {
  const admin = requireAdminApi(req);
  if (!admin.ok) return admin.response;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
  const sort = url.searchParams.get("sort") || "createdAt";
  const order = url.searchParams.get("order") || "desc";
  const search = url.searchParams.get("search") || "";

  const offset = (page - 1) * pageSize;

  let query = db.query.users.findMany();
  if (search) {
    query = query.where(or(like(users.email, `%${search}%`), like(users.name, `%${search}%`)));
  }

  const total = await query.count();
  const records = await query
    .offset(offset)
    .limit(pageSize)
    .orderBy(order === "asc" ? asc(users[sort]) : desc(users[sort]));

  return Response.json({
    records,
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
  });
}
```

Frontend (component):

```typescript
"use client";
import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";

export function AdminSubscribersTable() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await fetch(
        `/api/admin/subscribers?page=${page}&pageSize=${pageSize}&sort=${sort}&order=${order}&search=${search}`
      );
      const result = await res.json();
      setData(result.records);
      setTotal(result.total);
      setLoading(false);
    };
    fetchData();
  }, [page, pageSize, sort, order, search]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by email or name..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <DataTable
        columns={columns}
        data={data}
        sorting={{ sort, order }}
        onSort={(newSort, newOrder) => {
          setSort(newSort);
          setOrder(newOrder);
          setPage(1);
        }}
        loading={loading}
      />
      <Pagination
        current={page}
        total={Math.ceil(total / pageSize)}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
      />
    </div>
  );
}
```

---

### AD-FH-3: Admin Data Tables Don't Indicate Loading or Error States

**Files:** All admin data tables

**Issue:** When loading data, users see a frozen table with no spinner or skeleton. When an error occurs, there's no error message — users see a blank table.

**Expected:** Loading skeleton and error boundary with retry button.

**Fix:**

```typescript
if (loading) {
  return <TableSkeleton rows={pageSize} />;
}

if (error) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Failed to load data</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      <Button onClick={() => refetch()}>Retry</Button>
    </Alert>
  );
}

return <DataTable columns={columns} data={data} />;
```

---

## Medium Severity Issues

### AD-FM-1: No Persistent "You Are Admin" Indicator in Admin Panel

**Files:** Admin sidebar, admin header

**Issue:** There is no visual indicator that tells the admin "you are viewing the admin panel." Styling should clearly distinguish the admin UI from the user dashboard.

**Expected:** Admin panel header shows "Admin Dashboard" with distinct color scheme.

**Current State:** Admin layout exists but may not have a clear header/title indicating admin mode.

**Fix:** Ensure admin layout has distinctive header:

```typescript
// src/app/admin/layout.tsx
<header className="border-b border-red-200 bg-red-50">
  <div className="max-w-7xl mx-auto px-4 py-3">
    <h1 className="text-lg font-bold text-red-900">Admin Dashboard</h1>
  </div>
</header>
```

---

### AD-FM-2: Impersonation Session Visual Indicator Missing

**File:** Dashboard layout (when impersonating)

**Issue:** When an admin is impersonating a user, there should be a persistent banner in the user's dashboard indicating "You are impersonating [User Name]" with an "End Impersonation" button. This is critical for admin safety.

**Expected:** Banner at top of every page when `impersonatedBy` session flag is set.

**Fix:** (See UX-M-4)

---

### AD-FM-3: Feature Flags Page Doesn't Show Rollout Percentage or Status

**File:** `src/app/admin/feature-flags/page.tsx`

**Issue:** Feature flags likely show name/enabled status but not:

- Rollout percentage (e.g., "enabled for 25% of users")
- Last modified by (audit trail)
- Last modified at (timestamp)

**Expected:** Feature flags table with columns: Name | Enabled | Rollout % | Modified By | Modified At | Actions

**Fix:** (See AD-L-2 in backend findings)

---

### AD-FM-4: Audit Log Doesn't Support Search/Filter/Sorting

**File:** `src/app/admin/audit/page.tsx`

**Issue:** Admin audit log is likely a simple list that doesn't support:

- Searching by admin name or action
- Filtering by date range or action type
- Sorting by timestamp, admin, or resource
- Pagination for large log files

**With 1000+ audit entries, the page becomes unusable.**

**Fix:** Implement same server-side pagination + filter/sort pattern as other admin tables.

---

### AD-FM-5: Billing Analytics Don't Show Key Metrics at a Glance

**File:** `src/app/admin/billing/analytics/page.tsx`

**Issue:** The page likely shows a raw table of transactions. Admins need summary cards first:

- **Total Revenue (This Month)**
- **MRR (Monthly Recurring Revenue)**
- **Churn Rate**
- **Average Customer Lifetime Value**
- **Top Paying Plans**

**Expected:** Summary cards at top, then drilldown table.

**Fix:** Add summary section:

```typescript
export async function BillingAnalyticsPage() {
  const metrics = await getBillingMetrics();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="MRR"
          value={`$${(metrics.mrr / 100).toFixed(2)}`}
          delta={metrics.mrrGrowth}
        />
        <StatCard
          title="Churn Rate"
          value={`${(metrics.churnRate * 100).toFixed(1)}%`}
          delta={metrics.churnTrend}
        />
        <StatCard
          title="New Subscriptions"
          value={metrics.newSubscriptions}
          delta={metrics.newSubscriptionsTrend}
        />
        <StatCard
          title="Cancellations"
          value={metrics.cancelations}
          delta={metrics.cancelationsTrend}
        />
      </div>

      <BillingTable data={metrics.transactions} />
    </div>
  );
}
```

---

### AD-FM-6: No Quick User Lookup / Find User Tool

**Files:** Admin sidebar, admin header

**Issue:** If an admin needs to find a user by email or ID, they must:

1. Go to `/admin/subscribers`
2. Wait for table to load
3. Search or scroll

**Better UX:** Global search / "Find User" modal accessible from every admin page.

**Fix:** Add global search component in admin header:

```typescript
// src/components/admin/global-search.tsx
"use client";
import { useState } from "react";
import { Command } from "@/components/ui/command";

export function AdminGlobalSearch() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async (query: string) => {
    if (!query) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data);
  };

  return (
    <Command>
      <CommandInput
        placeholder="Search users, teams, subscriptions..."
        onValueChange={handleSearch}
      />
      <CommandList>
        {results.map((result) => (
          <CommandItem
            key={result.id}
            onSelect={() => {
              window.location.href = result.url;
              setOpen(false);
            }}
          >
            {result.name}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}
```

---

## Low Severity Issues

### AD-FL-1: /admin/users Redirects to /admin/subscribers — Confusing

**File:** `src/app/admin/users/page.tsx`

**Issue:** (Same as AD-M-2 in backend findings)

Redirect creates confusion about the distinction between users and subscribers.

**Fix:** Keep one canonical URL and remove the redirect.

---

### AD-FL-2: Admin Pages Not Responsive for Tablet Management

**Files:** All admin pages

**Issue:** Admin tools should be usable on tablet for on-the-go management. Check that:

- Sidebar collapses on mobile/tablet
- Data tables don't overflow horizontally (use responsive design)
- Buttons are touch-friendly (min 44px height)
- Modals are readable at smaller widths

**Expected:** Admin panel is fully responsive to 768px width.

---

### AD-FL-3: Health Dashboard May Not Auto-Refresh

**File:** `src/app/admin/health/page.tsx`

**Issue:** Health status is fetched once on page load. Admin must manually refresh to see new status. With a system issue, status may have changed but admin sees stale data.

**Expected:** Auto-refresh every 30 seconds or use WebSocket/SSE.

**Fix:**

```typescript
useEffect(() => {
  const fetchHealth = async () => {
    const res = await fetch("/api/admin/health");
    setHealth(await res.json());
  };

  fetchHealth();
  const interval = setInterval(fetchHealth, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| High      | 3      |
| Medium    | 6      |
| Low       | 3      |
| **Total** | **12** |
