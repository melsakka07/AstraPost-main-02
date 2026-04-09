# AstraPost New Features Implementation Plan

This document outlines the implementation plan for new features requested by the user.

## Completed Features

### 1. Advanced Analytics & Reporting (Feature 1)

- [x] **1.1 Enhanced Dashboard Metrics**
  - _Description_: Add charts for follower growth, engagement rate over time, and top-performing posts.
  - _Status_: Completed.
  - _Implementation_: `src/app/dashboard/analytics/page.tsx` and `src/components/analytics/*`.

- [x] **1.2 Exportable Reports**
  - _Description_: Allow users to export analytics data as CSV/PDF.
  - _Status_: Completed.
  - _Implementation_: `src/app/api/analytics/export/route.ts` and UI in analytics page.

### 2. Smart Scheduling & Content Calendar (Feature 2)

- [x] **2.1 Drag-and-Drop Calendar**
  - _Description_: Visual calendar to view and reschedule posts.
  - _Status_: Completed.
  - _Implementation_: `src/app/dashboard/calendar/page.tsx` using `react-big-calendar`.

- [x] **2.2 Best Time to Post**
  - _Description_: Suggest optimal posting times based on historical engagement.
  - _Status_: Completed.
  - _Implementation_: `src/lib/analytics/best-time.ts` (mock logic for now).

### 3. Media Management & Library (Feature 3)

- [x] **3.1 Media Library**
  - _Description_: Centralized place to upload and manage images/videos.
  - _Status_: Completed.
  - _Implementation_: `src/app/dashboard/media/page.tsx` and `src/lib/storage.ts`.

- [x] **3.2 Image Editor**
  - _Description_: Basic cropping/filters before posting.
  - _Status_: Completed.
  - _Implementation_: Integrated `react-easy-crop` in Composer.

### 4. AI Content Enhancement (Feature 4)

- [x] **4.1 AI Thread Writer**
  - _Description_: Generate multi-tweet threads from a topic.
  - _Status_: Completed.
  - _Implementation_: `src/app/api/ai/thread/route.ts` and Composer integration.

- [x] **4.2 Tone & Style Adjuster**
  - _Description_: Rewrite tweets to be "Professional", "Funny", "Viral", etc.
  - _Status_: Completed.
  - _Implementation_: `src/app/api/ai/rewrite/route.ts`.

### 5. Engagement & Community Management (Feature 5)

- [x] **5.1 Reply Management**
  - _Description_: View and reply to mentions/comments directly from dashboard.
  - _Status_: Completed.
  - _Implementation_: `src/app/dashboard/engagement/page.tsx` and X API integration.

- [x] **5.2 Auto-DM on Reply**
  - _Description_: Automation rule to DM users who reply with a specific keyword (e.g., "send me the link").
  - _Status_: Completed.
  - _Implementation_: `src/lib/automation/auto-dm.ts`.

### 6. Advanced Queue Management (Feature 6)

- [x] **6.1 Recurring Posts (Evergreen)**
  - _Description_: "Recycle" best posts to be posted again after X weeks.
  - _Status_: Completed.
  - _Implementation_: `recurrencePattern` in `posts` table and queue worker logic.

- [x] **6.2 Queue Shuffle & Pause**
  - _Description_: Shuffle the queue or pause all outgoing posts in emergencies.
  - _Status_: Completed.
  - _Implementation_: Queue management API.

### 7. Multi-Account, Teams & Agency Features (Feature 7)

- [x] **7.1 Account Groups**
  - _Description_: Group X accounts (e.g., "Client A", "Personal") for easier selection.
  - _Status_: Completed (Implicit in Team Context).

- [x] **7.2 Default Account Selector**
  - _Description_: Global switcher in header to filter dashboard by client/account.
  - _Status_: Completed.
  - _Implementation_: `AccountSwitcher` component and `TeamContext` logic.

- [x] **7.3 Team Members & Role-Based Access**
  - _Description_: Invite team members with roles (Owner, Admin, Editor, Viewer).
  - _Status_: Completed.
  - _Implementation_: `team_members` table, `api/team/members` endpoints, and RBAC middleware.

- [x] **7.4 Post Approval Workflow**
  - _Description_: "Require Approval" setting; Editors submit -> Admin approves.
  - _Status_: Completed.
  - _Implementation_: `status: 'awaiting_approval'` logic and `PostApprovalActions` UI.

## Planned Features (Roadmap)

### 8. Onboarding, Retention & Growth Loops (Feature 8)

- [x] **8.1 Interactive Onboarding Tour**
  - _Description_: "Walkthrough" for new users (e.g., "Connect Account" -> "Create First Post").
  - _Status_: Completed.
  - _Implementation_: `src/components/onboarding/dashboard-tour.tsx` using `driver.js`.

- [x] **8.2 "Gamified" Milestones**
  - _Description_: "First 100 Followers", "10 Day Streak" badges.
  - _Status_: Completed.
  - _Implementation_: `src/lib/gamification.ts` and `src/app/dashboard/achievements/page.tsx`.

- [x] **8.3 Referral System**
  - _Description_: "Invite a friend, get 1 month Pro free".
  - _Status_: Completed.
  - _Implementation_: `src/lib/referral/utils.ts` and `src/app/dashboard/referrals/page.tsx`.

### 9. Mobile Experience (Feature 9)

- [ ] **9.1 PWA Support**
  - _Description_: Make the app installable on mobile.
  - _Priority_: Medium.

- [ ] **9.2 Mobile-Optimized Composer**
  - _Description_: Ensure writing experience is great on touch screens.
  - _Priority_: High.

### 10. Settings, Profile & Security (Feature 10)

- [x] **10.1 Two-Factor Authentication (2FA)**
  - _Description_: TOTP integration (Google Authenticator) via Better Auth.
  - _Status_: Completed.
  - _Implementation_: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/components/settings/security-settings.tsx`.

- [x] **10.2 GDPR Compliance**
  - _Description_: Self-service data export (JSON ZIP) and account deletion endpoints.
  - _Status_: Completed.
  - _Implementation_: `src/app/api/user/export/route.ts`, `src/app/api/user/delete/route.ts`, `src/components/settings/privacy-settings.tsx`.

- [x] **10.3 Idempotency Keys**
  - _Description_: Prevent duplicate posts on retry.
  - _Status_: Completed.
  - _Implementation_: `src/app/api/posts/route.ts` (Idempotency-Key header handling).
