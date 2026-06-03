# Service Monitoring & Operations Center — Full Audit and Implementation Plan

**Date**: 2026-06-03
**Scope**: Full-stack paid services audit, real-time monitoring framework, unified dashboard, automated alerting, cost governance, and variance analysis
**Status**: Audit Complete + Implementation Plan Ready

---

## 0. Executive Summary

AstraPost integrates **15+ paid/third-party services** in production. Currently, only 5 services have connectivity checks (`/admin/health`), only AI text/image costs are tracked, and only a single email alert fires when the daily AI budget is exceeded. **No external account balance is tracked anywhere**, meaning services can deplete silently.

This document delivers:

1. **Full audit** of all active paid services with billing models and balance requirements
2. **3 new DB tables** for service health snapshots, alerts, and cost variance
3. **Hourly cron** that collects balances from OpenRouter, Replicate, Deepgram, Vercel, Railway
4. **Multi-channel alerting** (in-app + email + optional SMS) with deduplication
5. **Unified `/admin/operations` dashboard** — single pane of glass
6. **Cost variance anomaly detection** — flags spending spikes automatically
7. **Budget guardrails** — monthly caps, hard spending stop, configurable thresholds
8. **Testing plan** and success metrics

---

## 1. Full Service Audit

### 1.1 Active Paid Services

| # | Service | Purpose | Billing Model | Balance Type | Depletion Risk |
|---|---------|---------|---------------|--------------|----------------|
| 1 | **OpenRouter** | AI text generation (7+ models) | Pay-per-token | Pre-paid credits | **Critical** |
| 2 | **Replicate** | AI image generation (4 model tiers) | Per-second GPU compute | Pre-paid credits | **Critical** |
| 3 | **OpenAI** | Content moderation + Whisper transcription | Pay-per-token/request | Pre-paid credits | **Medium** |
| 4 | **Vercel** | Next.js hosting, serverless, Blob storage | Usage-based plan | Auto-charge | **Medium** |
| 5 | **Railway** | BullMQ worker, Redis | Usage-based | Auto-charge | **Low** |
| 6 | **PostgreSQL** | Primary DB (pgvector) | Managed plan | Auto-charge | **Low** |
| 7 | **Stripe** | Subscription billing | 2.9% + $0.30/txn | Deducted from payouts | **N/A** |
| 8 | **X Developer Platform** | OAuth, publishing, analytics, import | Free/Basic tier | Platform limits | **Medium** |
| 9 | **Resend** | Transactional emails | Free: 100/day; Pro: $20/mo | Auto-charge | **Low** |
| 10 | **Sentry** | Error tracking | Free: 5K errors/mo | Auto-charge | **Low** |
| 11 | **Deepgram** | YouTube transcription | $0.0059/min, $200 free credit | Pre-paid credits | **Medium** |
| 12 | **Webshare** | Rotating proxies for YouTube | Subscription from $3/mo | Auto-recharge | **Low** |
| 13 | **Facebook/Instagram** | Instagram Business posting | Free (platform API) | N/A | **N/A** |
| 14 | **LinkedIn** | LinkedIn posting (Agency) | Free (platform API) | N/A | **N/A** |

### 1.2 Service Balance Requirements

| Service | Balance Type | Recharge Mechanism | Min Recommended Balance | Depletion Risk |
|---------|-------------|--------------------|------------------------|----------------|
| OpenRouter | Credits ($USD) | Manual/auto-recharge | $50 | **High** — primary AI provider |
| Replicate | Credits ($USD) | Manual/auto-recharge | $30 | **High** — image generation |
| OpenAI | Credits ($USD) | Manual/auto-recharge | $20 | **Medium** — moderation + Whisper |
| Vercel | Billing cycle | Auto-charge | Plan limit | **Medium** — function invocations |
| Railway | Usage billing | Auto-charge | Plan limit | **Low** — auto-charge |
| Deepgram | Credits ($USD) | Manual | $10 | **Medium** — YouTube transcription |
| Webshare | Subscription | Auto-recharge | Active plan | **Low** — subscription |
| Resend | Plan limit | Auto-charge | Plan limit | **Low** — transactional only |
| Sentry | Plan limit | Auto-charge | Plan limit | **Low** — error tracking |
| Stripe | N/A | Deducted from payouts | N/A | **N/A** |

### 1.3 OpenRouter Model Pricing (from `src/lib/services/ai-quota.ts` `MODEL_PRICING`)

| Model | Input (cents/1K tokens) | Output (cents/1K tokens) |
|-------|------------------------|--------------------------|
| claude-sonnet-4 | 0.30 | 0.60 |
| claude-opus-4 | 1.50 | 3.00 |
| gemini-2.5-pro | 0.125 | 0.50 |
| gemini-2.5-flash | 0.015 | 0.06 |
| gpt-4o | 0.25 | 1.00 |
| o4-mini | 0.015 | 0.06 |
| llama-4-maverick | 0.02 | 0.03 |

### 1.4 Image Model Cost Weights (from `src/lib/plan-limits.ts` `IMAGE_MODEL_COST`)

| Model | Cost Weight |
|-------|------------|
| nano-banana | 1 |
| nano-banana-2 | 1 |
| nano-banana-pro | 3 |
| gpt-image-2 | 5 |

### 1.5 Current Monitoring Coverage Matrix

