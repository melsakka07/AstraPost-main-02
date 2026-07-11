# X API — Grounding Reference for AstraPost

**Purpose:** the single source of truth for what the X API can do, what it costs, and how it
maps to AstraPost features. Build against this, not against memory or blog posts. Every fact is
tagged with its source and confidence so we never design on speculation.

**Source tags**

- `[SPEC]` — verified in the machine-readable OpenAPI spec: [`docs/reference/x-api-openapi.json`](../reference/x-api-openapi.json) (X API v2, `info.version` 2.166, 141 paths). Authoritative for endpoints, methods, scopes, request/response shapes.
- `[X-DOCS]` — verified on X's official pricing page: <https://docs.x.com/x-api/getting-started/pricing> (fetched 2026-07-11). Authoritative for prices.
- `[SECONDARY]` — from third-party write-ups; **must be re-verified** via the `x-docs` MCP server or the Developer Console before we rely on it commercially.

> Re-verify `[SECONDARY]` and any price before a build that spends money. Use the **`x-docs`
> MCP** (`https://docs.x.com/mcp`, wired into `.mcp.json`, zero API cost) or the live
> `GET /2/usage/tweets` endpoint.

---

## 1. Account & subscription status

- House developer account: **`@AstraVisionAI`**, on **pay-per-use** (credit-based, default model since 2026-02-06). `[X-DOCS]`
- Pay-per-use has **no free tier, no subscription minimum** — you pre-buy credits and are metered per request. `[X-DOCS]`
- The app must be in the **Pay-per-use package + Production** environment in the portal, or user-context calls fail with `client-not-enrolled`. `[SECONDARY — confirm in console]`
- `@AstraVisionAI` is a **single identity** (house/brand account). It is **not** how AstraPost posts for customers — that stays on the existing multi-tenant OAuth 2.0 user-context pipeline (Better Auth + encrypted per-user tokens). The house account is for AstraPost's own brand posts and for cheap shared-intelligence reads (trends/news).

## 2. Pricing (the numbers that drive COGS)

| Action                                       | Price                                                                                                     | Source                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Create a post                                | **$0.015 / request**                                                                                      | `[X-DOCS]`                                                    |
| **Create a post containing a URL**           | **$0.200 / request** (~13×)                                                                               | `[X-DOCS]`                                                    |
| Read own posts (owned reads)                 | **$0.001 / resource**                                                                                     | `[X-DOCS]`                                                    |
| Read third-party posts                       | **$0.005 / resource**                                                                                     | `[X-DOCS]`                                                    |
| User lookup                                  | **$0.010 / resource**                                                                                     | `[X-DOCS]`                                                    |
| Media metadata                               | **$0.005 / request**                                                                                      | `[X-DOCS]`                                                    |
| Trends / news reads                          | ~$0.010 / request                                                                                         | `[SECONDARY — verify]`                                        |
| Full-archive search (`/2/tweets/search/all`) | **Enterprise only, $42,000+/mo**                                                                          | `[SECONDARY]` + `[SPEC]` (endpoint exists, no standard scope) |
| Credits-back rebate                          | 10% @ $200+, 15% @ $500+, 20% @ $1,000+ — **paid in xAI credits** (near-useless to us; we use OpenRouter) | `[X-DOCS]`                                                    |

**Hard limits that bind regardless of spend:**

- **Read cap: 2,000,000 post reads / month** on pay-per-use — confirmed live via `project_cap` in `GET /2/usage/tweets`. `[SPEC]` + `[SECONDARY]`
- **Rate limits: 15-minute rolling windows**, separate per-app and per-user(OAuth). Spending more does NOT lift them. Numbers (e.g. 3,500 reads/15min, 450 search/15min) are `[SECONDARY — verify per endpoint]`.

## 3. Endpoints AstraPost uses, by feature (all `[SPEC]`)

