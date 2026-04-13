---
name: Phase 4.3 - Revenue Trends Dashboard Implementation
description: Complete implementation of MRR trends, LTV estimates, and cohort retention for billing analytics
type: project
---

## Implementation Summary

Phase 4.3 has been successfully implemented with three core components:

### 1. Backend API Enhancement
**File:** `src/app/api/admin/billing/analytics/route.ts`

Added three new async/sync functions to calculate financial metrics:

- **`calculateMRRTrends()`** - Generates 12-month Monthly Recurring Revenue trend
  - Queries users by plan for each month
  - Calculates MRR using pricing from `PRICING` config
  - Returns breakdown by plan type (Pro Monthly, Pro Annual, Agency)
  - Data structure: `{ month, mrr, proMonthly, proAnnual, agency }`

- **`calculateLTVEstimates()`** - Lifetime Value calculations
  - Uses baseline 12-month lifetime for Pro plans
  - Uses 18-month lifetime for Agency plans
  - Formula: LTV = Monthly Price × Average Lifetime
  - Returns record: `{ pro_monthly, pro_annual, agency_monthly, agency_annual }`

- **`calculateCohortRetention()`** - Cohort analysis (optional feature)
  - Groups users by signup month (last 6 months for performance)
  - Tracks % of users still on paid plans at: Month 0, +1, +2, +3, +6
  - Uses PostgreSQL `DATE_TRUNC` for month grouping
  - Returns array with retention percentages per cohort

**API Response Enhancement:**
```json
{
  "mrrTrends": [{ month, mrr, proMonthly, proAnnual, agency }],
  "ltvEstimates": { pro_monthly, pro_annual, agency_monthly, agency_annual },
  "cohortData": [{ cohort, totalUsers, month0, month1, month2, month3, month6 }]
}
```

### 2. Frontend Components
**File:** `src/components/admin/billing/revenue-charts.tsx`

Three client components with recharts visualization:

- **`MRRTrendChart`** - Line chart with 4 series
  - Total MRR (solid line)
  - Pro Monthly (dashed, 60% opacity)
  - Pro Annual (dashed, 40% opacity)
  - Agency (dashed, accent color)
  - Responsive container with dark mode support
  - Tooltip formats values as "$1.2k" format
  - Y-axis shows thousands shorthand

- **`LTVEstimatesTable`** - Simple 4-column table
  - Plan name, Monthly Price, Avg. Lifetime, LTV Estimate
  - Uses `formatCurrency()` helper for cents→USD conversion
  - Displays in responsive table with proper text alignment

- **`CohortRetentionTable`** - 7-column cohort analysis table
  - Signup month, Total users, Month 0-6 retention percentages
  - Color-coded cells: green (≥75%), yellow (≥50%), red (<50%)
  - Shows empty state if no data available

**Helper Functions:**
- `formatCurrency(cents)` - Converts cents to USD string ($X.XX)
- `formatMRRTooltip(cents)` - Formats MRR with K suffix ($1.2k)
- `RetentionCell` - Renders colored retention percentage cells

### 3. Page Integration
**File:** `src/app/admin/billing/analytics/page.tsx`

- Imports all three chart components
- Extracts new data from API response
- Renders components in optimal layout:
  1. Metrics cards (existing)
  2. MRR Trend Chart (full width)
  3. LTV & Cohort tables side-by-side (md:grid-cols-2)
  4. Plan Distribution (existing)
  5. Failed Webhooks (existing)
  6. Recent Changes (existing)

## Design Patterns Used

- **"use client"** directive in revenue-charts.tsx for client-side rendering
- **Shadcn/ui Card components** for consistent styling
- **Tailwind CSS utilities** with dark mode support via CSS variables
- **Recharts** for responsive line chart visualization
- **Type-safe interfaces** for all data structures
- **Conditional rendering** for empty states

## Pricing Integration

Uses existing `PRICING` config from `src/lib/pricing.ts`:
- Pro Monthly: $29/month
- Pro Annual: $290/year (÷12 = $24.17/month)
- Agency Monthly: $99/month  
- Agency Annual: $990/year (÷12 = $82.50/month)

## Performance Considerations

- Cohort retention limits to last 6 months only (performance optimization)
- MRR trends calculates 12 months with single query per month
- All calculations on backend; frontend just renders
- No N+1 queries in grace recovery calculation (uses EXISTS subquery)

## Testing Notes

- MRR data in cents, converted to dollars in frontend
- Cohort retention handles missing data points (defaults to 0%)
- Empty state for charts when no data available
- Dark mode CSS variables used throughout

## Future Enhancements

- Add export to CSV for trends data
- Add date range picker for custom period analysis
- Add churn prediction based on cohort trends
- Add MRR trend forecast using linear regression