| Service | Connectivity Check | Balance Tracking | Usage Tracking | Cost Tracking | Alerting |
|---------|-------------------|------------------|----------------|---------------|----------|
| PostgreSQL | OK `/admin/health` | N/A | N/A | N/A | None |
| Redis | OK `/admin/health` | N/A | N/A | N/A | None |
| BullMQ | OK `/admin/health` | N/A | N/A | N/A | None |
| OpenRouter | OK `/admin/health` | **GAP** | OK `ai_generations` | OK cron alarm | Email only |
| Replicate | **GAP** | **GAP** | OK `user_image_counters` | OK `ai-cost` | None |
| OpenAI | **GAP** | **GAP** | OK `ai_generations` | OK `ai-cost` | None |
| Stripe | OK `/admin/health` | N/A | OK Billing analytics | OK `/admin/billing` | None |
| X API | **GAP** | N/A | **GAP** | N/A | Circuit breaker only |
| Resend | **GAP** | N/A | **GAP** | N/A | None |
| Sentry | **GAP** | N/A | **GAP** | N/A | None |
| Deepgram | **GAP** | **GAP** | **GAP** | N/A | None |
| Vercel | **GAP** | **GAP** | **GAP** | N/A | None |
| Railway | **GAP** | **GAP** | **GAP** | N/A | None |

### 1.6 Critical Gaps Identified

| Gap | Risk Level | Impact |
|-----|-----------|--------|
| No external account balance tracking | **Critical** | Services can deplete silently, causing sudden outages |
| No balance depletion forecasting | **Critical** | No advance warning before funds run out |
| No unified cost dashboard | **High** | Fragmented visibility; ops must check 6+ pages |
| No multi-channel alerting (only email) | **High** | Alerts may be missed; no SMS or in-app notifications |
| No cost variance/anomaly detection | **High** | Spending spikes go undetected until daily alarm fires |
| No per-service budget guardrails | **Medium** | Only aggregate daily AI budget; no monthly/per-service caps |
| No cost allocation per subscriber | **Medium** | Cannot calculate per-subscriber unit economics |
| No bandwidth/compute resource tracking | **Medium** | Vercel function invocations, Railway compute hours unmonitored |
| No recurring balance review schedule | **Medium** | Manual process, prone to oversight |

### 1.7 Existing Monitoring Infrastructure

| Capability | Location | Coverage |
|-----------|----------|----------|
| System Health Dashboard | `/admin/health` | PostgreSQL, Redis, BullMQ, Stripe API, OpenRouter API connectivity + OAuth token expiry + job success/failure 24h |
| AI Daily Budget Alarm | Cron `/api/cron/ai-cost-alarm` | Daily AI spend vs `AI_DAILY_BUDGET_USD`, email alert via Resend when exceeded |
| AI Cost Analytics | `/admin/ai-cost` | 7-day cost trend, top spenders, feature breakdown, model mix, latency, fallback rate, feedback |
| AI Metrics | `/admin/ai-metrics` | Detailed AI generation metrics |
| Billing Overview | `/admin/billing` | MRR, subscription counts, plan breakdown |
| Billing Analytics | `/admin/billing/analytics` | Revenue trends, transaction history |
| Admin Dashboard KPIs | `/admin` | MRR, users, AI gen count, posts, trials, failed jobs |

---

## 2. Monitoring Framework Architecture

### 2.1 Architecture Diagram

```
+---------------------------------------------------------------------+
|                    UNIFIED OPS DASHBOARD                            |
|                  /admin/operations                                   |
|  +----------+----------+----------+----------+----------+           |
|  | Service  | Balance  | Usage    | Cost     | Alerts   |           |
|  | Status   | Tracker  | Metrics  | Analysis | Center   |           |
|  +----------+----------+----------+----------+----------+           |
|       |         |         |         |         |                     |
+-------+---------+---------+---------+---------+---------------------+
        |         |         |         |         |
        v         v         v         v         v
  +-------------------------------------------------------+
  |           Service Balance Collector (Cron)             |
  |  - OpenRouter /api/v1/auth/key (balance)              |
  |  - Replicate balance endpoint                         |
  |  - Deepgram usage endpoint                            |
  |  - Vercel /v2/usage                                   |
  |  - Railway GraphQL usage API                          |
  |  - Resend /emails?limit=1 stats                       |
  |  - Sentry /api/0/organizations/{org}/                 |
  +-------------------------------------------------------+
        |
        v
  +-------------------------------------------------------+
  |           Database: service_health_snapshots           |
  |  - service_name, status, balance_cents,               |
  |    usage_metrics (JSONB), recorded_at                 |
  +-------------------------------------------------------+
        |
        v
  +-------------------------------------------------------+
  |           Alert Engine                                 |
  |  - Threshold evaluator (per-service)                   |
  |  - Channels: In-app, Email, SMS (Twilio)              |
  |  - Deduplication (Redis TTL)                           |
  +-------------------------------------------------------+
```

### 2.2 Service API Mapping for Balance Collection

| Service | Balance/Usage API | Authentication | Check Frequency |
|---------|-------------------|----------------|-----------------|
| OpenRouter | `GET https://openrouter.ai/api/v1/auth/key` | Bearer token | Every 1 hour |
| Replicate | `GET https://api.replicate.com/v1/billing` | Bearer token | Every 1 hour |
| Deepgram | `GET https://api.deepgram.com/v1/projects/{pid}/balances` | Token auth | Every 6 hours |
| Vercel | `GET https://api.vercel.com/v2/usage` | Bearer token | Every 6 hours |
| Railway | GraphQL: `usageMetrics` query | Bearer token | Every 6 hours |
| Resend | Email count from API | Bearer token | Every 6 hours |
| Sentry | `GET /api/0/organizations/{org}/` | Bearer token | Every 6 hours |

