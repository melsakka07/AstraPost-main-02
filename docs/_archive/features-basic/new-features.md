
# AstraPost New Features Implementation Plan

This document outlines the implementation plan for new features requested by the user.

## Completed Features

### 1. Advanced Analytics & Reporting (Feature 1)
- [x] **1.1 Enhanced Dashboard Metrics**
  - *Description*: Add charts for follower growth, engagement rate over time, and top-performing posts.
  - *Status*: Completed.
  - *Implementation*: `src/app/dashboard/analytics/page.tsx` and `src/components/analytics/*`.

- [x] **1.2 Exportable Reports**
  - *Description*: Allow users to export analytics data as CSV/PDF.
  - *Status*: Completed.
  - *Implementation*: `src/app/api/analytics/export/route.ts` and UI in analytics page.

### 2. Smart Scheduling & Content Calendar (Feature 2)
- [x] **2.1 Drag-and-Drop Calendar**
  - *Description*: Visual calendar to view and reschedule posts.
  - *Status*: Completed.
  - *Implementation*: `src/app/dashboard/calendar/page.tsx` using `react-big-calendar`.

- [x] **2.2 Best Time to Post**
  - *Description*: Suggest optimal posting times based on historical engagement.
  - *Status*: Completed.
  - *Implementation*: `src/lib/analytics/best-time.ts` (mock logic for now).

### 3. Media Management & Library (Feature 3)
- [x] **3.1 Media Library**
  - *Description*: Centralized place to upload and manage images/videos.
  - *Status*: Completed.
  - *Implementation*: `src/app/dashboard/media/page.tsx` and `src/lib/storage.ts`.

- [x] **3.2 Image Editor**
  - *Description*: Basic cropping/filters before posting.
  - *Status*: Completed.
  - *Implementation*: Integrated `react-easy-crop` in Composer.

### 4. AI Content Enhancement (Feature 4)
- [x] **4.1 AI Thread Writer**
  - *Description*: Generate multi-tweet threads from a topic.
  - *Status*: Completed.
  - *Implementation*: `src/app/api/ai/thread/route.ts` and Composer integration.

- [x] **4.2 Tone & Style Adjuster**
  - *Description*: Rewrite tweets to be "Professional", "Funny", "Viral", etc.
  - *Status*: Completed.
  - *Implementation*: `src/app/api/ai/rewrite/route.ts`.

### 5. Engagement & Community Management (Feature 5)
- [x] **5.1 Reply Management**
  - *Description*: View and reply to mentions/comments directly from dashboard.
  - *Status*: Completed.
  - *Implementation*: `src/app/dashboard/engagement/page.tsx` and X API integration.

- [x] **5.2 Auto-DM on Reply**
  - *Description*: Automation rule to DM users who reply with a specific keyword (e.g., "send me the link").
  - *Status*: Completed.
  - *Implementation*: `src/lib/automation/auto-dm.ts`.

### 6. Advanced Queue Management (Feature 6)
- [x] **6.1 Recurring Posts (Evergreen)**
  - *Description*: "Recycle" best posts to be posted again after X weeks.
  - *Status*: Completed.
  - *Implementation*: `recurrencePattern` in `posts` table and queue worker logic.

- [x] **6.2 Queue Shuffle & Pause**
  - *Description*: Shuffle the queue or pause all outgoing posts in emergencies.
  - *Status*: Completed.
  - *Implementation*: Queue management API.

### 7. Multi-Account, Teams & Agency Features (Feature 7)
- [x] **7.1 Account Groups**
  - *Description*: Group X accounts (e.g., "Client A", "Personal") for easier selection.
  - *Status*: Completed (Implicit in Team Context).

- [x] **7.2 Default Account Selector**
  - *Description*: Global switcher in header to filter dashboard by client/account.
  - *Status*: Completed.
  - *Implementation*: `AccountSwitcher` component and `TeamContext` logic.

- [x] **7.3 Team Members & Role-Based Access**
  - *Description*: Invite team members with roles (Owner, Admin, Editor, Viewer).
  - *Status*: Completed.
  - *Implementation*: `team_members` table, `api/team/members` endpoints, and RBAC middleware.

- [x] **7.4 Post Approval Workflow**
  - *Description*: "Require Approval" setting; Editors submit -> Admin approves.
  - *Status*: Completed.
  - *Implementation*: `status: 'awaiting_approval'` logic and `PostApprovalActions` UI.

## Planned Features (Roadmap)

### 8. Onboarding, Retention & Growth Loops (Feature 8)
- [x] **8.1 Interactive Onboarding Tour**
  - *Description*: "Walkthrough" for new users (e.g., "Connect Account" -> "Create First Post").
  - *Status*: Completed.
  - *Implementation*: `src/components/onboarding/dashboard-tour.tsx` using `driver.js`.

- [x] **8.2 "Gamified" Milestones**
  - *Description*: "First 100 Followers", "10 Day Streak" badges.
  - *Status*: Completed.
  - *Implementation*: `src/lib/gamification.ts` and `src/app/dashboard/achievements/page.tsx`.

- [x] **8.3 Referral System**
  - *Description*: "Invite a friend, get 1 month Pro free".
  - *Status*: Completed.
  - *Implementation*: `src/lib/referral/utils.ts` and `src/app/dashboard/referrals/page.tsx`.

### 9. Mobile Experience (Feature 9)
- [ ] **9.1 PWA Support**
  - *Description*: Make the app installable on mobile.
  - *Priority*: Medium.

- [ ] **9.2 Mobile-Optimized Composer**
  - *Description*: Ensure writing experience is great on touch screens.
  - *Priority*: High.

### 10. Settings, Profile & Security (Feature 10)
- [x] **10.1 Two-Factor Authentication (2FA)**
  - *Description*: TOTP integration (Google Authenticator) via Better Auth.
  - *Status*: Completed.
  - *Implementation*: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/components/settings/security-settings.tsx`.

- [x] **10.2 GDPR Compliance**
  - *Description*: Self-service data export (JSON ZIP) and account deletion endpoints.
  - *Status*: Completed.
  - *Implementation*: `src/app/api/user/export/route.ts`, `src/app/api/user/delete/route.ts`, `src/components/settings/privacy-settings.tsx`.

- [x] **10.3 Idempotency Keys**
  - *Description*: Prevent duplicate posts on retry.
  - *Status*: Completed.
  - *Implementation*: `src/app/api/posts/route.ts` (Idempotency-Key header handling).
