# AstraPost Admin UX Journey Audit

**Scope:** End-to-end admin workflows including system monitoring, user management, billing oversight, and content moderation.

---

## High Severity Issues

### AD-UX-H-1: Admin Has No At-A-Glance System Health Overview

**Journey:** Admin opens /admin → wants to quickly check system status

**Current State:**

- `/admin` shows KPI stat cards + activity feed (good start)
- But no summary of critical system health
- Admin must navigate to `/admin/health` separately to check if DB/Redis/queue are working
- If there's an outage, admin has no proactive alert

**Expected:** Admin overview shows:

- System status: "All Systems Operational" | "⚠️ Redis Offline" | "🔴 Database Unavailable"
- Incident alerts: "Stripe webhook failures: 5 in last hour"
- Queue health: "BullMQ: 127 jobs pending, 23 active, 0 failed"

**Fix:** Enhance `/admin/page.tsx` summary section:

```typescript
export async function AdminDashboard() {
  const [systemHealth, billingMetrics, queueStatus, incidents] = await Promise.all([
    getSystemHealth(),
    getBillingMetrics(),
    getQueueStatus(),
    getRecentIncidents(),
  ]);

  return (
    <div className="space-y-6">
      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HealthCard
          title="System Status"
          status={systemHealth.overallStatus}
          checks={[
            { name: "PostgreSQL", ok: systemHealth.postgres.ok },
            { name: "Redis", ok: systemHealth.redis.ok },
            { name: "BullMQ", ok: systemHealth.bullmq.ok },
          ]}
        />
        <HealthCard
          title="Queue Status"
          status={queueStatus.pending > 100 ? "warning" : "ok"}
          details={[
            { label: "Pending", value: queueStatus.pending },
            { label: "Active", value: queueStatus.active },
            { label: "Failed", value: queueStatus.failed },
          ]}
        />
        <HealthCard
          title="Recent Issues"
          status={incidents.length > 0 ? "warning" : "ok"}
          details={incidents.slice(0, 3).map(i => ({
            label: i.title,
            value: `${i.count} events`,
          }))}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="MRR" value={`$${(billingMetrics.mrr/100).toFixed(0)}`} />
        <StatCard title="Active Users" value={billingMetrics.activeUsers} />
        <StatCard title="Churn Rate" value={`${(billingMetrics.churn*100).toFixed(1)}%`} />
        <StatCard title="Avg. Subscription" value={`$${(billingMetrics.avgMrr/100).toFixed(0)}`} />
      </div>

      {/* Activity Feed */}
      <AdminActivityFeed />
    </div>
  );
}
```

---

### AD-UX-H-2: Admin Cannot Find a User Without Multiple Clicks

**Journey:** Admin receives complaint from user@example.com → wants to investigate → needs to jump to user's account in 2 clicks

**Current State:**

- Admin must navigate to `/admin/subscribers`
- Wait for table to load (possibly slow if 10K+ rows)
- Search for email
- Click to open user detail

**Expected:** Global search from any admin page jumps to user in 1 action.

**Fix:** (See AD-FM-6 in frontend findings)

---

### AD-UX-H-3: Admin Impersonation Has No Persistent "Viewing As" Indicator

**Journey:** Admin → impersonates user → navigates dashboard → makes changes → forgets they're impersonating

**Current State:**

- Admin can create an impersonation session
- But no persistent banner showing "You are viewing as [User]"
- Admin might make changes thinking they're debugging their own account

**Impact:** Admin accidentally makes changes as the impersonated user.

**Expected:** Persistent banner on every page: "👤 You are viewing as jane@example.com [End Impersonation]"

**Fix:** (See UX-M-4 and AD-FM-2)

---

### AD-UX-H-4: Health Dashboard Doesn't Proactively Alert on Degradation

**Journey:** Admin goes to /admin/health → sees all green → leaves → 30 min later Redis dies → admin doesn't know

**Current State:**

- Health page shows status at time of load
- Requires manual refresh to see changes
- No notifications if status degrades
- Admin discovers issues only when users report them

**Expected:** Auto-refresh every 30s, sound alert or red banner if status changes from OK to degraded.

**Fix:**

```typescript
const [health, setHealth] = useState(null);
const [previousStatus, setPreviousStatus] = useState(null);
const audioRef = useRef<HTMLAudioElement>(null);

useEffect(() => {
  const fetchHealth = async () => {
    const res = await fetch("/api/admin/health");
    const newHealth = await res.json();
    setHealth(newHealth);

    // Alert on status change
    if (previousStatus && previousStatus.status !== newHealth.status) {
      if (newHealth.status !== "ok") {
        audioRef.current?.play(); // Sound alert
      }
      toast.error(`System status changed to ${newHealth.status}`);
    }

    setPreviousStatus(newHealth);
  };

  fetchHealth();
  const interval = setInterval(fetchHealth, 30000);
  return () => clearInterval(interval);
}, [previousStatus]);

return (
  <>
    <audio ref={audioRef} src="/alert.mp3" />
    <HealthDashboard health={health} />
  </>
);
```