### 2.3 Depletion Projection Formula

```
burn_rate_7d = (balance_7d_ago - current_balance) / 7   // daily burn in $
days_remaining = current_balance / burn_rate_7d          // days until $0
projected_depletion_date = now + days_remaining
```

Confidence levels:
- **high**: 7+ data points over 7 days
- **medium**: 3-6 data points
- **low**: 1-2 data points or high variance (stddev > 30% of mean)

---

## 3. Schema Changes

### 3.1 New Table: `service_health_snapshots`

Stores periodic balance/usage snapshots collected by the health check cron.

```sql
CREATE TABLE service_health_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  balance_cents INTEGER,
  balance_currency TEXT DEFAULT 'usd',
  usage_metrics JSONB DEFAULT '{}',
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_shs_service_recorded
  ON service_health_snapshots(service_name, recorded_at DESC);
```

**Drizzle schema** (`src/lib/schema.ts`):

```typescript
export const serviceHealthSnapshots = pgTable("service_health_snapshots", {
  id: text("id").primaryKey(),
  serviceName: text("service_name").notNull(),
  status: text("status").notNull().default("unknown"),
  balanceCents: integer("balance_cents"),
  balanceCurrency: text("balance_currency").default("usd"),
  usageMetrics: jsonb("usage_metrics").default({}),
  rateLimitRemaining: integer("rate_limit_remaining"),
  rateLimitResetAt: timestamp("rate_limit_reset_at"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}),
}, (table) => [
  index("idx_shs_service_recorded").on(table.serviceName, table.recordedAt),
]);
```

### 3.2 New Table: `service_alerts`

Tracks alert events with severity, channel delivery, and acknowledgment.

```sql
CREATE TABLE service_alerts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  channels_sent TEXT[] DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_sa_service_created
  ON service_alerts(service_name, created_at DESC);
CREATE INDEX idx_sa_unresolved
  ON service_alerts(service_name) WHERE NOT acknowledged;
```

**Drizzle schema**:

```typescript
export const serviceAlerts = pgTable("service_alerts", {
  id: text("id").primaryKey(),
  serviceName: text("service_name").notNull(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull().default("warning"),
  message: text("message").notNull(),
  channelsSent: text("channels_sent").default([]),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata").default({}),
}, (table) => [
  index("idx_sa_service_created").on(table.serviceName, table.createdAt),
]);
```

### 3.3 New Table: `cost_variance_events`

Stores detected cost anomalies for investigation.

```sql
CREATE TABLE cost_variance_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  service_name TEXT NOT NULL,
  period_date DATE NOT NULL,
  expected_cost_cents INTEGER NOT NULL,
  actual_cost_cents INTEGER NOT NULL,
  variance_pct REAL NOT NULL,
  anomaly_score REAL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  investigated BOOLEAN DEFAULT false,
  notes TEXT
);

CREATE INDEX idx_cve_date ON cost_variance_events(period_date DESC);
```

**Drizzle schema**:

```typescript
export const costVarianceEvents = pgTable("cost_variance_events", {
  id: text("id").primaryKey(),
  serviceName: text("service_name").notNull(),
  periodDate: timestamp("period_date").notNull(),
  expectedCostCents: integer("expected_cost_cents").notNull(),
  actualCostCents: integer("actual_cost_cents").notNull(),
  variancePct: real("variance_pct").notNull(),
  anomalyScore: real("anomaly_score"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  investigated: boolean("investigated").default(false).notNull(),
  notes: text("notes"),
}, (table) => [
  index("idx_cve_date").on(table.periodDate),
]);
```

### 3.4 Inferred Types (add to `src/lib/schema.ts`)

```typescript
export type ServiceHealthSnapshot = typeof serviceHealthSnapshots.$inferSelect;
export type InsertServiceHealthSnapshot = typeof serviceHealthSnapshots.$inferInsert;
export type ServiceAlert = typeof serviceAlerts.$inferSelect;
export type InsertServiceAlert = typeof serviceAlerts.$inferInsert;
export type CostVarianceEvent = typeof costVarianceEvents.$inferSelect;
export type InsertCostVarianceEvent = typeof costVarianceEvents.$inferInsert;
```

### 3.5 Migration

File: `drizzle/XXXX_service_operations_tables.sql`

All three tables are additive CREATE TABLE only. No existing schema changes.

---

## 4. Backend Services

### 4.1 Service Health Collector

**File**: `src/lib/services/service-health-collector.ts`
**Must start with**: `import "server-only";`

**Interface**:

```typescript
interface ServiceCheckResult {
  serviceName: string;
  status: "healthy" | "degraded" | "critical" | "unknown";
  balanceCents: number | null;
  usageMetrics: Record<string, unknown>;
  rateLimitRemaining: number | null;
  rateLimitResetAt: Date | null;
  metadata: Record<string, unknown>;
}

type ServiceCollector = () => Promise<ServiceCheckResult>;
```

**Individual collectors**:

| Collector | API Endpoint | Auth | Metrics Extracted |
|-----------|-------------|------|-------------------|
| `checkOpenRouter()` | `GET https://openrouter.ai/api/v1/auth/key` | `Bearer ${OPENROUTER_API_KEY}` | `limit_remaining`, `usage` |
| `checkReplicate()` | `GET https://api.replicate.com/v1/billing` | `Bearer ${REPLICATE_API_TOKEN}` | `balance` |
| `checkDeepgram()` | `GET https://api.deepgram.com/v1/projects/{pid}/balances` | `Token ${YOUTUBE_DEEPGRAM_API_KEY}` | `amount` per balance |
| `checkVercel()` | `GET https://api.vercel.com/v2/usage` | `Bearer ${VERCEL_ACCESS_TOKEN}` | Function invocations, bandwidth |
| `checkRailway()` | GraphQL POST `https://backboard.railway.app/graphql/v2` | `Bearer ${RAILWAY_API_TOKEN}` | Compute hours, memory |
| `checkSentry()` | `GET /api/0/organizations/{org}/` | `Bearer ${SENTRY_AUTH_TOKEN}` | Error count vs quota |
| `checkResend()` | Count from `GET /emails?limit=1` | `Bearer ${RESEND_API_KEY}` | Daily sends vs limit |

Each collector:
- Uses `AbortSignal.timeout(10000)` (10s)
- Returns `{ status: "unknown", balanceCents: null }` on any error (never throws)
- Logs errors via `logger.error("service_health_check_failed", { service, error })`

**Main function**:

```typescript
export async function collectAllServiceHealth(): Promise<ServiceCheckResult[]> {
  const collectors: ServiceCollector[] = [
    checkOpenRouter,
    checkReplicate,
    checkDeepgram,
    checkVercel,
    checkRailway,
    checkSentry,
    checkResend,
  ].filter(Boolean); // skip any that are null (missing env vars)

  const results = await Promise.allSettled(collectors.map(c => c()));
  return results.map(r => {
    if (r.status === "fulfilled") return r.value;
    return {
      serviceName: "unknown",
      status: "unknown" as const,
      balanceCents: null,
      usageMetrics: {},
      rateLimitRemaining: null,
      rateLimitResetAt: null,
      metadata: { error: "Promise rejected" },
    };
  });
}
```

### 4.2 Cost Variance Detector

**File**: `src/lib/services/cost-variance-detector.ts`
**Must start with**: `import "server-only";`

**Algorithm**:

```
For each tracked service with historical data:
  1. Get today's cost from ai_generations (grouped by model family → provider)
  2. Get 7-day average daily cost from ai_generations
  3. Calculate standard deviation of daily costs over 7 days
  4. If today's cost > average + 2 * stddev -> Flag as anomaly
  5. Calculate anomaly_score = (today - average) / stddev
  6. If anomaly_score > 3 -> CRITICAL alert
     If anomaly_score > 2 -> WARNING alert
```

**Interface**:

```typescript
export interface VarianceResult {
  serviceName: string;
  periodDate: string;
  expectedCostCents: number;
  actualCostCents: number;
  variancePct: number;
  anomalyScore: number;
}

export async function detectCostVariance(): Promise<VarianceResult[]>
```

**Data source**: Query `ai_generations` table for today's cost vs 7-day average, grouped by provider (OpenRouter = text models, Replicate = image models).

### 4.3 Service Alert Engine

**File**: `src/lib/services/service-alert-engine.ts`
**Must start with**: `import "server-only";`

**Threshold Configuration** (env-based):

```typescript
const THRESHOLDS: Record<string, { warningCents: number; criticalCents: number }> = {
  openrouter: {
    warningCents: parseInt(process.env.OPENROUTER_BALANCE_WARNING_CENTS || "2000"),
    criticalCents: parseInt(process.env.OPENROUTER_BALANCE_CRITICAL_CENTS || "500"),
  },
  replicate: {
    warningCents: parseInt(process.env.REPLICATE_BALANCE_WARNING_CENTS || "1500"),
    criticalCents: parseInt(process.env.REPLICATE_BALANCE_CRITICAL_CENTS || "300"),
  },
  deepgram: {
    warningCents: parseInt(process.env.DEEPGRAM_BALANCE_WARNING_CENTS || "500"),
    criticalCents: parseInt(process.env.DEEPGRAM_BALANCE_CRITICAL_CENTS || "100"),
  },
};
```

**Alert Thresholds per Service**:

| Service | Warning Threshold | Critical Threshold | Check Frequency |
|---------|-------------------|--------------------|-----------------|
| OpenRouter | Balance < $20 | Balance < $5 | 1 hour |
| Replicate | Balance < $15 | Balance < $3 | 1 hour |
| OpenAI | Balance < $10 | Balance < $2 | 6 hours |
| Deepgram | Balance < $5 | Balance < $1 | 6 hours |
| Vercel | Usage > 80% plan limit | Usage > 95% plan limit | 6 hours |
| Railway | Usage > 80% plan limit | Usage > 95% plan limit | 6 hours |
| Resend | Daily sends > 80% limit | Daily sends > 95% limit | 6 hours |
| Sentry | Errors > 80% plan quota | Errors > 95% plan quota | 6 hours |

**Alert Flow**:

```
1. Check if balance below threshold
2. Check Redis dedup key: alert:dedup:{serviceName}:{alertType} with TTL from ALERT_DEDUP_TTL_SECS
3. If no dedup key -> create alert:
   a. INSERT into service_alerts
   b. Send email via sendEmail() to RESEND_OPS_EMAIL
   c. Send SMS via Twilio if configured and severity === "critical"
   d. Set Redis dedup key
4. Calculate projected depletion:
   burn_rate = (prev.balance - current.balance) / hours_since_prev
   days_remaining = current.balance / (burn_rate * 24)
```

### 4.4 Service Health Queries

**File**: `src/lib/services/service-health-queries.ts`
**Must start with**: `import "server-only";`

**Dashboard data aggregation**:

