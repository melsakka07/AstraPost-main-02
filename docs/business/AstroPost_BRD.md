# 🚀 AstraPost — Business Requirements Document (BRD)

---

> **Project Name:** AstraPost — AI-Powered X (Twitter) Scheduling & Content Monetization Platform
> **Version:** 1.0
> **Date:** March 2026
> **Author:** thunderlight
> **Status:** Draft for Review
> **Classification:** Confidential

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Objectives](#2-business-objectives)
3. [Project Scope](#3-project-scope)
4. [Stakeholders](#4-stakeholders)
5. [Market Analysis & User Personas](#5-market-analysis--user-personas)
6. [Functional Requirements](#6-functional-requirements)
   - 6.1 [Authentication & User Management](#61-authentication--user-management-module)
   - 6.2 [Tweet Composer](#62-tweet-composer-module)
   - 6.3 [Scheduling Engine](#63-scheduling-engine-module)
   - 6.4 [Draft Management](#64-draft-management-module)
   - 6.5 [AI Content Generation](#65-ai-content-generation-module)
   - 6.6 [Analytics](#66-analytics-module)
   - 6.7 [Subscription & Billing](#67-subscription--billing-module)
   - 6.8 [Notifications](#68-notification-module)
   - 6.9 [Admin Dashboard](#69-admin-dashboard-module)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [System Architecture & Tech Stack](#8-system-architecture--tech-stack)
9. [Database Schema](#9-database-schema)
10. [User Stories & Acceptance Criteria](#10-user-stories--acceptance-criteria)
11. [Wireframe Descriptions](#11-wireframe-descriptions)
12. [API Requirements & Integrations](#12-api-requirements--integrations)
13. [Pricing Strategy & Monetization](#13-pricing-strategy--monetization)
14. [Security & Compliance](#14-security--compliance)
15. [Risk Analysis & Mitigation](#15-risk-analysis--mitigation)
16. [Project Timeline & Milestones](#16-project-timeline--milestones)
17. [Success Metrics & KPIs](#17-success-metrics--kpis)
18. [Appendices](#18-appendices)

---

## 1. Executive Summary

### 1.1 Project Overview

**AstraPost** is an AI-powered SaaS web application designed to serve Arabic-speaking content creators and social media managers who use X (Twitter). Inspired by Postlate.com, AstraPost delivers a superior, feature-rich, and scalable platform that addresses all known product gaps while adding enterprise-grade capabilities.

The platform allows users to:
- Schedule tweets and threads automatically
- Leverage AI for Arabic and English content generation
- Monetize content through an Amazon affiliate marketing tool
- Track performance via an analytics dashboard
- Manage multiple accounts from a single, intuitive interface

---

### 1.2 Business Opportunity

| Factor | Detail |
|--------|--------|
| Arabic speakers worldwide | 400+ million |
| Active on X (Twitter) | 50+ million Arabic-speaking users |
| Existing tool gap | Buffer, Hootsuite, Later are all English-first — no native Arabic UX |
| Competitor weakness | Postlate has only ~1,000 users — enormous market gap |
| MENA influencer economy | Estimated at $1.8B by 2026 |
| Unmet need | No credible Arabic-native X scheduling tool with AI capabilities exists |

---

### 1.3 Problem Statement

Arabic content creators on X face three core challenges:

1. **Time Waste** — Manually waiting for optimal posting times wastes 2–3 hours per day
2. **Idea Loss** — Great tweet ideas are forgotten with no structured draft/capture system
3. **Low Engagement** — Posting at wrong times without data-driven insights results in poor reach

---

### 1.4 Proposed Solution

AstraPost solves these problems by offering:

- ✅ Fully automated scheduling with intelligent timing recommendations
- ✅ AI-powered content generation in Arabic and English
- ✅ Built-in analytics dashboard for performance tracking
- ✅ Multi-account management for agencies and teams
- ✅ Amazon affiliate tweet generator for passive income monetization
- ✅ Bilingual UI (Arabic RTL + English LTR) with one-click toggle

---

### 1.5 Vision Statement

> *"Within 12 months of launch, AstraPost becomes the #1 Arabic-native X scheduling tool in the MENA region — serving 10,000 active users with $25,000 MRR."*

---

## 2. Business Objectives

### 2.1 Primary Business Goals

| # | Goal | Target | Timeline |
|---|------|--------|----------|
| 1 | Market Leadership | #1 Arabic X scheduling platform in MENA | 18 months |
| 2 | Revenue Target | $25,000 MRR | 12 months post-launch |
| 3 | User Acquisition | 10,000 registered users | 12 months post-launch |
| 4 | Conversion Rate | 8–12% free-to-paid | Ongoing |
| 5 | Retention | 85%+ monthly subscription retention | Ongoing |

---

### 2.2 Secondary Business Goals

1. Build brand recognition in Saudi Arabia, UAE, Egypt, and Kuwait (primary markets)
2. Establish affiliate and influencer partnership network in MENA
3. Expand to English-language market in Phase 2
4. Build a public API product for developers in Phase 3

---

### 2.3 Key Performance Indicators (KPIs)

| KPI | Target | Measurement Method | Frequency |
|-----|--------|--------------------|-----------|
| Monthly Recurring Revenue (MRR) | $25,000 by Month 12 | Stripe Dashboard | Monthly |
| Active Users (MAU) | 10,000 by Month 12 | App Analytics | Weekly |
| Free-to-Paid Conversion | 10%+ | Funnel Analytics | Monthly |
| Monthly Churn Rate | < 5% | Subscription Analytics | Monthly |
| Tweets Scheduled | 500,000/month | Database Metrics | Weekly |
| Net Promoter Score (NPS) | 50+ | In-app Survey | Quarterly |
| Average Session Duration | 8+ minutes | Analytics | Monthly |
| Support Ticket Resolution | < 4 hours | Support System | Weekly |

---

## 3. Project Scope

### 3.1 Phase 1 — MVP (Weeks 1–13) ✅ In Scope

**Authentication & Onboarding**
- [ ] User registration and login via X OAuth 2.0
- [ ] Email/password alternative registration
- [ ] 4-step onboarding wizard
- [ ] Account settings (name, email, timezone, language)
- [ ] Account deletion (GDPR compliant)

**Content Composer**
- [ ] Single tweet composer (280-char limit with live counter)
- [ ] Thread builder (up to 25 tweet cards, drag-and-drop reorder)
- [ ] Media attachments: images (4x, 5MB each), video (512MB), GIF (15MB)
- [ ] Emoji picker
- [ ] Link preview card

**Scheduling Engine**
- [ ] Date/time picker (15-minute increments)
- [ ] Auto timezone detection
- [ ] Instant publish (one-click)
- [ ] Scheduled queue dashboard (status: Queued / Published / Failed)
- [ ] Edit, reschedule, delete queued posts
- [ ] Retry logic (3 attempts, 5-min intervals on failure)

**Draft Management**
- [ ] Save as Draft at any point
- [ ] Auto-save every 30 seconds while composing
- [ ] Draft library (searchable, sortable)
- [ ] Convert draft to scheduled post
- [ ] Unlimited drafts (Free + Pro)

**AI Features (Pro)**
- [ ] AI Thread Writer (topic → tone → count → full thread in Arabic/English)
- [ ] Single tweet AI improvement assistant
- [ ] Amazon Affiliate Tweet Generator (URL input → AI promotional tweet)
- [ ] AI generation history (last 20 outputs)

**Analytics (Basic — Pro)**
- [ ] Per-tweet metrics: impressions, likes, retweets, replies, link clicks, engagement rate
- [ ] Aggregate dashboard: last 7/30/90 days
- [ ] Top 5 performing tweets
- [ ] Export analytics as CSV or PDF

**Billing & Subscriptions**
- [ ] Stripe Checkout integration (Pro Monthly + Pro Annual)
- [ ] Plan upgrade/downgrade/cancel
- [ ] Invoice history (PDF download)
- [ ] Failed payment retry + dunning emails
- [ ] Coupon/discount code support

**Notifications**
- [ ] Email: welcome, schedule confirmation, failure alert, renewal reminder, monthly digest
- [ ] In-app: bell icon notification feed

**Admin Dashboard**
- [ ] User management (view, filter, suspend)
- [ ] Platform analytics (MRR, churn, API usage)
- [ ] Content moderation flagging

---

### 3.2 Phase 2 — Growth (Months 4–7) 🔜 In Scope

- [ ] Multi-account management (up to 5 X accounts)
- [ ] Team workspace with roles: Admin, Editor, Viewer
- [ ] Content approval workflows
- [ ] Visual content calendar (monthly/weekly grid, drag-and-drop)
- [ ] Best time to post AI recommendations (audience activity analysis)
- [ ] Advanced analytics (follower growth, reach, top content trends)
- [ ] Hashtag suggestion AI tool
- [ ] Content recycling / evergreen post rotation
- [ ] Bulk scheduling via CSV upload
- [ ] Mobile app — iOS + Android (React Native)

---

### 3.3 Phase 3 — Enterprise (Months 8–14) 🔜 In Scope

- [ ] Agency dashboard (unlimited accounts, client management)
- [ ] White-label option for agencies
- [ ] Public REST API + webhooks
- [ ] Zapier / Make (Integromat) integration
- [ ] RSS feed auto-posting
- [ ] Custom AI persona training
- [ ] Multi-platform support (LinkedIn, Instagram)
- [ ] Local MENA payment methods (Moyasar for Saudi Arabia)

---

### 3.4 Out of Scope ❌

- No fake/artificial engagement boosting (X ToS compliance)
- No Instagram/TikTok/Facebook in Phase 1
- No desktop application
- No SMS notifications
- No blockchain/crypto features

---

## 4. Stakeholders

### 4.1 Internal Stakeholders

| Role | Responsibilities | Decision Authority |
|------|-----------------|-------------------|
| Product Owner | Vision, roadmap, prioritization | High |
| Lead Engineer | Technical architecture, delivery oversight | High |
| Frontend Engineer | UI/UX implementation (Next.js, Tailwind) | Medium |
| Backend Engineer | API, database, job queues, integrations | Medium |
| AI/ML Engineer | AI thread writer, recommendations engine | Medium |
| UI/UX Designer | Wireframes, design system, RTL layout | Medium |
| Marketing Manager | Growth, acquisition, community building | Medium |
| Customer Support | User support, feedback collection | Low |

---

### 4.2 External Stakeholders

| Stakeholder | Role |
|-------------|------|
| End Users | Arabic-speaking X content creators |
| Pro Subscribers | Paying customers of AstraPost |
| X (Twitter) Platform | OAuth 2.0 and API v2 dependency |
| Stripe | Payment processing and subscription management |
| Amazon Associates | Affiliate marketing API integration |
| OpenAI | AI content generation engine |
| AWS / Vercel / Supabase | Cloud infrastructure providers |

---

## 5. Market Analysis & User Personas

### 5.1 Target Market

- **Primary:** Arabic-speaking content creators, influencers, and solo entrepreneurs on X
- **Secondary:** Social media managers and digital agencies in MENA
- **Tertiary:** Affiliate marketers targeting Arabic-speaking Amazon audiences
- **Geography:** Saudi Arabia, UAE, Egypt, Kuwait, Qatar, Jordan, Iraq (priority order)

---

### 5.2 Competitive Analysis

| Feature | AstraPost | Postlate | Buffer | Typefully | Hypefury | TweetDeck |
|---------|-----------|----------|--------|-----------|----------|-----------|
| Tweet Scheduling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Thread Builder | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| AI Writer | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Analytics Dashboard | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Multi-Account | ✅ (Phase 2) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Mobile App | ✅ (Phase 2) | ❌ | ✅ | ❌ | ❌ | ✅ |
| Arabic Native UI | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Affiliate Tools | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Content Calendar | ✅ (Phase 2) | ❌ | ✅ | ❌ | ✅ | ❌ |
| Team Collaboration | ✅ (Phase 2) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Bulk CSV Scheduling | ✅ (Phase 2) | ❌ | ✅ | ❌ | ✅ | ❌ |
| Hashtag Suggestions | ✅ (Phase 2) | ❌ | ❌ | ❌ | ✅ | ❌ |
| Multi-Platform | ✅ (Phase 3) | ❌ | ✅ | ❌ | ❌ | ❌ |
| Price/month | $19.99 | $19.99 | $18 | $19 | $29 | Free (X) |
| X ToS Compliant | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |

> ⚠️ Postlate's "Engagement Boost" feature (fake likes/retweets from 550K follower account) violates X Terms of Service. AstraPost deliberately excludes this feature to protect users.

---

### 5.3 User Personas

---

#### 👤 Persona 1 — Ahmed (The Solo Content Creator)

| Attribute | Detail |
|-----------|--------|
| Age | 26 |
| Location | Saudi Arabia (Riyadh) |
| Occupation | Full-time X content creator |
| X Followers | 45,000 |
| Daily Tweets | 10–15 per day |
| Device | iPhone 14, MacBook Pro |
| Tech Savviness | High |
| Willingness to Pay | $20–30/month |

**Pain Points:**
- Wastes 2–3 hours daily manually waiting to post at peak times
- Forgets brilliant tweet ideas that come at 2am
- No way to prepare a full week's content in one session

**Goals:**
- Fully automate posting schedule
- Grow audience to 100,000 followers
- Earn passive income via Amazon affiliate tweets

**How AstraPost Helps:** Batch-schedule a week's content in one sitting, use AI to generate threads, and auto-generate affiliate tweets.

---

#### 👤 Persona 2 — Sarah (The Social Media Manager)

| Attribute | Detail |
|-----------|--------|
| Age | 31 |
| Location | Dubai, UAE |
| Occupation | Social media manager at a digital agency |
| Accounts Managed | 8 client X accounts |
| Device | Windows Laptop |
| Tech Savviness | Very High |
| Willingness to Pay | $50–100/month (agency plan) |

**Pain Points:**
- No centralized dashboard for multiple client accounts
- Manual posting across accounts is time-consuming and error-prone
- Cannot generate monthly performance reports for clients

**Goals:**
- Manage all clients from one interface
- Generate client-facing analytics PDF reports
- Reduce account management time by 60%

**How AstraPost Helps:** Multi-account workspace (Phase 2), analytics export, team roles, approval workflow.

---

#### 👤 Persona 3 — Khalid (The Affiliate Marketer)

| Attribute | Detail |
|-----------|--------|
| Age | 34 |
| Location | Kuwait |
| Occupation | Part-time Amazon affiliate marketer |
| X Followers | 12,000 |
| Device | Android phone, Windows PC |
| Tech Savviness | Medium |
| Willingness to Pay | $20/month if ROI is clear |

**Pain Points:**
- Writing Amazon affiliate tweets is tedious and time-consuming
- Low click-through rates on manually written promotions
- No way to batch-create and schedule product promotions

**Goals:**
- Automate affiliate tweet creation from product URLs
- Scale to $1,000/month in affiliate commissions
- Reach broader audience with better-timed posts

**How AstraPost Helps:** Amazon Affiliate Tweet Generator auto-creates compelling promotional tweets with embedded affiliate link and product image.

---

## 6. Functional Requirements

> **Priority Legend:**
> - 🔴 **Must Have** — Critical for launch; product fails without it
> - 🟠 **Should Have** — High value; include if possible in Phase 1
> - 🟢 **Nice to Have** — Valuable enhancement for Phase 2+

---

### 6.1 Authentication & User Management Module

| ID | Requirement | Priority | Effort |
|----|-------------|----------|--------|
| FR-AUTH-001 | X OAuth 2.0 PKCE login — one-click account connection | 🔴 Must Have | Medium |
| FR-AUTH-002 | Email/password alternative registration with email verification | 🟠 Should Have | Low |
| FR-AUTH-003 | JWT session management (15-min access token + 30-day refresh) | 🔴 Must Have | Medium |
| FR-AUTH-004 | Account settings page (name, email, timezone, language AR/EN) | 🔴 Must Have | Low |
| FR-AUTH-005 | Account deletion with full data purge (GDPR compliance) | 🔴 Must Have | Medium |
| FR-AUTH-006 | Password reset via email | 🟠 Should Have | Low |
| FR-AUTH-007 | Two-factor authentication (2FA) via authenticator app | 🟢 Nice to Have | High |

**FR-AUTH-001 Acceptance Criteria:**
```
GIVEN a new user visits AstraPost
WHEN they click "Connect with X"
THEN they are redirected to X OAuth authorization
AND upon granting permission are redirected back to AstraPost dashboard
AND their X profile (username, avatar, follower count) is stored
AND the entire flow completes within 5 seconds
```

---

### 6.2 Tweet Composer Module

| ID | Requirement | Priority | Effort |
|----|-------------|----------|--------|
| FR-COMP-001 | Single tweet composer with 280-char live counter | 🔴 Must Have | Medium |
| FR-COMP-002 | Thread builder — up to 25 tweet cards, drag-and-drop reorder | 🔴 Must Have | High |
| FR-COMP-003 | Image upload (up to 4 per tweet, JPG/PNG/WebP, max 5MB each) | 🔴 Must Have | High |
| FR-COMP-004 | Video upload (1 per tweet, MP4/MOV, max 512MB, max 2:20 min) | 🔴 Must Have | High |
| FR-COMP-005 | GIF upload (1 per tweet, max 15MB) | 🔴 Must Have | Medium |
| FR-COMP-006 | Emoji picker with search and recently used section | 🟠 Should Have | Low |
| FR-COMP-007 | Link preview card when URL is pasted | 🟠 Should Have | Medium |
| FR-COMP-008 | Hashtag suggestions (as user types #) | 🟢 Nice to Have | Medium |
| FR-COMP-009 | Live preview panel showing realistic X tweet mockup | 🔴 Must Have | Medium |
| FR-COMP-010 | Auto-save draft every 30 seconds while composing | 🔴 Must Have | Low |

**FR-COMP-002 Acceptance Criteria:**
```
GIVEN a user is in Thread Builder mode
WHEN they add tweet cards
THEN each card has its own 280-char counter
AND cards can be reordered via drag-and-drop
AND thread numbering auto-updates (e.g., 1/5, 2/5)
AND maximum 25 cards per thread
AND minimum 2 cards required for a thread
```

---

### 6.3 Scheduling Engine Module

| ID | Requirement | Priority | Effort |
|----|-------------|----------|--------|
| FR-SCHED-001 | Date/time picker with 15-minute increments | 🔴 Must Have | Medium |
| FR-SCHED-002 | Auto timezone detection from browser on first login | 🔴 Must Have | Low |
| FR-SCHED-003 | Manual timezone override in account settings | 🔴 Must Have | Low |
| FR-SCHED-004 | Instant publish (one-click "Publish Now") | 🔴 Must Have | Low |
| FR-SCHED-005 | Scheduled queue dashboard with status indicators | 🔴 Must Have | High |
| FR-SCHED-006 | Edit/reschedule/delete queued posts | 🔴 Must Have | Medium |
| FR-SCHED-007 | Auto-retry on publish failure (3 attempts, 5-min intervals) | 🔴 Must Have | High |
| FR-SCHED-008 | Email + in-app alert on publish failure | 🔴 Must Have | Medium |
| FR-SCHED-009 | Best time to post AI suggestions (audience activity analysis) | 🟢 Nice to Have | Very High |
| FR-SCHED-010 | Bulk scheduling via CSV upload | 🟢 Nice to Have | High |

**Scheduling Limits by Plan:**

| Limit | Free | Pro Monthly | Pro Annual |
|-------|------|-------------|------------|
| Scheduled tweets/month | 5 | Unlimited | Unlimited |
| Advance scheduling window | 7 days | 365 days | 365 days |
| Thread scheduling | ❌ | ✅ | ✅ |
| Video scheduling | ❌ | ✅ | ✅ |
| GIF scheduling | ❌ | ✅ | ✅ |

---

### 6.4 Draft Management Module

| ID | Requirement | Priority | Effort |
|----|-------------|----------|--------|
| FR-DRAFT-001 | Save any tweet/thread as draft at any time | 🔴 Must Have | Low |
| FR-DRAFT-002 | Draft library with search and sort (by date, title) | 🔴 Must Have | Medium |
| FR-DRAFT-003 | One-click convert draft to scheduled post | 🔴 Must Have | Low |
| FR-DRAFT-004 | Unlimited drafts on all plans (Free + Pro) | 🔴 Must Have | Low |
| FR-DRAFT-005 | Delete drafts individually or in bulk | 🟠 Should Have | Low |

---

### 6.5 AI Content Generation Module

| ID | Requirement | Priority | Effort |
|----|-------------|----------|--------|
| FR-AI-001 | AI Thread Writer (topic + tone + count → full thread) | 🔴 Must Have (Pro) | Very High |
| FR-AI-002 | Single tweet AI improvement ("Improve this tweet" button) | 🟠 Should Have (Pro) | High |
| FR-AI-003 | Multiple tone options | 🟠 Should Have | Medium |
| FR-AI-004 | AI generation history (last 20 outputs saved for reuse) | 🟢 Nice to Have | Low |
| FR-AI-005 | Amazon Affiliate Tweet Generator | 🔴 Must Have (Pro) | Very High |
| FR-AI-006 | Arabic language support for all AI outputs (RTL) | 🔴 Must Have | High |

**FR-AI-001 — AI Thread Writer Specification:**

```
Input:
  - topic: string (Arabic or English)
  - tone: enum [professional, casual, educational, inspirational, funny, viral]
  - tweet_count: integer (3–15)
  - language: enum [ar, en]

Process:
  - Call OpenAI GPT-4o with structured prompt
  - Return array of tweet strings
  - Each tweet max 260 chars (buffer for numbering)

Output:
  - Array of tweet card objects ready to load into thread builder
  - Generation time: < 10 seconds
  - Output is fully editable before publishing
```

**Available AI Tones:**

| Tone | Description | Best For |
|------|-------------|----------|
| Professional | Formal, authoritative, data-backed | Business, finance, B2B |
| Casual | Conversational, friendly, relatable | Lifestyle, personal brand |
| Educational | Clear, structured, informative | How-to, explainers |
| Inspirational | Motivational, uplifting, emotional | Personal development |
| Funny | Witty, humorous, entertaining | Entertainment, memes |
| Viral/Hook | Curiosity-driven opener, list format | Max reach content |

**FR-AI-005 — Amazon Affiliate Tweet Generator Specification:**

```
Input:
  - amazon_url: string (supports .com, .sa, .ae, .co.uk)
  - affiliate_tag: string (user's Amazon Associates tag)

Process:
  1. Parse ASIN from URL
  2. Call Amazon PA API to fetch: title, image, price, description
  3. Reconstruct affiliate URL with user's tag
  4. Call OpenAI to generate promotional tweet (Arabic/English)

Output:
  - Generated tweet text with embedded affiliate link
  - Product image attached
  - One-click "Schedule this tweet" CTA
```

---

### 6.6 Analytics Module

| ID | Requirement | Priority | Effort |
|----|-------------|----------|--------|
| FR-ANAL-001 | Per-tweet metrics: impressions, likes, retweets, replies, link clicks | 🔴 Must Have (Pro) | High |
| FR-ANAL-002 | Engagement rate % calculation per tweet | 🔴 Must Have (Pro) | Low |
| FR-ANAL-003 | Aggregate dashboard (7/30/90-day overview) | 🔴 Must Have (Pro) | High |
| FR-ANAL-004 | Top 5 performing tweets ranking | 🟠 Should Have (Pro) | Medium |
| FR-ANAL-005 | Best performing day of week chart | 🟠 Should Have (Pro) | Medium |
| FR-ANAL-006 | Export analytics as CSV or PDF | 🟠 Should Have (Pro) | Medium |
| FR-ANAL-007 | Follower growth tracker (line chart) | 🟢 Nice to Have (Phase 2) | Medium |
| FR-ANAL-008 | Impressions/engagement trend line chart | 🟠 Should Have | Medium |

> **Data Source:** X API v2 — tweet metrics endpoint. Update frequency: every 6 hours.

---

### 6.7 Subscription & Billing Module

| ID | Requirement | Priority | Effort |
|----|-------------|----------|--------|
| FR-BILL-001 | Stripe Checkout for Pro Monthly + Pro Annual plans | 🔴 Must Have | High |
| FR-BILL-002 | Supports: Credit/Debit, Apple Pay, Google Pay | 🔴 Must Have | Low |
| FR-BILL-003 | Plan upgrade, downgrade, cancel from billing settings | 🔴 Must Have | Medium |
| FR-BILL-004 | Cancellation effective at end of billing period | 🔴 Must Have | Low |
| FR-BILL-005 | Invoice history with PDF download | 🟠 Should Have | Low |
| FR-BILL-006 | Automated dunning: 3 retry attempts over 7 days on failed payment | 🔴 Must Have | Medium |
| FR-BILL-007 | Account downgraded to Free after 7-day grace period on non-payment | 🔴 Must Have | Medium |
| FR-BILL-008 | Coupon/discount code support (% or fixed amount) | 🟠 Should Have | Low |
| FR-BILL-009 | Stripe webhook handling for all subscription lifecycle events | 🔴 Must Have | High |

---

### 6.8 Notification Module

| ID | Requirement | Type | Trigger | Priority |
|----|-------------|------|---------|----------|
| FR-NOTIF-001 | Welcome email | Email | User registration | 🔴 Must Have |
| FR-NOTIF-002 | Schedule confirmation | Email | Tweet scheduled | 🔴 Must Have |
| FR-NOTIF-003 | Publish failure alert | Email + In-app | Tweet fails to publish | 🔴 Must Have |
| FR-NOTIF-004 | Monthly performance digest | Email | 1st of each month | 🟠 Should Have |
| FR-NOTIF-005 | Subscription renewal reminder | Email | 3 days before renewal | 🔴 Must Have |
| FR-NOTIF-006 | Plan upgraded confirmation | Email + In-app | Stripe payment success | 🔴 Must Have |
| FR-NOTIF-007 | In-app bell icon notification feed | In-app | All events | 🟠 Should Have |
| FR-NOTIF-008 | AI generation complete | In-app | AI output ready | 🟢 Nice to Have |

---

### 6.9 Admin Dashboard Module

| ID | Requirement | Priority | Effort |
|----|-------------|----------|--------|
| FR-ADMIN-001 | User list with filter by plan, join date, activity status | 🔴 Must Have | High |
| FR-ADMIN-002 | Manually upgrade/downgrade user plans | 🔴 Must Have | Medium |
| FR-ADMIN-003 | Suspend or ban accounts | 🔴 Must Have | Medium |
| FR-ADMIN-004 | Platform metrics: total users, MRR, churn rate, tweets scheduled | 🔴 Must Have | High |
| FR-ADMIN-005 | X API usage tracker (rate limit monitoring) | 🔴 Must Have | Medium |
| FR-ADMIN-006 | Error log viewer for failed publish jobs | 🔴 Must Have | Medium |
| FR-ADMIN-007 | Content moderation flag system | 🟠 Should Have | Medium |
| FR-ADMIN-008 | Feature flag management (enable/disable features per user) | 🟠 Should Have | Medium |

---

## 7. Non-Functional Requirements

### 7.1 Performance Requirements

| Requirement | Target | Notes |
|-------------|--------|-------|
| Page Load Time (LCP) | < 2.5 seconds | Core Web Vitals compliant |
| API Response Time (P95) | < 500ms | All internal endpoints |
| Tweet Publishing Latency | ± 30 seconds of scheduled time | BullMQ cron accuracy |
| Concurrent Users Supported | 5,000 simultaneous | Phase 1 capacity target |
| System Uptime SLA | 99.9% | < 44 minutes downtime/month |
| Database Query Time (P95) | < 100ms | Indexed queries only |
| AI Thread Generation Time | < 10 seconds | GPT-4o response target |
| Media Upload Processing | < 30 seconds | Images; up to 2 min for video |

---

### 7.2 Security Requirements

- **Transport Security:** HTTPS/TLS 1.3 enforced on all connections; HTTP redirects to HTTPS
- **Authentication:** OAuth 2.0 PKCE for X login; JWT with 15-minute access token + refresh token rotation
- **Data Encryption:** AES-256 encryption for stored OAuth tokens and refresh tokens at rest
- **Input Security:** All user inputs sanitized; XSS and SQL injection prevention via ORM parameterized queries
- **Rate Limiting:** 100 API requests/minute per user IP; 1,000/hour per authenticated user
- **OWASP Compliance:** Full OWASP Top 10 audit required before launch
- **Secrets Management:** All API keys stored in environment variables / AWS Secrets Manager; never committed to code
- **PCI DSS Compliance:** Via Stripe — no card data ever stored on AstraPost servers
- **Vulnerability Scanning:** Automated weekly security scans (Snyk or similar)
- **Penetration Testing:** Required before Phase 1 launch and annually thereafter

---

### 7.3 Scalability Requirements

- **Architecture:** Containerized microservices (Docker + Kubernetes)
- **Job Queue:** BullMQ with Redis for reliable tweet publishing jobs
- **CDN:** Cloudflare for static assets and media delivery + DDoS protection
- **Database:** Read replicas for analytics queries (separate from write database)
- **Auto-Scaling:** CPU/memory threshold-based auto-scaling on all backend services
- **Queue Scaling:** Multiple BullMQ worker instances for high-volume scheduling periods

---

### 7.4 Usability Requirements

- **Bilingual UI:** Full Arabic RTL and English LTR support with one-click language toggle in header
- **Accessibility:** WCAG 2.1 AA compliance (keyboard navigation, screen reader support, color contrast)
- **Responsive Design:** Breakpoints: 320px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop)
- **Onboarding:** 4-step guided wizard for new users (Connect X → Compose → Schedule → Explore AI)
- **Navigation Depth:** Maximum 3 clicks to reach any core feature
- **Empty States:** Helpful illustrated empty states with actionable CTAs for first-time users
- **Error Messages:** All error messages in user's selected language (Arabic/English); actionable, not cryptic

---

### 7.5 Reliability Requirements

- **Publishing Success Rate:** 99.5%+ scheduled tweet delivery success
- **Failure Handling:** Auto-retry (3 attempts, 5-minute intervals); user alerted on final failure
- **Logging:** All publish failures logged with full error context to admin dashboard
- **Database Backups:** Daily full backup + hourly incremental; 30-day retention policy
- **Disaster Recovery:** RTO (Recovery Time Objective): < 4 hours; RPO (Recovery Point Objective): < 1 hour

---

### 7.6 Compliance Requirements

| Regulation | Requirement | Applicability |
|-----------|-------------|---------------|
| X API Terms of Service | No artificial engagement; respect rate limits; transparent automation disclosure | All users |
| GDPR | Data deletion on request, privacy policy, data portability | EU users |
| PDPL | Saudi Arabia Personal Data Protection Law compliance | Saudi users |
| CAN-SPAM Act | Unsubscribe links in all marketing emails | All email recipients |
| CCPA | California Consumer Privacy Act compliance | California users |

---

## 8. System Architecture & Tech Stack

### 8.1 Full Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend Framework** | Next.js 14 (React) | SSR/SSG, SEO, App Router, Edge Network |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, consistent design system |
| **State Management** | Zustand + TanStack Query | Lightweight global state + async data caching |
| **Backend Framework** | Node.js + Fastify | High throughput, low latency, JS ecosystem |
| **Primary Database** | PostgreSQL (via Supabase) | Relational, scalable, built-in auth + RLS |
| **Cache / Sessions** | Redis (Upstash serverless) | Session cache, rate limiting, queue backend |
| **File Storage** | Cloudflare R2 (or AWS S3) | Media storage; R2 = zero egress fees |
| **CDN** | Cloudflare | Static assets, media delivery, DDoS protection |
| **Job Queue** | BullMQ (Redis-based) | Reliable scheduled tweet publishing jobs |
| **AI Integration** | OpenAI API (GPT-4o) | Thread writer, tweet improvement, affiliate copy |
| **X API Integration** | X API v2 (OAuth 2.0 PKCE) | Publishing, analytics, user data |
| **Payment Processing** | Stripe | Subscriptions, billing, invoices, webhooks |
| **Email Service** | Resend (or SendGrid) | Transactional + marketing emails |
| **Authentication** | NextAuth.js + Supabase Auth | OAuth + JWT management |
| **Frontend Hosting** | Vercel | Auto-scaling, edge network, Next.js native |
| **Backend Hosting** | Railway (or AWS ECS) | Containerized backend + worker services |
| **Monitoring** | Sentry + Datadog | Error tracking, APM, uptime monitoring |
| **CI/CD** | GitHub Actions | Automated testing, linting, deployment |
| **Analytics (Internal)** | PostHog | Product analytics, funnel tracking, feature flags |

---

### 8.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│           Next.js 14 Frontend (Vercel Edge Network)             │
│           Arabic RTL / English LTR — Responsive                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST API
┌──────────────────────────▼──────────────────────────────────────┐
│                       API GATEWAY                               │
│              Fastify REST API + Rate Limiting                   │
│              Auth Middleware (JWT Validation)                    │
└──────┬──────────┬──────────┬──────────┬───────────┬────────────┘
       │          │          │          │           │
  ┌────▼───┐ ┌───▼───┐ ┌───▼────┐ ┌──▼─────┐ ┌──▼──────┐
  │  Auth  │ │ Tweet │ │Sched.  │ │  AI    │ │Billing  │
  │Service │ │Service│ │Service │ │Service │ │Service  │
  └────┬───┘ └───┬───┘ └───┬────┘ └──┬─────┘ └──┬──────┘
       │         │          │         │           │
┌──────▼─────────▼──────────▼─────────▼───────────▼──────────────┐
│                        DATA LAYER                               │
│   PostgreSQL (primary R/W)    Redis (cache + queue)             │
│   Cloudflare R2 (media)       Analytics DB (read replica)       │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                         │
│   X API v2     OpenAI API     Stripe API     Amazon PA API      │
│   Resend Email  Cloudflare    Supabase Auth  PostHog Analytics  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8.3 Tweet Publishing Flow

```
User schedules tweet
        │
        ▼
POST /api/posts → saved to PostgreSQL (status: 'scheduled')
        │
        ▼
BullMQ job created with delayed execution (fires at scheduled_at time)
        │
        ▼
At scheduled_at time → Worker picks up job
        │
        ├─► Upload media to X API (if media attached)
        │         └─► X returns media_id(s)
        │
        ├─► POST tweet(s) to X API v2
        │
        ├─[SUCCESS]─► Update post status: 'published'
        │             Store x_tweet_id in tweets table
        │             Send in-app notification to user
        │
        └─[FAILURE]─► Increment retry_count
                      If retry_count < 3: Re-queue with 5-min delay
                      If retry_count >= 3: Update status 'failed'
                      Send failure email + in-app alert to user
                      Log error to admin dashboard
```

---

## 9. Database Schema

### 9.1 Core Tables

#### Table: `users`

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) UNIQUE,
  display_name      VARCHAR(100),
  avatar_url        TEXT,
  timezone          VARCHAR(50) DEFAULT 'Asia/Riyadh',
  language          VARCHAR(5)  DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  plan              VARCHAR(20) DEFAULT 'free' 
                    CHECK (plan IN ('free', 'pro_monthly', 'pro_annual', 'agency')),
  plan_expires_at   TIMESTAMP WITH TIME ZONE,
  stripe_customer_id VARCHAR(100),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

#### Table: `x_accounts`

```sql
CREATE TABLE x_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x_user_id        VARCHAR(50) UNIQUE NOT NULL,
  x_username       VARCHAR(50) NOT NULL,
  x_display_name   VARCHAR(100),
  x_avatar_url     TEXT,
  access_token     TEXT NOT NULL,          -- AES-256 encrypted
  refresh_token    TEXT,                   -- AES-256 encrypted
  token_expires_at TIMESTAMP WITH TIME ZONE,
  followers_count  INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_x_accounts_user_id ON x_accounts(user_id);
```

---

#### Table: `posts`

```sql
CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x_account_id    UUID NOT NULL REFERENCES x_accounts(id) ON DELETE CASCADE,
  type            VARCHAR(10) DEFAULT 'tweet' CHECK (type IN ('tweet', 'thread')),
  status          VARCHAR(20) DEFAULT 'draft'
                  CHECK (status IN ('draft', 'scheduled', 'published', 'failed', 'cancelled')),
  scheduled_at    TIMESTAMP WITH TIME ZONE,
  published_at    TIMESTAMP WITH TIME ZONE,
  fail_reason     TEXT,
  retry_count     INTEGER DEFAULT 0,
  ai_generated    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at);
```

---

#### Table: `tweets`

```sql
CREATE TABLE tweets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) <= 280),
  position    INTEGER NOT NULL DEFAULT 1,  -- order within thread
  x_tweet_id  VARCHAR(50),                 -- returned by X API after publishing
  media_ids   JSONB DEFAULT '[]',          -- array of media UUIDs
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tweets_post_id ON tweets(post_id);
CREATE UNIQUE INDEX idx_tweets_post_position ON tweets(post_id, position);
```

---

#### Table: `media`

```sql
CREATE TABLE media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tweet_id    UUID REFERENCES tweets(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_type   VARCHAR(10) CHECK (file_type IN ('image', 'video', 'gif')),
  file_size   INTEGER,          -- bytes
  x_media_id  VARCHAR(50),      -- X API media upload ID
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

#### Table: `tweet_analytics`

```sql
CREATE TABLE tweet_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id        UUID NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  x_tweet_id      VARCHAR(50) NOT NULL,
  impressions     INTEGER DEFAULT 0,
  likes           INTEGER DEFAULT 0,
  retweets        INTEGER DEFAULT 0,
  replies         INTEGER DEFAULT 0,
  link_clicks     INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5, 2) DEFAULT 0.00,
  fetched_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_tweet_id ON tweet_analytics(tweet_id);
CREATE INDEX idx_analytics_fetched_at ON tweet_analytics(fetched_at);
```

---

#### Table: `ai_generations`

```sql
CREATE TABLE ai_generations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(20) CHECK (type IN ('thread', 'tweet_improve', 'affiliate')),
  input_prompt    TEXT,
  output_content  JSONB,
  tone            VARCHAR(30),
  language        VARCHAR(5) DEFAULT 'ar',
  tokens_used     INTEGER,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_gen_user_id ON ai_generations(user_id);
```

---

#### Table: `subscriptions`

```sql
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id  VARCHAR(100) UNIQUE NOT NULL,
  stripe_price_id         VARCHAR(100),
  plan                    VARCHAR(20),
  status                  VARCHAR(20) CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start    TIMESTAMP WITH TIME ZONE,
  current_period_end      TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,
  cancelled_at            TIMESTAMP WITH TIME ZONE,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

#### Table: `affiliate_links`

```sql
CREATE TABLE affiliate_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amazon_product_url  TEXT NOT NULL,
  amazon_asin         VARCHAR(20),
  product_title       VARCHAR(500),
  product_image_url   TEXT,
  product_price       DECIMAL(10, 2),
  product_currency    VARCHAR(5) DEFAULT 'USD',
  affiliate_tag       VARCHAR(100),
  generated_tweet     TEXT,
  was_scheduled       BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

#### Table: `notifications`

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       TEXT,
  message     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

---

## 10. User Stories & Acceptance Criteria

### Epic 1: Account Setup & Onboarding

---

**US-001 — Connect X Account**
> *As a new user, I want to connect my X account with one click so that I can start scheduling without any technical complexity.*

| Field | Detail |
|-------|--------|
| Priority | 🔴 Must Have |
| Story Points | 5 |
| Acceptance Criteria | OAuth flow completes < 5 seconds; X profile data (username, avatar, followers) stored; user lands on dashboard with "Account Connected ✅" indicator |
| Edge Cases | User denies OAuth permission → Show clear error with retry CTA; Token expires → Prompt re-authentication |

---

**US-002 — Complete Onboarding**
> *As a new user, I want to be guided through the setup so that I understand how to use AstraPost immediately.*

| Field | Detail |
|-------|--------|
| Priority | 🟠 Should Have |
| Story Points | 3 |
| Acceptance Criteria | 4-step wizard shown on first login; Steps: Connect X → Compose first tweet → Schedule it → Explore AI; Skippable at any step; Shows progress bar |

---

### Epic 2: Content Scheduling

---

**US-003 — Schedule a Single Tweet**
> *As a content creator, I want to write a tweet and schedule it for tomorrow at 9am so that it publishes while I'm sleeping.*

| Field | Detail |
|-------|--------|
| Priority | 🔴 Must Have |
| Story Points | 8 |
| Acceptance Criteria | Composer opens; character counter updates in real-time; date/time picker shows user's timezone; confirmation screen shown; tweet appears in queue with status "Scheduled"; publishes within ±30 seconds of scheduled time |

---

**US-004 — Build and Schedule a Thread**
> *As a content creator, I want to create a 7-tweet thread so that I can publish long-form content on X.*

| Field | Detail |
|-------|--------|
| Priority | 🔴 Must Have |
| Story Points | 13 |
| Acceptance Criteria | Can add up to 25 cards; each card has independent 280-char counter; drag-and-drop reorder works; thread preview shows correct numbering (1/7, 2/7...); publishes in exact sequential order via X reply chain |

---

**US-005 — Attach Media to a Tweet**
> *As a creator, I want to attach an image and a GIF to my tweet so that it stands out in the feed.*

| Field | Detail |
|-------|--------|
| Priority | 🔴 Must Have |
| Story Points | 8 |
| Acceptance Criteria | Drag-and-drop or click to upload; image: up to 4 per tweet, max 5MB; GIF: 1 per tweet, max 15MB; preview thumbnails shown; file type/size validation error shown if exceeded |

---

### Epic 3: AI Features

---

**US-006 — Generate a Thread with AI**
> *As a Pro user, I want to input "productivity tips for Arabic students" and get a 5-tweet thread so that I save 30 minutes of writing.*

| Field | Detail |
|-------|--------|
| Priority | 🔴 Must Have (Pro) |
| Story Points | 13 |
| Acceptance Criteria | Topic field + tone dropdown + count slider (3–15) displayed; "Generate" button triggers AI; output appears in < 10 seconds; tweets load into thread builder as editable cards; Arabic text displays with correct RTL alignment |

---

**US-007 — Generate an Amazon Affiliate Tweet**
> *As an affiliate marketer, I want to paste an Amazon product URL and get a ready-to-post promotional tweet with my affiliate link.*

| Field | Detail |
|-------|--------|
| Priority | 🔴 Must Have (Pro) |
| Story Points | 13 |
| Acceptance Criteria | Amazon URL input field; "Fetch Product" shows product title, image, price; AI generates promotional tweet with affiliate link; one-click "Schedule This" opens scheduler pre-populated with tweet + image; works with Amazon .com, .sa, .ae, .co.uk |

---

### Epic 4: Analytics

---

**US-008 — View Tweet Performance**
> *As a Pro user, I want to see how my tweets performed so that I know what content resonates with my audience.*

| Field | Detail |
|-------|--------|
| Priority | 🔴 Must Have (Pro) |
| Story Points | 8 |
| Acceptance Criteria | Analytics page shows per-tweet: impressions, likes, retweets, replies, link clicks, engagement rate %; sortable table; 7/30/90 day filter; data refreshes every 6 hours |

---

**US-009 — Export Analytics Report**
> *As a social media manager, I want to export a 30-day analytics report as PDF so that I can share it with my client.*

| Field | Detail |
|-------|--------|
| Priority | 🟠 Should Have (Pro) |
| Story Points | 5 |
| Acceptance Criteria | "Export" button on analytics page; options: CSV or PDF; PDF includes AstraPost branding, date range, all metric tables; downloads within 10 seconds |

---

### Epic 5: Billing

---

**US-010 — Upgrade to Pro Plan**
> *As a Free user, I want to upgrade to Pro so that I can schedule unlimited tweets and use the AI features.*

| Field | Detail |
|-------|--------|
| Priority | 🔴 Must Have |
| Story Points | 8 |
| Acceptance Criteria | Billing page shows Free vs Pro comparison; "Upgrade" CTA opens Stripe Checkout; payment processed; plan updated in real-time (no page refresh needed); confirmation email sent within 2 minutes; all Pro features immediately unlocked |

---

## 11. Wireframe Descriptions

### 11.1 Landing Page `/`

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                  │
│ [🚀 AstraPost Logo]  Features  Pricing  FAQ   [Start Free]│
├─────────────────────────────────────────────────────────┤
│ HERO SECTION                                            │
│                                                         │
│   توقّف عن إضاعة ساعاتك في انتظار الوقت المناسب        │
│   AstraPost schedules your tweets automatically         │
│                                                         │
│   [🚀 Start Free — No Credit Card]  [▶ See How It Works] │
│                                                         │
│   ⭐ 1,000+ creators  |  50,000+ tweets  |  🔒 Secure   │
├─────────────────────────────────────────────────────────┤
│ PAIN POINTS (3 columns)                                 │
│  😤 Wasting hours    💡 Losing ideas    📉 Low engagement│
├─────────────────────────────────────────────────────────┤
│ FEATURES GRID (2x3 cards)                               │
│  ⏰ Auto Schedule  🧵 Threads   📷 Media                │
│  📝 Drafts         🌍 Timezone  ⚡ Instant Publish      │
├─────────────────────────────────────────────────────────┤
│ PRO FEATURES (highlighted blue background)              │
│  🤖 AI Thread Writer  🛒 Affiliate Generator            │
├─────────────────────────────────────────────────────────┤
│ HOW IT WORKS (3 steps)                                  │
│  1️⃣ Connect X  →  2️⃣ Compose  →  3️⃣ Schedule & Relax  │
├─────────────────────────────────────────────────────────┤
│ TESTIMONIALS (3 user cards)                             │
├─────────────────────────────────────────────────────────┤
│ PRICING (3-column table: Free | Pro Monthly | Pro Annual)│
├─────────────────────────────────────────────────────────┤
│ FAQ (accordion, 8–10 questions)                         │
├─────────────────────────────────────────────────────────┤
│ FOOTER: Links | Social | Privacy Policy | Terms         │
└─────────────────────────────────────────────────────────┘
```

---

### 11.2 Dashboard `/dashboard`

```
┌──────────┬──────────────────────────────────────────────┐
│ SIDEBAR  │  TOPBAR: [X Account Selector] [Timezone] [👤]│
│          ├──────────────────────────────────────────────┤
│ 🚀 Logo  │  👋 Welcome back, Ahmed!                     │
│          │                                              │
│ 📊 Dash  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ ✏️ Compose│  │Today │ │Sched.│ │Pub.  │ │Eng.% │       │
│ 🗂 Queue  │  │  3   │ │  12  │ │  47  │ │ 4.2% │       │
│ 📝 Drafts│  └──────┘ └──────┘ └──────┘ └──────┘       │
│ 📈 Analytics│                                           │
│ 🤖 AI    │  UPCOMING QUEUE (next 5 scheduled)           │
│ 🛒 Affiliate│ [Tweet preview] [Time] [Edit] [Delete]   │
│ ⚙️ Settings│                                            │
│          │  QUICK COMPOSE (inline mini composer)        │
│          │  [What's on your mind?        ] [Schedule]   │
│          │                                              │
│          │  TOP PERFORMING TWEETS (last 7 days)         │
│          │  [Tweet 1 preview] [Metrics summary]         │
└──────────┴──────────────────────────────────────────────┘
```

---

### 11.3 Compose Screen `/compose`

```
┌──────────────────────────────┬─────────────────────────┐
│   COMPOSER (Left Panel)      │  LIVE PREVIEW (Right)    │
│                              │                          │
│ ○ Single Tweet  ● Thread     │  ┌───────────────────┐   │
│                              │  │ 👤 @username      │   │
│ ┌──────────────────────────┐ │  │                   │   │
│ │ Tweet 1           245/280│ │  │ Your tweet text   │   │
│ │ Write your tweet here... │ │  │ appears here in   │   │
│ │                          │ │  │ real X format     │   │
│ │ [📷][🎬][GIF][😊][🔗]    │ │  │                   │   │
│ └──────────────────────────┘ │  │ [Image preview]   │   │
│ [+ Add Tweet Card]           │  └───────────────────┘   │
│                              │                          │
│ [🤖 AI Assist] (Pro badge)   │  Thread card 2 preview   │
│                              │                          │
│ ─────────────────────────── │                          │
│ [💾 Save Draft] [📅 Schedule] [⚡ Publish Now]         │
└──────────────────────────────┴─────────────────────────┘
```

---

### 11.4 Queue Screen `/queue`

```
┌────────────────────────────────────────────────────────┐
│ FILTER: [All ▼]  [Scheduled ▼]  [Published ▼]  [Failed]│
│ DATE RANGE: [Mar 1 - Mar 31]           [+ New Post]     │
├────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐    │
│ │ [🟦 Thread] "5 productivity tips every Arab..."  │    │
│ │ 📅 Mar 12, 2026 at 9:00 AM (GST)  ⏳ Scheduled  │    │
│ │ [📷 1 Image]    [Edit] [Reschedule] [Delete]     │    │
│ └─────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────┐    │
│ │ [🟩 Tweet] "Just found the best Amazon deal..." │    │
│ │ 📅 Mar 12, 2026 at 2:00 PM (GST)  ⏳ Scheduled  │    │
│ │ [🛒 Affiliate]   [Edit] [Reschedule] [Delete]   │    │
│ └─────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────┐    │
│ │ [🔴 Tweet] "Check out this interesting thread"  │    │
│ │ 📅 Mar 10, 2026 at 8:00 PM (GST)  ❌ Failed     │    │
│ │ Reason: X API rate limit exceeded               │    │
│ │ [Retry Now] [Edit] [Delete]                     │    │
│ └─────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

---

### 11.5 Analytics Screen `/analytics` *(Pro Only)*

```
┌────────────────────────────────────────────────────────┐
│ ANALYTICS OVERVIEW        Filter: [7d] [30d] [90d]     │
├──────────┬──────────────┬──────────────┬───────────────┤
│Total Imp.│ Total Engage.│ Avg Eng. Rate│ Best Day      │
│ 124,500  │   5,230      │    4.2%      │ Wednesday     │
├──────────┴──────────────┴──────────────┴───────────────┤
│ IMPRESSIONS OVER TIME (Line Chart)                     │
│ ↑                                                      │
│ |    ∧        ∧                                        │
│ |   / \  /\  / \                                       │
│ |__/   \/  \/   \______                                │
│ └──────────────────────────────→ Date                  │
├────────────────────────────────────────────────────────┤
│ TOP PERFORMING TWEETS                  [Export CSV/PDF] │
│ ┌─────────────────────────────────────────────────┐   │
│ │ "Thread: 7 habits of successful Arab creators" │   │
│ │ Impressions: 18,240  Likes: 842  RT: 234  ER:4.6%│  │
│ └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

### 11.6 AI Writer Screen `/ai-writer` *(Pro Only)*

```
┌────────────────────────────────────────────────────────┐
│ 🤖 AI WRITER                                           │
│ [Thread Writer Tab]  [Affiliate Generator Tab]         │
├────────────────────────────────────────────────────────┤
│ THREAD WRITER                                          │
│                                                        │
│ Topic: [نصائح الإنتاجية للطلاب العرب               ]  │
│ Tone:  [Educational ▼]   Tweets: [──●──] 7             │
│ Language: [Arabic ▼]                                   │
│                                                        │
│                      [🚀 Generate Thread]              │
│                                                        │
│ OUTPUT:                                                │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Tweet 1/7: "هل تعاني من التشتت أثناء الدراسة؟..." │ │
│ │ [Edit] ✓                              254/280     │  │
│ ├──────────────────────────────────────────────────┤  │
│ │ Tweet 2/7: "إليك 7 عادات تغيّر حياتك الأكاديمية"│  │
│ │ [Edit] ✓                              198/280     │  │
│ └──────────────────────────────────────────────────┘  │
│                [Add to Composer & Schedule]            │
└────────────────────────────────────────────────────────┘
```

---

### 11.7 Settings Screen `/settings`

```
┌────────────────────────────────────────────────────────┐
│ SETTINGS                                               │
│ [Profile] [Connected Accounts] [Billing] [Notifications│
│          ] [Security] [Danger Zone]                    │
├────────────────────────────────────────────────────────┤
│ PROFILE TAB                                            │
│ Display Name: [Ahmed Al-Mansouri          ]            │
│ Email:        [ahmed@example.com          ]            │
│ Language:     [ Arabic (AR) ▼ ]                        │
│ Timezone:     [ Asia/Riyadh (GMT+3) ▼ ]               │
│ Avatar:       [Upload Photo]                           │
│                                  [Save Changes]        │
├────────────────────────────────────────────────────────┤
│ BILLING TAB                                            │
│ Current Plan: Pro Monthly ($19.99/month)               │
│ Next Billing: April 9, 2026                            │
│ [Upgrade to Annual — Save $90] [Cancel Plan]           │
│ Past Invoices: [March 2026 — $19.99 — Download PDF]    │
├────────────────────────────────────────────────────────┤
│ DANGER ZONE (red background)                           │
│ [Delete Account and All Data]                          │
│ ⚠️ This action is permanent and cannot be undone       │
└────────────────────────────────────────────────────────┘
```

---

## 12. API Requirements & Integrations

### 12.1 Internal REST API Endpoints

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/x` | Initiate X OAuth 2.0 PKCE flow |
| `GET` | `/api/auth/x/callback` | Handle X OAuth callback |
| `POST` | `/api/auth/logout` | Logout and invalidate session |
| `GET` | `/api/auth/me` | Get current authenticated user profile |

#### Posts & Tweets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/posts` | Create new post (tweet or thread) |
| `GET` | `/api/posts` | List all posts (filter: status, date range) |
| `GET` | `/api/posts/:id` | Get single post with all tweets |
| `PUT` | `/api/posts/:id` | Update post content or scheduled time |
| `DELETE` | `/api/posts/:id` | Delete post (and cancel scheduled job) |
| `POST` | `/api/posts/:id/publish` | Immediately publish post to X |
| `POST` | `/api/posts/:id/reschedule` | Reschedule post to new datetime |

#### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/overview` | Aggregate stats (impressions, engagement) |
| `GET` | `/api/analytics/tweets` | Per-tweet performance data (paginated) |
| `GET` | `/api/analytics/export` | Export analytics as CSV or PDF |

#### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/thread` | Generate thread (body: topic, tone, count, language) |
| `POST` | `/api/ai/improve` | Improve single tweet text |
| `POST` | `/api/ai/affiliate` | Generate affiliate tweet from Amazon URL |
| `GET` | `/api/ai/history` | Get last 20 AI generation outputs |

#### Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/billing/checkout` | Create Stripe Checkout session |
| `POST` | `/api/billing/webhook` | Handle Stripe webhook events |
| `GET` | `/api/billing/subscription` | Get current subscription details |
| `GET` | `/api/billing/invoices` | Get invoice history |
| `POST` | `/api/billing/cancel` | Cancel subscription at period end |
| `POST` | `/api/billing/portal` | Create Stripe Customer Portal session |

---

### 12.2 External API Integrations

#### X (Twitter) API v2

| Detail | Value |
|--------|-------|
| Auth Method | OAuth 2.0 PKCE |
| API Tier Required | Basic ($100/month — 50,000 writes/month) |
| Key Endpoints | `POST /2/tweets`, `GET /2/tweets/:id`, `POST /1.1/media/upload`, `GET /2/users/me` |
| Rate Limits | 50,000 tweet writes/month on Basic tier |
| Publishing Threads | POST first tweet → POST replies using `reply.in_reply_to_tweet_id` |
| Analytics Data | `GET /2/tweets/:id?tweet.fields=public_metrics` |

**X API Cost Estimation:**

| Users | Tweets/Month/User | Total Monthly Tweets | Required Tier | Cost |
|-------|------------------|----------------------|---------------|------|
| 100 | 100 | 10,000 | Basic | $100 |
| 500 | 100 | 50,000 | Basic | $100 |
| 1,000 | 100 | 100,000 | Pro | $5,000 |

> ⚠️ **Risk:** X API pricing is volatile. Budget for Pro tier ($5,000/month) early. Build abstraction layer to swap providers if needed.

---

#### OpenAI API

| Detail | Value |
|--------|-------|
| Model | GPT-4o (primary), GPT-4o-mini (cost optimization) |
| Endpoint | `POST https://api.openai.com/v1/chat/completions` |
| Input Tokens | ~200 (system prompt + user input) |
| Output Tokens | ~800 (7-tweet thread) |
| Cost per Generation | ~$0.002 (GPT-4o-mini) to ~$0.02 (GPT-4o) |
| Monthly Limit (Pro) | 50 generations/user |

**Example Thread Generation Prompt:**

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are an expert Arabic social media content writer for X (Twitter). Write engaging threads that follow Arabic cultural norms and X best practices. Each tweet must be under 260 characters (leaving room for numbering). Return a JSON array of tweet strings."
    },
    {
      "role": "user",
      "content": "Write a 7-tweet educational thread in Arabic about: نصائح الإنتاجية للطلاب العرب. Tone: educational. Language: Arabic."
    }
  ],
  "response_format": { "type": "json_object" }
}
```

---

#### Stripe API

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate Pro plan for user |
| `customer.subscription.updated` | Update plan status in database |
| `customer.subscription.deleted` | Downgrade user to Free plan |
| `invoice.payment_failed` | Trigger dunning email sequence |
| `invoice.payment_succeeded` | Confirm renewal, send receipt email |

**Stripe Products to Create:**

```
Product: AstraPost Pro
  Price 1: pro_monthly — $19.99/month — recurring
  Price 2: pro_annual  — $149.00/year — recurring
```

---

#### Amazon Product Advertising API (PA API 5.0)

| Detail | Value |
|--------|-------|
| Endpoint | `https://webservices.amazon.{region}/paapi5/getitems` |
| Auth | AWS Signature Version 4 |
| Required Fields | `ItemIds` (ASIN), `Resources`: Title, Images, Offers |
| Supported Regions | amazon.com, amazon.sa, amazon.ae, amazon.co.uk, amazon.de |
| Prerequisite | Approved Amazon Associates account + 3 qualified sales |

---

## 13. Pricing Strategy & Monetization

### 13.1 Pricing Plans

#### 🆓 Free Plan — $0/month
*Target: New users, students, casual creators*

| Feature | Limit |
|---------|-------|
| Scheduled tweets/month | 5 |
| Advance scheduling window | 7 days |
| Media support | Images only |
| Threads | ❌ Not included |
| Drafts | Unlimited |
| Analytics | Last 7 days, views only |
| AI Thread Writer | ❌ Not included |
| Affiliate Generator | ❌ Not included |
| Support | Community only |

---

#### ⭐ Pro Monthly — $19.99/month
*Target: Active content creators, influencers, solo marketers*

| Feature | Limit |
|---------|-------|
| Scheduled tweets/month | Unlimited |
| Advance scheduling window | 365 days |
| Media support | Images + Videos + GIFs |
| Threads | ✅ Up to 25 cards |
| Drafts | Unlimited |
| Analytics | Full 90-day history + export |
| AI Thread Writer | 50 generations/month |
| Affiliate Generator | Unlimited |
| Support | Priority email (< 24 hours) |

---

#### 🏆 Pro Annual — $149/year (~$12.42/month)
*Target: Committed creators, cost-conscious users*

| Feature | Limit |
|---------|-------|
| Everything in Pro Monthly | ✅ All included |
| Annual savings vs monthly | $90.88 saved |
| Priority support SLA | < 4 hours response |
| Early access to new features | ✅ Beta access |
| Exclusive community badge | ✅ |

---

#### 🏢 Agency Plan — $79/month *(Phase 2)*
*Target: Digital agencies, freelancers managing multiple clients*

| Feature | Limit |
|---------|-------|
| X Accounts | Up to 5 |
| Team members | Up to 3 users |
| Everything in Pro | ✅ All included |
| Client analytics exports | White-label PDF |
| Approval workflows | ✅ |
| Priority support | < 2 hours response |

---

### 13.2 Revenue Projections (12-Month Model)

| Month | Users | Pro Monthly | Pro Annual | MRR | ARR |
|-------|-------|------------|------------|-----|-----|
| 1 | 500 | 25 | 5 | $560 | $6,720 |
| 2 | 900 | 50 | 10 | $1,125 | $13,500 |
| 3 | 1,500 | 90 | 20 | $2,082 | $24,984 |
| 4 | 2,500 | 160 | 35 | $3,636 | $43,632 |
| 6 | 4,500 | 310 | 70 | $7,148 | $85,776 |
| 9 | 7,000 | 520 | 120 | $11,968 | $143,616 |
| 12 | 10,000 | 800 | 200 | $18,790 | $225,480 |

> **Note:** MRR calculated as: (Pro Monthly subscribers × $19.99) + (Pro Annual subscribers × $12.42)

---

### 13.3 Pricing Rationale

- **Free plan** is intentionally restrictive (5 tweets/month) to demonstrate value while creating a clear upgrade incentive
- **$19.99/month** is competitive vs Typefully ($19), Buffer ($18), Hypefury ($29) — positioned at market rate
- **Annual plan** at 38% savings maximizes LTV and reduces churn risk
- **Agency plan** unlocks 3–5x higher revenue per account compared to individual Pro

---

## 14. Security & Compliance

### 14.1 Authentication Security

```
┌─────────────────────────────────────────────────────────────┐
│ X OAuth 2.0 PKCE Flow                                       │
│                                                             │
│ 1. App generates code_verifier (random 128-char string)     │
│ 2. App computes code_challenge = SHA256(code_verifier)      │
│ 3. Redirect user to X with code_challenge                   │
│ 4. User authorizes → X returns authorization code          │
│ 5. App exchanges code + code_verifier for access_token      │
│ 6. Access token stored encrypted (AES-256) in database      │
│ 7. JWT issued to user (15-min expiry)                       │
│ 8. Refresh token rotated on each use (30-day expiry)        │
└─────────────────────────────────────────────────────────────┘
```

---

### 14.2 Data Security Standards

| Layer | Standard | Implementation |
|-------|----------|----------------|
| Transport | TLS 1.3 | Enforced on all endpoints; HTTP → HTTPS redirect |
| Tokens at Rest | AES-256 | X OAuth tokens encrypted before database storage |
| Passwords | bcrypt | Cost factor 12; salted hashes |
| API Keys | AWS Secrets Manager | Never in code or environment files in production |
| Database | Row-Level Security (RLS) | Supabase RLS policies per user |
| Payment Data | Stripe (PCI DSS) | No card data stored on AstraPost servers |

---

### 14.3 Privacy & Regulatory Compliance

| Regulation | Key Requirements | Implementation |
|-----------|-----------------|----------------|
| GDPR (EU) | Right to erasure, data portability, consent management | Account deletion purges all user data; Privacy policy; Cookie consent |
| PDPL (Saudi Arabia) | Local data processing consent, breach notification | Compliant data handling; 72-hour breach notification procedure |
| CAN-SPAM | Unsubscribe mechanism, sender identification | All emails include unsubscribe link; Physical address in footer |
| CCPA (California) | Data disclosure, opt-out of sale | Privacy policy section; No data selling |
| X API ToS | No artificial engagement, no scraping, automation disclosure | Removed engagement boost; Clear "Posted via AstraPost" attribution |

---

### 14.4 Security Checklist (Pre-Launch)

- [ ] OWASP Top 10 vulnerability audit completed
- [ ] Penetration testing completed by third party
- [ ] All API endpoints tested for authentication bypass
- [ ] SQL injection testing passed
- [ ] XSS testing passed on all input fields
- [ ] Rate limiting verified on all endpoints
- [ ] HTTPS enforced on all routes
- [ ] Security headers configured (HSTS, CSP, X-Frame-Options)
- [ ] Dependency vulnerability scan (Snyk) — zero critical issues
- [ ] Secrets audit — no API keys in codebase
- [ ] Stripe webhook signature verification implemented
- [ ] GDPR data deletion flow tested end-to-end

---

## 15. Risk Analysis & Mitigation

| ID | Risk | Probability | Impact | Severity | Mitigation |
|----|------|-------------|--------|----------|------------|
| RISK-001 | X API pricing increases beyond budget (as in 2023 when prices jumped 1,000x) | High | Critical | 🔴 Critical | Monitor weekly; maintain Basic tier budget buffer; build API abstraction layer for swap capability |
| RISK-002 | X Terms of Service violation → user account bans | Medium | High | 🔴 Critical | Legal review before launch; NO fake engagement; respect all rate limits; display "via AstraPost" attribution |
| RISK-003 | Low free-to-paid conversion (< 5%) | Medium | High | 🟠 High | In-app upgrade prompts at friction moments; 7-day Pro trial; improve free plan UX to show Pro value |
| RISK-004 | OpenAI API cost overrun from heavy AI usage | Medium | Medium | 🟠 High | Cap AI generations (50/month per Pro user); use GPT-4o-mini for simpler tasks; cache common prompts |
| RISK-005 | Security breach — OAuth token exposure | Low | Critical | 🟠 High | AES-256 encryption at rest; penetration testing; AWS Secrets Manager; incident response plan |
| RISK-006 | Competition from established players adding Arabic support | Medium | Medium | 🟡 Medium | Build cultural moat (Arabic-native UX, MENA features); community building; local partnerships |
| RISK-007 | Stripe unavailable in target MENA countries | Medium | Medium | 🟡 Medium | Add Paddle as backup processor; Add Moyasar (Saudi local gateway) in Phase 2 |
| RISK-008 | Scheduling engine failure — tweets not publishing | Low | High | 🟡 Medium | Redundant BullMQ workers; health check monitoring every 60 seconds; auto-retry + user alerts |
| RISK-009 | Amazon PA API rejected / suspended | Low | Low | 🟢 Low | Pre-qualify with 3 affiliate sales before launch; fallback: manual link insertion |
| RISK-010 | Key team member departure during development | Low | High | 🟡 Medium | Full documentation; code review standards; knowledge sharing sessions; contractor backup plan |

---

## 16. Project Timeline & Milestones

### 16.1 Phase 0 — Foundation (Weeks 1–2)

| Task | Owner | Duration |
|------|-------|----------|
| Project repository setup + CI/CD pipeline | Lead Engineer | 2 days |
| Database schema creation and migrations | Backend Engineer | 3 days |
| Design system setup (colors, typography, components) | UI/UX Designer | 3 days |
| Figma wireframes — all screens | UI/UX Designer | 5 days |
| X API developer account + app registration | Lead Engineer | 1 day |
| Stripe account setup + product/price configuration | Product Owner | 1 day |
| OpenAI API access + quota setup | AI Engineer | 1 day |

---

### 16.2 Phase 1 — MVP Development (Weeks 3–13)

**Weeks 3–4: Authentication & Onboarding**
- [ ] X OAuth 2.0 PKCE integration
- [ ] JWT session management
- [ ] User registration + database setup
- [ ] Onboarding wizard (4 steps)
- [ ] Account settings page
- [ ] Language toggle (AR/EN)

**Weeks 5–6: Tweet Composer**
- [ ] Single tweet composer with character counter
- [ ] Thread builder with drag-and-drop card reorder
- [ ] Media upload: images, video, GIF
- [ ] Emoji picker + link preview
- [ ] Live preview panel (real X tweet mockup)

**Weeks 7–8: Scheduling Engine**
- [ ] Date/time picker with timezone support
- [ ] BullMQ + Redis job queue setup
- [ ] X API publishing integration (single tweet + thread chain)
- [ ] Scheduled queue dashboard
- [ ] Edit/reschedule/delete from queue
- [ ] Retry logic (3x with 5-min delay)
- [ ] Failure alerting (email + in-app)

**Week 9: Draft Management**
- [ ] Save/load/delete drafts
- [ ] Draft library with search + sort
- [ ] Convert draft → scheduled post
- [ ] Auto-save every 30 seconds

**Week 10: AI Features (Pro)**
- [ ] OpenAI API integration
- [ ] AI Thread Writer with tone/count options
- [ ] Tweet improvement assistant
- [ ] Amazon Affiliate Tweet Generator
- [ ] Amazon PA API integration (multi-region)
- [ ] AI generation history

**Week 11: Billing & Subscriptions**
- [ ] Stripe Checkout integration
- [ ] Plan enforcement (Free limits, Pro unlimited)
- [ ] Subscription webhook handlers
- [ ] Billing settings UI
- [ ] Invoice history + PDF download
- [ ] Failed payment dunning flow

**Week 12: Analytics**
- [ ] X API v2 analytics polling (every 6 hours)
- [ ] Per-tweet metrics display
- [ ] Aggregate dashboard (7/30/90 days)
- [ ] Top performing tweets
- [ ] Export as CSV/PDF

**Week 13: Testing, Polish & Launch Prep**
- [ ] End-to-end testing (Playwright)
- [ ] Unit testing (Vitest) — 90%+ coverage on scheduling engine
- [ ] Performance optimization (LCP < 2.5s)
- [ ] Security audit (OWASP checklist)
- [ ] RTL/LTR layout QA
- [ ] Mobile responsiveness QA
- [ ] Load testing (5,000 concurrent users)
- [ ] Bug fixes + polish

---

### 16.3 Phase 2 — Growth (Months 4–7)

| Feature | Timeline |
|---------|----------|
| Content calendar (monthly/weekly grid) | Month 4 |
| Multi-account management (up to 5) | Month 4–5 |
| Team workspace + roles (Admin, Editor, Viewer) | Month 5–6 |
| Best time to post AI recommendations | Month 5–6 |
| Advanced analytics + follower growth tracker | Month 6 |
| Hashtag suggestion AI tool | Month 6–7 |
| Content recycling / evergreen rotation | Month 7 |
| Bulk CSV scheduling | Month 7 |
| Mobile app — iOS + Android (React Native) | Month 4–7 |

---

### 16.4 Phase 3 — Enterprise (Months 8–14)

| Feature | Timeline |
|---------|----------|
| Agency dashboard (unlimited accounts) | Month 8–9 |
| White-label PDF exports | Month 9 |
| Public REST API + API keys management | Month 10–11 |
| Webhooks + Zapier/Make integration | Month 11–12 |
| RSS feed auto-posting | Month 12 |
| LinkedIn scheduling support | Month 13–14 |
| Custom AI persona training | Month 14 |

---

### 16.5 Milestones Summary

| Milestone | Target Date | Success Criteria |
|-----------|-------------|-----------------|
| ✅ Design Complete | End of Week 2 | All Figma screens approved by stakeholders |
| ✅ Alpha Build | End of Week 8 | Core scheduling working internally with test accounts |
| ✅ Beta Launch | End of Week 13 | 100 beta users onboarded; no critical bugs |
| 🚀 Public Launch | Week 15 | Product Hunt launch; 500 sign-ups in Week 1 |
| 💰 Revenue Milestone 1 | Month 3 | $5,000 MRR |
| 📱 Mobile App Launch | Month 7 | iOS + Android apps live in App Store / Play Store |
| 💰 Revenue Milestone 2 | Month 6 | $10,000 MRR |
| 🏢 Agency Plan Launch | Month 8 | First 20 agency customers |
| 💰 Revenue Target | Month 12 | $25,000 MRR; 10,000 registered users |

---

## 17. Success Metrics & KPIs

### 17.1 Acquisition Metrics

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Registered Users | 500 | 2,000 | 5,000 | 10,000 |
| Monthly Active Users (MAU) | 300 | 1,200 | 3,500 | 8,000 |
| Daily Active Users (DAU) | 100 | 400 | 1,200 | 3,000 |
| DAU/MAU Ratio (Stickiness) | 33% | 33% | 34% | 37% |

---

### 17.2 Revenue Metrics

| Metric | Month 1 | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|----------|
| Pro Subscribers (Monthly) | 25 | 90 | 310 | 800 |
| Pro Subscribers (Annual) | 5 | 20 | 70 | 200 |
| MRR | $560 | $2,082 | $7,148 | $18,790 |
| Free-to-Paid Conversion | 5% | 6% | 8% | 10% |
| Monthly Churn Rate | <10% | <8% | <6% | <5% |
| Average Revenue Per User (ARPU) | $18.62 | $18.93 | $19.00 | $19.20 |

---

### 17.3 Engagement Metrics

| Metric | Target |
|--------|--------|
| Average Session Duration | > 8 minutes |
| Tweets Scheduled per Active User/Month | > 20 |
| AI Generations per Pro User/Month | > 5 |
| Affiliate Tweets Generated/Month | > 500 |
| Onboarding Completion Rate | > 70% |

---

### 17.4 Operational Metrics

| Metric | Target |
|--------|--------|
| System Uptime | 99.9% |
| Tweet Publishing Success Rate | 99.5% |
| API Response Time (P95) | < 500ms |
| Support Ticket First Response | < 4 hours |
| Net Promoter Score (NPS) | > 50 |
| App Store Rating (Phase 2) | > 4.5 ⭐ |

---

### 17.5 Launch Readiness Checklist

Before public launch, ALL of the following must pass:

- [ ] All `🔴 Must Have` functional requirements implemented and tested
- [ ] 90%+ test coverage on scheduling engine
- [ ] Page load time < 2.5 seconds (measured on 4G connection)
- [ ] Zero CRITICAL or HIGH security vulnerabilities (OWASP scan)
- [ ] Stripe payments tested end-to-end in production environment
- [ ] X API publishing tested for 1,000+ tweets in staging
- [ ] Analytics data populating correctly for test accounts
- [ ] Email notifications delivering successfully (< 2 min delay)
- [ ] Arabic RTL layout verified across all screens
- [ ] Mobile responsive design verified at 320px, 768px, 1024px, 1440px
- [ ] Load test passed: 5,000 concurrent users with < 2.5s LCP
- [ ] Uptime monitoring + alerting configured
- [ ] Privacy policy + Terms of Service published
- [ ] GDPR data deletion flow tested
- [ ] Admin dashboard operational and monitored

---

## 18. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **API** | Application Programming Interface — a set of rules for how software applications communicate |
| **ARR** | Annual Recurring Revenue — total yearly subscription revenue |
| **BullMQ** | A Node.js queue library built on Redis for managing background jobs |
| **CDN** | Content Delivery Network — distributed servers for fast content delivery |
| **Churn Rate** | Percentage of subscribers who cancel per month |
| **GDPR** | General Data Protection Regulation — EU data privacy law |
| **JWT** | JSON Web Token — secure token format for authentication |
| **KPI** | Key Performance Indicator — measurable value showing goal progress |
| **LCP** | Largest Contentful Paint — Core Web Vitals metric for page load |
| **LTV** | Customer Lifetime Value — total revenue expected from one customer |
| **MRR** | Monthly Recurring Revenue — monthly subscription revenue total |
| **NPS** | Net Promoter Score — customer satisfaction metric (−100 to +100) |
| **OAuth 2.0** | Open standard for authorization — allows X login without passwords |
| **ORM** | Object-Relational Mapping — database abstraction layer |
| **OWASP** | Open Web Application Security Project — web security standards |
| **PDPL** | Saudi Arabia Personal Data Protection Law |
| **PKCE** | Proof Key for Code Exchange — secure OAuth 2.0 extension |
| **RLS** | Row-Level Security — database permission model per row/user |
| **RTL** | Right-To-Left — text direction for Arabic, Hebrew, etc. |
| **SaaS** | Software as a Service — subscription-based cloud software |
| **SLA** | Service Level Agreement — committed performance standards |
| **SSR** | Server-Side Rendering — HTML generated on server for SEO |
| **Thread** | A series of connected tweets published in reply-chain sequence |
| **TLS** | Transport Layer Security — encryption protocol for HTTPS |
| **ToS** | Terms of Service — legal agreement governing platform use |
| **Webhook** | HTTP callback triggered when a specific event occurs (e.g., Stripe payment) |
| **X (Twitter)** | Social media platform formerly known as Twitter, rebranded by Elon Musk in 2023 |

---

### Appendix B: External API References

| API | Documentation URL |
|-----|------------------|
| X API v2 | https://developer.twitter.com/en/docs/twitter-api |
| OpenAI API | https://platform.openai.com/docs |
| Stripe API | https://stripe.com/docs/api |
| Amazon PA API | https://webservices.amazon.com/paapi5/documentation/ |
| Resend Email API | https://resend.com/docs |
| Supabase Docs | https://supabase.com/docs |

---

### Appendix C: Design System

| Element | Value |
|---------|-------|
| **Primary Color** | `#1DA1F2` — X Blue |
| **Secondary Color** | `#1a237e` — Deep Navy |
| **Accent** | `#7C3AED` — Purple (AI features) |
| **Success** | `#22c55e` — Green |
| **Error** | `#ef4444` — Red |
| **Warning** | `#f59e0b` — Amber |
| **Background** | `#f8fafc` — Off-white |
| **Surface** | `#ffffff` — White (cards, panels) |
| **Text Primary** | `#0f172a` — Near black |
| **Text Secondary** | `#64748b` — Slate gray |
| **Arabic Font** | IBM Plex Arabic (Google Fonts) |
| **English Font** | Inter (Google Fonts) |
| **Border Radius** | 8px (inputs), 12px (cards), 24px (buttons) |
| **Card Shadow** | `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)` |
| **Transition** | `all 0.2s ease-in-out` |

---

### Appendix D: Future Enhancements (Phase 4+)

| Enhancement | Description | Estimated Effort |
|-------------|-------------|-----------------|
| AI Sentiment Analysis | Analyze audience sentiment on published tweets | High |
| Competitor Tracking | Monitor competitor X accounts and benchmark engagement | Very High |
| Video Editor | Basic in-browser video trimming and captioning tool | Very High |
| AI Profile Optimizer | AI recommendations for bio, profile photo, header | Medium |
| LinkedIn Scheduling | Extend AstraPost to schedule LinkedIn posts | High |
| Instagram Scheduling | Extend to Instagram Reels and Stories | Very High |
| Influencer Marketplace | Connect brands with Arabic influencers | Very High |
| Native Arabic AI Model | Fine-tuned Arabic language model for better cultural accuracy | Very High |
| SMS Notifications | WhatsApp/SMS alerts for publish confirmations | Medium |

---

### Appendix E: Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | February 2026 | thunderlight | Initial draft outline |
| 0.5 | March 2026 | thunderlight | Added functional requirements + DB schema |
| 1.0 | March 9, 2026 | thunderlight | Complete BRD finalized — all 18 sections |

---

## 📋 Document Control

| Field | Value |
|-------|-------|
| **Document Title** | AstraPost — Business Requirements Document |
| **Project Name** | AstraPost |
| **Version** | 1.0 |
| **Status** | Draft for Review |
| **Date Created** | March 9, 2026 |
| **Last Updated** | March 9, 2026 |
| **Author** | thunderlight |
| **Classification** | Confidential |
| **Next Review Date** | April 9, 2026 |

---

*© 2026 AstraPost. All rights reserved. This document is confidential and intended for internal use only.*