---

## Medium Severity Issues

### AD-UX-M-1: Admin Actions (User Suspension, Plan Override) Have No Confirmation Dialog

**Journey:** Admin at `/admin/subscribers` → wants to suspend a user → clicks "Suspend" → immediately suspended with no undo

**Current State:** Destructive actions likely execute immediately with no confirmation.

**Expected:** Confirmation dialog with clear consequence description: "Suspend user jane@example.com? They will lose access to their account and all scheduled posts will be paused."

**Fix:** Wrap all destructive actions in AlertDialog:

```typescript
const [suspendingUserId, setSuspendingUserId] = useState<string | null>(null);

<AlertDialog open={!!suspendingUserId} onOpenChange={(open) => !open && setSuspendingUserId(null)}>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" onClick={() => setSuspendingUserId(user.id)}>
      Suspend
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Suspend User?</AlertDialogTitle>
      <AlertDialogDescription>
        This will immediately revoke access for {user.email}. All scheduled posts will be paused. The user can contact support to appeal.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive"
        onClick={() => suspendUser(suspendingUserId)}
      >
        Suspend
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### AD-UX-M-2: Admin Has No Undo for Destructive Actions (User Delete, Plan Override)

**Journey:** Admin suspends user by mistake → realizes error 10 seconds later → no undo option

**Current State:** Actions are immediate and permanent. Recovery requires:

1. Contact support
2. Manual DB query to restore

**Expected:** Toast with "Undo" button that works for 10-30 seconds.

**Fix:**

```typescript
const handleSuspendUser = async (userId: string) => {
  const previousState = { active: true, suspended: false };

  try {
    await suspendUser(userId);
    toast.success("User suspended", {
      action: {
        label: "Undo",
        onClick: async () => {
          await reactivateUser(userId);
          toast.success("User reactivated");
        },
      },
    });
  } catch (error) {
    toast.error("Failed to suspend user");
  }
};
```

---

### AD-UX-M-3: Audit Log Is Hard to Parse — No Summary or Alerts

**Journey:** Admin reviews `/admin/audit` → sees 1000+ log entries → can't find the action they're looking for

**Current State:**

- Raw list of all admin actions
- No filtering/search
- No summary: "53 users deleted, 17 subscriptions overridden, 200 feature flags toggled"
- Admin can't quickly identify unusual patterns

**Expected:** Audit log with:

- Search by admin, action type, resource, date range
- Summary view: "Most active admins", "Most common actions", "Unusual patterns"
- Alert on unusual activity: "admin2@... deleted 100 users in 5 minutes"

**Fix:** Add audit summary dashboard:

```typescript
export async function AuditPage() {
  const [logs, stats] = await Promise.all([
    getAuditLogs({ limit: 50, offset: 0 }),
    getAuditStats({ timeRange: "24h" }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Actions"
          value={stats.total}
          subtitle={`${stats.actionsPerHour.toFixed(1)}/hour`}
        />
        <StatCard
          title="Most Active Admin"
          value={stats.topAdmin.name}
          subtitle={`${stats.topAdmin.count} actions`}
        />
        <StatCard
          title="Most Common Action"
          value={stats.topAction.name}
          subtitle={`${stats.topAction.count} times`}
        />
        <StatCard
          title="Alerts"
          value={stats.alerts.length}
          subtitle={stats.alerts.length > 0 ? "Review alerts" : "None"}
        />
      </div>

      <AuditLogTable logs={logs} />
    </div>
  );
}
```

---

### AD-UX-M-4: Feature Flag Rollout Changes Aren't Real-Time

**Journey:** Admin changes feature flag rollout from 0% → 100% → expects users to see it immediately → users still don't see it for 5 minutes

**Current State:**

- Feature flags are cached client-side for 5 minutes
- Admin changes percentage on `/admin/feature-flags`
- But users don't see the new state until cache expires

**Expected:** Real-time propagation (WebSocket, SSE, or quick polling).

**Fix:** (See AD-H-4 in backend findings)

---

### AD-UX-M-5: Promo Code Analytics Are Missing

**Journey:** Admin creates promo code → wants to track: How many used? Revenue impact? Geographic distribution?

**Current State:**

- Admin can create codes at `/admin/billing/promo-codes`
- No dashboard showing code performance metrics
- No way to see which codes are most effective

**Expected:** Promo code analytics dashboard showing:

- Usage per code (count, revenue, discount given)
- Conversion rate (signups from code vs. total)
- Geographic/source breakdown

**Fix:** Create `/admin/promo-codes/analytics` page:

```typescript
export async function PromoCodesAnalytics() {
  const codeStats = await getPromoCodeStats();

  return (
    <DataTable
      columns={[
        { header: "Code", accessor: "code" },
        { header: "Uses", accessor: "uses" },
        { header: "Revenue", accessor: "revenue", format: (v) => `$${(v/100).toFixed(2)}` },
        { header: "Discount Avg", accessor: "discountAvg", format: (v) => `${v}%` },
        { header: "Signups", accessor: "signups" },
        { header: "Conv. Rate", accessor: "conversionRate", format: (v) => `${(v*100).toFixed(1)}%` },
      ]}
      data={codeStats}
    />
  );
}
```

---

### AD-UX-M-6: No Bulk Actions for User Management

**Journey:** Admin wants to suspend 50 spammy users at once

**Current State:**

- Must go to `/admin/subscribers`, find each user, click suspend individually
- Takes 50+ clicks for 50 users

**Expected:** Bulk actions:

- Select multiple rows with checkboxes
- "Suspend Selected", "Delete Selected", "Override Plan" actions

**Fix:** Add checkbox selection to admin tables:

```typescript
const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

const handleBulkAction = async (action: "suspend" | "delete" | "setPlan") => {
  const userIds = Array.from(selectedRows);

  if (!window.confirm(`${action} ${userIds.length} users?`)) return;

  await fetch("/api/admin/users/bulk", {
    method: "POST",
    body: JSON.stringify({ action, userIds }),
  });

  toast.success(`${action} applied to ${userIds.length} users`);
  setSelectedRows(new Set());
};

<div className="flex items-center gap-2 mb-4">
  {selectedRows.size > 0 && (
    <>
      <span>{selectedRows.size} selected</span>
      <Button onClick={() => handleBulkAction("suspend")}>Suspend</Button>
      <Button variant="destructive" onClick={() => handleBulkAction("delete")}>
        Delete
      </Button>
    </>
  )}
</div>
```

---

## Low Severity Issues

### AD-UX-L-1: Admin Daily Workflow Requires Jumping Between 5+ Pages

**Journey:** Admin morning routine — check health, review incidents, check MRR, review suspicious users, check feature flag status

**Current State:**

- Start at `/admin` (KPIs + feed)
- Jump to `/admin/health` (system status)
- Jump to `/admin/billing/analytics` (MRR/churn)
- Jump to `/admin/subscribers` (search for issues)
- Jump to `/admin/feature-flags` (check recent changes)

Total: 5 page navigations to complete morning standup.

**Expected:** All-in-one dashboard with shortcuts to common tasks.

**Fix:** Enhance `/admin` overview with:

- Quick health summary (with drill-down links)
- Top 5 KPIs (MRR, churn, signups, issues)
- "Jump to user" search box
- Recent admin actions
- Active incidents list

---

### AD-UX-L-2: Admin Referral/Affiliate Page May Not Show Payout Status

**File:** `/admin/affiliate`, `/admin/referrals`

**Issue:** Admin can't see:

- When affiliates are paid
- How much they earned
- If they're eligible for next payout
- Payout history

**Expected:** Dashboard showing earnings per affiliate + payout schedule.

---

### AD-UX-L-3: Content Moderation Workflow Not Clear

**File:** `/admin/content`

**Issue:** If the platform has user-generated content, admins need to:

- View flagged content
- Mark as approved/rejected
- Remove content and notify user
- Ban user if repeat offender

Workflow should be clear and quick (sub-5-second per item).

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| High      | 4      |
| Medium    | 6      |
| Low       | 3      |
| **Total** | **13** |

---

## Admin Workflow Improvements Priority

**Immediate (Week 1):**

1. Add confirmation dialogs to destructive actions
2. Add "Viewing as" banner to impersonation sessions
3. Enhance `/admin` overview with health + KPI summary

**Short-term (Week 2-3):**

1. Implement global admin search / "Find User"
2. Add undo toast for 10-30 seconds after destructive actions
3. Add audit log summary dashboard with alerts

**Medium-term (Week 4+):**

1. Implement bulk actions for user management
2. Add real-time health monitoring (auto-refresh, sound alerts)
3. Create promo code analytics dashboard
4. Real-time feature flag propagation