```typescript
export interface OperationsDashboardData {
  services: ServiceHealthSummary[];
  alerts: ServiceAlert[];
  costVariance: CostVarianceEvent[];
  aiDailySpend: { today: number; budget: number; exceeded: boolean };
  burnRates: Record<string, { daily: number; daysRemaining: number }>;
}

export interface ServiceHealthSummary {
  serviceName: string;
  currentStatus: string;
  currentBalance: number | null;
  projectedDepletion: string | null;
  lastChecked: string;
  trend7d: Array<{ date: string; balance: number }>;
}

export async function getOperationsDashboardData(): Promise<OperationsDashboardData>
```

### 4.5 Cron Job: Service Health Check

**File**: `src/app/api/cron/service-health-check/route.ts`

```
GET /api/cron/service-health-check
Authorization: Bearer {CRON_SECRET}
```

**Logic**:

```
1. Authenticate with CRON_SECRET (same pattern as existing crons)
2. Call collectAllServiceHealth()
3. For each result:
   a. Get previous snapshot from DB (latest for this service)
   b. INSERT new snapshot
   c. Evaluate alert thresholds via service-alert-engine
   d. Trigger alert if needed (with dedup)
4. Run detectCostVariance()
5. Store variance events
6. Cleanup old snapshots (> 90 days)
7. Return summary JSON
```

**Vercel cron config** (add to `vercel.json` crons array):

```json
{
  "path": "/api/cron/service-health-check",
  "schedule": "0 * * * *"
}
```

### 4.6 Admin API Endpoints

#### `GET /api/admin/operations`

**File**: `src/app/api/admin/operations/route.ts`

Returns `OperationsDashboardData` for the dashboard client component.

```
Auth: requireAdminApi()
Rate limit: checkAdminRateLimit("read")
Response: { data: OperationsDashboardData }
```

#### `POST /api/admin/operations/alerts/[id]/acknowledge`

**File**: `src/app/api/admin/operations/alerts/[id]/acknowledge/route.ts`

```
Auth: requireAdminApi()
Body: { notes?: string }
Action: UPDATE service_alerts SET acknowledged = true, resolved_at = now()
```

---

## 5. Frontend Components

### 5.1 Page Structure

```
src/app/admin/operations/
  page.tsx              # RSC: requireAdmin() -> render OperationsDashboard
  loading.tsx           # Skeleton grid matching dashboard layout
```

**page.tsx pattern** (follows existing admin RSC pattern from other admin pages):

```typescript
import { requireAdmin } from "@/lib/admin";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";
import { OperationsDashboard } from "@/components/admin/operations/operations-dashboard";

export default async function OperationsPage() {
  await requireAdmin();
  return (
    <AdminPageWrapper
      title="Operations Center"
      description="Service health, balances, usage, and alerts"
    >
      <OperationsDashboard />
    </AdminPageWrapper>
  );
}
```

### 5.2 Client Components

```
src/components/admin/operations/
  operations-dashboard.tsx       # Orchestrator: useAdminPolling + layout grid
  service-status-grid.tsx        # Service cards (balance, status, depletion)
  balance-trend-chart.tsx        # 30-day balance projection (Recharts LineChart)
  cost-breakdown-panel.tsx       # Per-service cost analysis with comparison
  usage-metrics-panel.tsx        # API call volumes, token consumption
  anomaly-feed.tsx               # Cost variance events list
  alert-history-panel.tsx        # Alert table with severity badges + acknowledge
```

### 5.3 Component Specifications

#### `operations-dashboard.tsx`

- Uses `useAdminPolling<OperationsDashboardData>` with `intervalMs: 60_000`
- Fetches from `/api/admin/operations`
- Responsive grid layout: `grid gap-4 md:grid-cols-2 lg:grid-cols-3`
- Renders all sub-components in order
- Loading/error states matching existing admin component patterns

#### `service-status-grid.tsx`

**Props**: `{ services: ServiceHealthSummary[] }`

Each service rendered as a Card with:
- Service name + status badge (green/yellow/red using `StatusIndicator`)
- Current balance (formatted as $USD)
- Projected depletion ("X days remaining" or "N/A")
- Last checked timestamp (relative: "2m ago")
- Mini sparkline of 7-day balance trend
- Click to expand for full trend chart

**Mobile**: 1 column. **Tablet**: 2 columns. **Desktop**: 3 columns.

#### `balance-trend-chart.tsx`

**Props**: `{ data: Array<{ date: string; balance: number; projected?: number }> }`

- Recharts `LineChart` with two series: actual balance + projected depletion
- X-axis: date (30-day range)
- Y-axis: balance in $USD
- Responsive container
- Accessible: aria-label with data summary
- Uses `src/lib/tokens.ts` hex constants for chart colors (brand scale)

#### `cost-breakdown-panel.tsx`

Enhanced version of existing `ai-cost-charts.tsx` patterns:
- Today's total spend vs daily budget (progress bar)
- 7-day rolling average spend
- Per-provider breakdown (OpenRouter, Replicate, OpenAI, Deepgram)
- Month-over-month comparison

#### `alert-history-panel.tsx`

Table of recent alerts with columns:
- Severity badge (info/warning/critical) with color coding
- Service name
- Alert type
- Message
- Channels sent (icon badges for email/in-app/SMS)
- Time ago
- Acknowledge button (if unacknowledged)

---

## 6. Admin Sidebar Integration

**File to modify**: `src/components/admin/sidebar.tsx`

Add to the **System** section as the first item:

```typescript
{
  label: t("nav.system"),
  items: [
    { href: "/admin/operations", label: t("nav.operations_center"), icon: Gauge },
    // ... existing items (audit, feature-flags, jobs, notifications, webhooks, soft-delete, ai-metrics) ...
  ],
}
```