| Feature                             | Endpoint(s)                                                     | Method | Scopes                                    | Cost profile                   |
| ----------------------------------- | --------------------------------------------------------------- | ------ | ----------------------------------------- | ------------------------------ |
| **Publish tweet/thread**            | `/2/tweets`                                                     | POST   | `tweet.write`, `tweet.read`, `users.read` | $0.015, **$0.20 if URL**       |
| Delete post                         | `/2/tweets/{id}`                                                | DELETE | `tweet.write`, `tweet.read`, `users.read` | write                          |
| **Inbox — mentions**                | `/2/users/{id}/mentions`                                        | GET    | `tweet.read`, `users.read`                | reads                          |
| Inbox — reposts of me               | `/2/users/reposts_of_me`                                        | GET    | `timeline.read`, `tweet.read`             | reads                          |
| Inbox — quotes / likers / reposters | `/2/tweets/{id}/quote_tweets`, `/liking_users`, `/retweeted_by` | GET    | `tweet.read`                              | third-party reads $0.005       |
| **Own analytics**                   | `/2/tweets/{id}`, `/2/tweets/analytics`, `/2/users/{id}/tweets` | GET    | `tweet.read`, `users.read`                | **owned reads $0.001 (cheap)** |
| Media analytics                     | `/2/media/analytics`                                            | GET    | —                                         | reads                          |
| **MENA Trend Radar**                | `/2/trends/by/woeid/{woeid}`                                    | GET    | **none (app-only Bearer works)**          | ~$0.010, cache & share         |
| Personalized trends                 | `/2/users/personalized_trends`                                  | GET    | —                                         | reads                          |
| News                                | `/2/news/search`                                                | GET    | —                                         | reads                          |
| Competitor / recent search          | `/2/tweets/search/recent`                                       | GET    | `tweet.read`, `users.read`                | third-party reads $0.005       |
| Media upload                        | `/2/media/upload` (+ initialize/append/finalize)                | POST   | —                                         | write-adjacent                 |
| **Cost-meter reconciliation**       | `/2/usage/tweets`                                               | GET    | none                                      | free/cheap; see §4             |

**Off-limits commercially:** `/2/tweets/search/all` (full-archive) — Enterprise $42k. Any feature needing it must use `/search/recent` (7-day) or a cached alternative instead.

## 4. Cost-metering: what X gives us vs. what we must build

`GET /2/usage/tweets` returns (fields `[SPEC]`):

- `project_cap` — total post reads allowed this month (the 2M ceiling)
- `project_usage` — post reads consumed so far
- `cap_reset_day` — days until reset
- `daily_project_usage` + `daily_client_app_usage` — daily breakdowns per app

**Implication for the metering layer (priority #1 build):**

- **Reads** — reconcilable against X's own authoritative `project_usage`. But it's **project-wide, not per-user**, so per-tenant attribution still needs an internal counter.
- **Writes** — X exposes no per-write usage endpoint here. AstraPost must meter writes internally: count posts, apply weight **$0.015**, or **$0.20 when the post body contains a URL**.
- **Design pattern:** mirror the existing atomic AI-quota system (`src/lib/services/ai-quota-atomic.ts`, `ai-image-quota-atomic.ts`). Add a `tryConsumeXBudget(teamId, weightedCost)` gate + per-plan monthly X-spend ceilings; charge link-posts at the $0.20 weight; gate read-heavy features (competitor/search) behind Pro/Agency so their read cost is revenue-covered. Reconcile the project total nightly against `/2/usage/tweets`.

## 5. Corrections this grounding produced

- **Trend Radar is viable, not "cost-dangerous".** It runs on `/2/trends/by/woeid/{woeid}` (a regular ~$0.01 endpoint, **no scope required**) — _not_ the $42k full-archive search I'd assumed. Fetch per MENA WOEID from the house account every ~20 min, cache once, serve all users → pennies/day.
- **First-comment link trick is a reach play, not a cost dodge.** The reply still contains the URL, so it still costs $0.20. The only real levers on the URL penalty are: link-post sub-quotas, pass-through metering, or discouraging raw URLs.

## 6. Tooling wired for this work

- **`x-docs` MCP** (`https://docs.x.com/mcp`) in `.mcp.json` — live X documentation search, **zero API cost**. Use it to re-verify `[SECONDARY]` facts and endpoint details on demand.
- **OpenAPI spec** at `docs/reference/x-api-openapi.json` — regenerate with `curl -fsSL https://api.x.com/2/openapi.json -o docs/reference/x-api-openapi.json`.
- **X API MCP** (`https://api.x.com/mcp`) — **NOT wired in.** Single-user, needs `CLIENT_ID/CLIENT_SECRET` secrets, and every call bills `@AstraVisionAI`. Manual dev/debug only; never in an automated loop.
