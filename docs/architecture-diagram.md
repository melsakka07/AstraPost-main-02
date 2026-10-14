# AstraPost — Architecture Diagram

A plain-language overview of how the whole system fits together, drawn as Mermaid
diagrams so anyone — with or without coding experience — can see what talks to what.

## How to read the diagrams

- Each **box** is one part of the system. The emoji and short label say what it does.
- Each **arrow** means "data or a request flows this way".
- The **words on an arrow** say why the flow happens (for example "publishes posts").
- Boxes of the same **color** belong to the same layer:

| Color  | Layer                              | What it is                                                      |
| ------ | ---------------------------------- | --------------------------------------------------------------- |
| Blue   | Web Application                    | The website users see, running on Vercel                        |
| Green  | Business Logic                     | The brain: rules, security checks, and services                 |
| Purple | Data Storage                       | PostgreSQL database and Redis (memory)                          |
| Orange | Background Worker                  | A separate "robot" server (Railway) that does the heavy lifting |
| Gray   | External Services                  | Other companies' APIs the app talks to                          |
| Amber  | The User                           | You                                                             |

## 1. Whole system

```mermaid
flowchart TB
    classDef user fill:#fef3c7,stroke:#d97706,stroke-width:2px
    classDef web fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    classDef logic fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    classDef data fill:#fae8ff,stroke:#a21caf,stroke-width:2px
    classDef worker fill:#ffedd5,stroke:#ea580c,stroke-width:2px
    classDef ext fill:#f1f5f9,stroke:#64748b,stroke-width:2px

    subgraph U["👤 The User"]
        U1["You — using a web browser or phone"]
    end

    subgraph W["🚀 Web Application — Next.js 16, hosted on Vercel"]
        direction TB
        W1["🛡️ Entry Guard — checks your login cookie, redirects to the login page, API versioning"]
        W2["📄 Pages — Dashboard, Compose, Schedule calendar, Analytics, AI Tools, Inspiration, Settings, Admin"]
        W3["🧩 UI Components — buttons, forms, charts, tweet editor (Arabic and English, RTL support)"]
        W4["🔌 API Routes (~185) — Auth, Posts, AI tools, Analytics, Billing, Team, Social accounts, Media, Admin, Cron"]
        W5["⏰ Cron Jobs — nightly billing cleanup, AI cost alarms, quota rollover"]
    end

    subgraph L["⚙️ Business Logic — src/lib"]
        direction TB
        L1["🔐 Auth and Teams — Better Auth sessions, teams, roles: owner, admin, editor, viewer"]
        L2["🚦 Guardrails — plan gates (Free, Pro, Agency), rate limiting, AI quotas, idempotency"]
        L3["📦 Core Services — X, Instagram, LinkedIn clients, analytics engine, AI pipeline, moderation, emails, notifications, file storage"]
    end

    subgraph D["🗄️ Data Storage"]
        DB[("🐘 PostgreSQL 18 + pgvector — users, posts, tweets, analytics, AI usage, billing (via Drizzle ORM)")]
        RD[("⚡ Redis — job queues, rate limits, caches, circuit breakers")]
    end

    subgraph WK["🛠️ Background Worker — separate server on Railway"]
        WK1["📥 Listens to 6 queues: publish posts, refresh analytics, token health, PDF to Thread, YouTube to Thread, X tier sync"]
    end

    subgraph E["🌐 External Services"]
        E1["🐦 X (Twitter) — posting, analytics, OAuth login"]
        E2["📸 Instagram — posting, OAuth connect"]
        E3["💼 LinkedIn — posting, OAuth connect"]
        E4["🤖 OpenRouter — AI text: threads, replies, translations"]
        E5["🎨 Replicate — AI image generation"]
        E6["🛡️ OpenAI Moderation — content safety checks"]
        E7["💳 Stripe — subscriptions and payments"]
        E8["📧 Resend — transactional emails"]
        E9["🔍 Sentry — error tracking and performance"]
        E10["🗃️ Vercel Blob — image and video storage"]
        E11["🎙️ Deepgram or Whisper — YouTube audio transcription"]
    end

    U1 -->|"opens the website"| W1
    W1 -->|"allows logged-in users"| W2
    W2 -->|"renders"| W3
    W3 -->|"user actions: save, schedule, generate"| W4
    W1 -->|"routes API calls"| W4
    W4 -->|"verifies session and role"| L1
    W4 -->|"checks plan, quota, rate"| L2
    W4 -->|"runs business logic"| L3
    L3 -->|"reads and writes"| DB
    W4 -->|"queues jobs, rate limits, caches"| RD
    L3 -->|"enqueues background jobs"| RD
    RD -->|"delivers jobs"| WK1
    WK1 -->|"publishes posts"| E1
    WK1 -->|"publishes and syncs"| E2
    WK1 -->|"publishes and syncs"| E3
    WK1 -->|"AI generation and transcription"| E4
    WK1 -->|"transcribes audio"| E11
    W4 -->|"AI text generation"| E4
    W4 -->|"AI image generation"| E5
    W4 -->|"safety check"| E6
    W4 -->|"checkout and webhooks"| E7
    E7 -->|"payment events (webhook)"| W4
    L3 -->|"sends emails"| E8
    L3 -->|"stores uploaded media"| E10
    W4 -->|"reports errors"| E9
    E1 -->|"OAuth login and account connect"| W4
    E2 -->|"OAuth callback"| W4
    E3 -->|"OAuth callback"| W4
    W5 -->|"triggers maintenance tasks"| W4

    class U1 user
    class W1,W2,W3,W4,W5 web
    class L1,L2,L3 logic
    class DB,RD data
    class WK1 worker
    class E1,E2,E3,E4,E5,E6,E7,E8,E9,E10,E11 ext
```

## 2. Example journey — scheduling a tweet

Follow the numbered steps: a concrete walk-through of one user action, from clicking
"Schedule" to the tweet appearing on X.

```mermaid
flowchart LR
    classDef step fill:#eff6ff,stroke:#2563eb,stroke-width:1.5px

    A["1️⃣ You write a tweet in the Composer and pick a time"] --> B["2️⃣ The API checks your plan, quota and rate limit"]
    B --> C["3️⃣ The post is saved in PostgreSQL (Drizzle ORM)"]
    B --> D["4️⃣ A publish job is placed in the Redis queue"]
    D --> E["5️⃣ The Worker takes the job at the scheduled time"]
    E --> F["6️⃣ The Worker sends the tweet to X via the X API"]
    F --> G["7️⃣ X confirms and returns the tweet ID — saved back to PostgreSQL"]
    G --> H["8️⃣ Analytics refresh runs later — your Dashboard charts update"]

    class A,B,C,D,E,F,G,H step
```

## Key facts the diagrams are based on

- **Web app** (Vercel): Next.js 16 App Router, React 19, Tailwind CSS 4 + shadcn/ui,
  next-intl (Arabic/English). ~185 API routes, 7 cron jobs.
- **Worker** (Railway): BullMQ with 6 queues — schedule, analytics, x-tier-refresh,
  token-health, pdfThread, youtubeThread.
- **Data**: PostgreSQL 18 + pgvector via Drizzle ORM (~65 tables), Redis for queues,
  rate limits, caches and circuit breakers.
- **AI**: OpenRouter for text, Replicate for images, OpenAI Moderation for safety,
  Deepgram/Whisper for transcription.
- **Payments & comms**: Stripe (subscriptions), Resend (email), Sentry (monitoring),
  Vercel Blob (media storage).