---

## 7. i18n Keys

### 7.1 New Keys Required

Namespace: `admin.operations.*` + `admin.nav.operations_center` (~35 keys total)

### 7.2 English (`src/i18n/messages/en.json`)

```json
{
  "admin": {
    "nav": {
      "operations_center": "Operations Center"
    },
    "operations": {
      "title": "Operations Center",
      "description": "Service health, balances, usage, and alerts",
      "service_status": "Service Status",
      "balance": "Balance",
      "days_remaining": "{n} days remaining",
      "less_than_1_day": "< 1 day",
      "depletion_unknown": "Insufficient data",
      "last_checked": "Last checked {time}",
      "never_checked": "Never checked",
      "cost_breakdown": "Cost Breakdown",
      "todays_spend": "Today's Spend",
      "daily_budget": "Daily Budget",
      "monthly_budget": "Monthly Budget",
      "7day_avg": "7-Day Average",
      "cost_by_provider": "Cost by Provider",
      "usage_metrics": "Usage Metrics",
      "api_calls": "API Calls",
      "token_consumption": "Token Consumption",
      "image_gens": "Image Generations",
      "anomaly_feed": "Cost Anomalies",
      "no_anomalies": "No anomalies detected",
      "variance_pct": "{pct}% variance",
      "anomaly_score": "Score: {score}",
      "alert_history": "Alert History",
      "no_alerts": "No alerts",
      "acknowledge": "Acknowledge",
      "acknowledged": "Acknowledged",
      "severity_info": "Info",
      "severity_warning": "Warning",
      "severity_critical": "Critical",
      "channel_email": "Email",
      "channel_in_app": "In-App",
      "channel_sms": "SMS",
      "service_healthy": "Healthy",
      "service_degraded": "Degraded",
      "service_critical": "Critical",
      "service_unknown": "Unknown"
    }
  }
}
```

### 7.3 Arabic (`src/i18n/messages/ar.json`)

Parallel Arabic translations for all keys above.

### 7.4 Pseudo (`src/i18n/messages/pseudo.json`)

Pseudo translations for i18n testing.

---

## 8. Environment Variables

### 8.1 Required for Balance Collection

```env
VERCEL_ACCESS_TOKEN=              # Vercel API token for usage queries
RAILWAY_API_TOKEN=                # Railway API token for usage queries
```

### 8.2 Optional for Configurable Thresholds

```env
OPENROUTER_BALANCE_WARNING_CENTS=2000   # $20 warning threshold (default)
OPENROUTER_BALANCE_CRITICAL_CENTS=500   # $5 critical threshold (default)
REPLICATE_BALANCE_WARNING_CENTS=1500    # $15 warning threshold (default)
REPLICATE_BALANCE_CRITICAL_CENTS=300    # $3 critical threshold (default)
DEEPGRAM_BALANCE_WARNING_CENTS=500      # $5 warning threshold (default)
DEEPGRAM_BALANCE_CRITICAL_CENTS=100     # $1 critical threshold (default)
AI_MONTHLY_BUDGET_USD=500              # Monthly AI spend cap (default)
COST_VARIANCE_ALERT_PCT=50             # Alert when cost deviates >50% (default)
HARD_SPENDING_STOP=false               # Auto-disable features when monthly cap hit (default)
ALERT_DEDUP_TTL_SECS=21600             # 6 hours between duplicate alerts (default)
```

### 8.3 Optional for SMS Alerts

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
OPS_PHONE_NUMBER=
```

### 8.4 Updates to `src/lib/env.ts`

Add to `serverEnvSchema`:

```typescript
VERCEL_ACCESS_TOKEN: z.string().optional(),
RAILWAY_API_TOKEN: z.string().optional(),
OPENROUTER_BALANCE_WARNING_CENTS: z.coerce.number().optional(),
OPENROUTER_BALANCE_CRITICAL_CENTS: z.coerce.number().optional(),
REPLICATE_BALANCE_WARNING_CENTS: z.coerce.number().optional(),
REPLICATE_BALANCE_CRITICAL_CENTS: z.coerce.number().optional(),
DEEPGRAM_BALANCE_WARNING_CENTS: z.coerce.number().optional(),
DEEPGRAM_BALANCE_CRITICAL_CENTS: z.coerce.number().optional(),
AI_MONTHLY_BUDGET_USD: z.coerce.number().optional(),
COST_VARIANCE_ALERT_PCT: z.coerce.number().optional(),
ALERT_DEDUP_TTL_SECS: z.coerce.number().optional(),
TWILIO_ACCOUNT_SID: z.string().optional(),
TWILIO_AUTH_TOKEN: z.string().optional(),
TWILIO_FROM_NUMBER: z.string().optional(),
OPS_PHONE_NUMBER: z.string().optional(),
```

---

## 9. File Inventory

### 9.1 New Files (20)

| # | File | Purpose |
|---|------|---------|
| 1 | `drizzle/XXXX_service_operations_tables.sql` | Migration: 3 new tables |
| 2 | `src/lib/services/service-health-collector.ts` | Service balance/usage API clients |
| 3 | `src/lib/services/service-health-queries.ts` | Dashboard DB queries |
| 4 | `src/lib/services/cost-variance-detector.ts` | Anomaly detection |
| 5 | `src/lib/services/service-alert-engine.ts` | Threshold evaluation + multi-channel alerts |
| 6 | `src/app/api/cron/service-health-check/route.ts` | Hourly balance collection cron |
| 7 | `src/app/api/admin/operations/route.ts` | Dashboard data API |
| 8 | `src/app/api/admin/operations/alerts/[id]/acknowledge/route.ts` | Alert acknowledgment |
| 9 | `src/app/admin/operations/page.tsx` | Operations page (RSC) |
| 10 | `src/app/admin/operations/loading.tsx` | Loading skeleton |
| 11 | `src/components/admin/operations/operations-dashboard.tsx` | Main client orchestrator |
| 12 | `src/components/admin/operations/service-status-grid.tsx` | Service cards |
| 13 | `src/components/admin/operations/balance-trend-chart.tsx` | Balance projection chart |
| 14 | `src/components/admin/operations/cost-breakdown-panel.tsx` | Per-service cost |
| 15 | `src/components/admin/operations/usage-metrics-panel.tsx` | API volumes |
| 16 | `src/components/admin/operations/anomaly-feed.tsx` | Variance events |
| 17 | `src/components/admin/operations/alert-history-panel.tsx` | Alert history |
| 18 | `src/lib/services/__tests__/service-health-collector.test.ts` | Collector tests |
| 19 | `src/lib/services/__tests__/cost-variance-detector.test.ts` | Variance tests |
| 20 | `src/lib/services/__tests__/service-alert-engine.test.ts` | Alert engine tests |

### 9.2 Modified Files (7)

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/schema.ts` | Add 3 table schemas + types |
| 2 | `src/lib/env.ts` | Add new env vars to serverEnvSchema |
| 3 | `src/components/admin/sidebar.tsx` | Add Operations Center nav entry |
| 4 | `src/i18n/messages/en.json` | Add `admin.operations.*` + `admin.nav.operations_center` keys |
| 5 | `src/i18n/messages/ar.json` | Arabic translations |
| 6 | `src/i18n/messages/pseudo.json` | Pseudo translations |
| 7 | `docs/claude/env-vars.md` | Document new env vars |

---

## 10. Implementation Phases

### Phase 1: Foundation (Schema + Core Services)

**Priority**: P0 — prevents service outages
**Files**: 1 migration, 4 new service files, 1 schema modification, 1 env modification

Steps:
1. Create Drizzle migration for 3 new tables
2. Add Drizzle schemas to `src/lib/schema.ts` + inferred types
3. Add env vars to `src/lib/env.ts`
4. Create `service-health-collector.ts` with all service API clients
5. Create `cost-variance-detector.ts` with anomaly detection
6. Create `service-alert-engine.ts` with threshold evaluation + email alerts
7. Create `service-health-queries.ts` with dashboard data aggregation

**Verify**: `pnpm run check` passes, unit tests for collectors with mocked APIs

### Phase 2: Cron + API Layer

**Priority**: P0 — enables balance collection
**Files**: 3 new API routes

Steps:
1. Create `src/app/api/cron/service-health-check/route.ts`
2. Create `src/app/api/admin/operations/route.ts`
3. Create `src/app/api/admin/operations/alerts/[id]/acknowledge/route.ts`
4. Add cron to `vercel.json`

**Verify**: `pnpm run check`, manual cron trigger with `curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/service-health-check`

### Phase 3: Frontend Dashboard

**Priority**: P1 — enables visibility
**Files**: 9 new component files, 1 sidebar modification

Steps:
1. Create `src/app/admin/operations/page.tsx` + `loading.tsx`
2. Create all 7 dashboard sub-components
3. Update admin sidebar with Operations Center entry

**Verify**: `pnpm run check`, `/admin/operations` renders with real data

### Phase 4: i18n + Tests

**Priority**: P1 — production readiness
**Files**: 3 i18n files + 3 test files

Steps:
1. Add all i18n keys (en, ar, pseudo)
2. Write unit tests for service-health-collector (mocked APIs)
3. Write unit tests for cost-variance-detector
4. Write unit tests for service-alert-engine

**Verify**: `pnpm run check`, `pnpm test` all pass, i18n key count matches across locales

### Phase 5: Documentation + Hardening

**Priority**: P2 — governance

Steps:
1. Update `docs/claude/env-vars.md` with new env vars
2. Update `docs/claude/architecture.md` with new file map
3. Update `docs/0-MY-LATEST-UPDATES.md`
4. Add optional SMS alerting (Twilio)
5. Add hard spending stop (feature flag auto-disable)
6. Add snapshot cleanup cron (90-day retention)

---

## 11. Testing Plan

### 11.1 Unit Tests

| Test Suite | Coverage | Key Scenarios |
|-----------|----------|---------------|
| `service-health-collector.test.ts` | Each API client mocked | Successful fetch, timeout, 401, network error, missing env var |
| `cost-variance-detector.test.ts` | Variance algorithm | Normal cost, spike >50%, no historical data, single data point |
| `service-alert-engine.test.ts` | Alert dispatch | Below warning threshold, below critical, dedup enforcement, missing email config |

### 11.2 Integration Scenarios

| Scenario | Steps |
|----------|-------|
| Cron balance collection | 1. Hit cron endpoint with valid auth -> 200 with snapshot data |
| Alert trigger | 1. Set low threshold 2. Run cron 3. Verify email sent 4. Verify dedup on second run |
| Dashboard rendering | 1. Create snapshots 2. Hit `/api/admin/operations` 3. Verify all sections populated |
| Alert acknowledgment | 1. Create alert 2. POST acknowledge 3. Verify `acknowledged=true` |

### 11.3 End-to-End Validation

| Test | Expected |
|------|----------|
| OpenRouter balance fetch | Returns current credits, stores snapshot |
| Balance below threshold | Alert created in DB, email sent to ops |
| Second trigger within 6h | Skipped (dedup) |
| Cost spike 2x average | Variance event created, alert triggered |
| Dashboard loads < 2s | 95th percentile |
| All i18n keys render | No missing translations in ar/en |

---

## 12. Cost Governance Framework

### 12.1 Budget Guardrails

| Guardrail | Implementation | Default |
|-----------|---------------|---------|
| Daily AI Budget | Already exists (`AI_DAILY_BUDGET_USD`) | $50/day |
| Monthly AI Budget | NEW: `AI_MONTHLY_BUDGET_USD` env var | $500/mo |
| Per-Service Balance Thresholds | NEW: configurable per service | See section 4.3 |
| Per-User Daily AI Limit | Already exists (plan-based quota) | Per plan tier |
| Anomaly Threshold | NEW: `COST_VARIANCE_ALERT_PCT` | 50% |
| Hard Spending Stop | NEW: auto-disable non-essential AI when monthly budget exceeded | Disabled |

### 12.2 Recurring Balance Review Schedule

| Cadence | Action | Owner |
|---------|--------|-------|
| **Hourly** | Automated balance check cron -> alert if below threshold | System (cron) |
| **Daily** | AI cost alarm cron -> email if daily budget exceeded | System (cron) |
| **Weekly** | Admin reviews `/admin/operations` dashboard, checks depletion projections, tops up low balances | Operator |
| **Monthly** | Full cost review: per-service spend vs budget, forecast next month, adjust thresholds, review unit economics | Operator |
| **Quarterly** | Strategic review: renegotiate contracts, optimize model selection, evaluate alternative providers | Operator |

### 12.3 Usage Forecasting Model

Simple linear extrapolation using 7-day rolling average:

```typescript
interface UsageForecast {
  service: string;
  currentBalance: number;
  dailyBurnRate: number;        // (balance_7d_ago - current_balance) / 7
  daysRemaining: number;        // current_balance / daily_burn_rate
  projectedDepletionDate: Date;  // now + daysRemaining
  confidence: 'high' | 'medium' | 'low';
}
```

---

## 13. Risk Assessment

### 13.1 Implementation Risks

| Risk | Mitigation |
|------|-----------|
| Service APIs change or require authentication changes | Abstract each service collector behind interface; version API calls; graceful degradation on failure |
| Rate limiting by service APIs during balance checks | Respect `Retry-After` headers; stagger checks across cron runs |
| False positive alerts | Require 2 consecutive readings below threshold before alerting |
| Added database load from snapshots | TTL-based cleanup cron (90-day retention); indexed queries |
| Dashboard performance with many services | Paginate; cache dashboard data for 60s (matching existing admin polling) |

### 13.2 Operational Risks

| Risk | Mitigation |
|------|-----------|
| Auto-recharge failure on critical service | Monitor auto-recharge status; alert when recharge fails |
| Service outage prevents balance check | Track check failures; alert after 3 consecutive misses |
| SMS costs from alerting | Rate-limit SMS to critical alerts only; cap at 10/day |

---

## 14. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Zero unplanned service interruptions from depleted funds | 100% | Incident log |
| Balance alerts fire >= 48 hours before depletion | 100% | Alert timestamp vs depletion timestamp |
| Dashboard loads in < 2 seconds | 95th percentile | Client-side timing |
| Cost anomaly detection within 1 hour | 100% | Anomaly timestamp vs detection timestamp |
| Monthly cost variance < 10% of forecast | 90% of months | Forecast vs actual |
| `pnpm run check` clean | 0 errors | CI pipeline |
| `pnpm test` all pass | All pass | CI pipeline |
| i18n key count match across en/ar/pseudo | 100% | Key count verification |

---

## Appendix A: Service API Reference for Balance Queries

### OpenRouter

```
GET https://openrouter.ai/api/v1/auth/key
Authorization: Bearer {OPENROUTER_API_KEY}
Response: { "data": { "label": "...", "limit_remaining": 123.45, "usage": 67.89 } }
```

### Replicate

```
GET https://api.replicate.com/v1/billing
Authorization: Bearer {REPLICATE_API_TOKEN}
Response: { "balance": 45.67 }
```

### Deepgram

```
GET https://api.deepgram.com/v1/projects/{project_id}/balances
Authorization: Token {YOUTUBE_DEEPGRAM_API_KEY}
Response: [ { "balance_id": "...", "amount": 150.00, "units": "usd" } ]
```

### Vercel

```
GET https://api.vercel.com/v2/usage
Authorization: Bearer {VERCEL_ACCESS_TOKEN}
Response: { "usage": { ... } }
```

### Railway

```
POST https://backboard.railway.app/graphql/v2
Authorization: Bearer {RAILWAY_API_TOKEN}
Body: { "query": "{ project(id: \"...\") { usage { ... } } }" }
```

---

## Appendix B: Recommended Implementation Order

1. **Phase 1** — Schema migration + service health collector (highest ROI, prevents outages)
2. **Phase 2** — Alert engine (email-only initially, leverage existing Resend) + Cron
3. **Phase 3** — Dashboard API + Frontend dashboard components
4. **Phase 4** — i18n + unit tests
5. **Phase 5** — SMS alerting (Twilio), hard spending stop, documentation

To proceed with actual implementation (20+ new files, 7 modified files), switch to **@Builder** or **@Solo Coder** in the input box. This plan serves as the complete blueprint.
