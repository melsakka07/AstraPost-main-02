# Subscriber Snapshot
**Taken at:** 2026-03-31 13:10:09 UTC

---

## Raw DB Records

```json
[
  {
    "id": "xYqcxxadvGoL1K4JeTtppVaCLPzDHJcr",
    "name": "AstraVisionAI",
    "email": "thunderlight.m@gmail.com",
    "plan": "free",
    "created_at": "2026-03-31T07:29:51.137Z",
    "trial_ends_at": "2026-04-14T07:29:51.145Z",
    "is_suspended": false,
    "x_username": "AstraVisionPro",
    "x_subscription_tier": "Premium",
    "x_subscription_tier_updated_at": "2026-03-31T08:49:44.853Z",
    "is_active": true
  },
  {
    "id": "GDz1l88HNAefNlBKzZvPHjvisLVUfgKi",
    "name": "Mohanad",
    "email": "eng.m.elsakka@gmail.com",
    "plan": "free",
    "created_at": "2026-03-26T06:36:09.321Z",
    "trial_ends_at": "2026-04-09T06:36:09.333Z",
    "is_suspended": false,
    "x_username": null,
    "x_subscription_tier": null,
    "x_subscription_tier_updated_at": null,
    "is_active": null
  },
  {
    "id": "vMEsAlxeoaXpTpeNjzeru6YEvOI88JzK",
    "name": "AstraVision AI",
    "email": "astravision.ai@gmail.com",
    "plan": "pro_monthly",
    "created_at": "2026-03-13T18:15:15.389Z",
    "trial_ends_at": "2026-03-27T18:15:15.396Z",
    "is_suspended": false,
    "x_username": "AstraVisionAI",
    "x_subscription_tier": "None",
    "x_subscription_tier_updated_at": "2026-03-30T17:52:49.164Z",
    "is_active": true
  },
  {
    "id": "Ef5enuEilRGx6rqGWr3z0yWehBAjUCE3",
    "name": "thunderlightatnight07",
    "email": "hanood.it@gmail.com",
    "plan": "pro_annual",
    "created_at": "2026-03-10T12:37:31.576Z",
    "trial_ends_at": "2026-03-24T12:37:31.582Z",
    "is_suspended": false,
    "x_username": "Thunder_Light77",
    "x_subscription_tier": "None",
    "x_subscription_tier_updated_at": null,
    "is_active": true
  }
]
```

---

## User Analysis

### User 1 — AstraVisionAI
| Field | Value |
|---|---|
| **Email** | thunderlight.m@gmail.com |
| **Platform Plan** | `free` (trial ends 2026-04-14) |
| **X Account** | @AstraVisionPro |
| **X Subscription Tier** | **Premium** (updated 2026-03-31) |
| **Account Active** | Yes |

**AI Writer character limits:**
- Short → 280 chars ✅
- Medium → 1,000 chars ✅ (Premium unlocks long content)
- Long → 2,000 chars ✅
- Composer max → 2,000 chars

---

### User 2 — Mohanad
| Field | Value |
|---|---|
| **Email** | eng.m.elsakka@gmail.com |
| **Platform Plan** | `free` (trial ends 2026-04-09) |
| **X Account** | — (no X account connected) |
| **X Subscription Tier** | N/A |
| **Account Active** | N/A |

**AI Writer character limits:**
- Short → 280 chars ✅ (only option — no X account)
- Medium / Long → ❌ locked
- Composer max → 280 chars

---

### User 3 — AstraVision AI
| Field | Value |
|---|---|
| **Email** | astravision.ai@gmail.com |
| **Platform Plan** | `pro_monthly` |
| **X Account** | @AstraVisionAI |
| **X Subscription Tier** | **None** (updated 2026-03-30) |
| **Account Active** | Yes |

**AI Writer character limits:**
- Short → 280 chars ✅ (only option — None tier)
- Medium / Long → ❌ locked
- Composer max → 280 chars

---

### User 4 — thunderlightatnight07
| Field | Value |
|---|---|
| **Email** | hanood.it@gmail.com |
| **Platform Plan** | `pro_annual` |
| **X Account** | @Thunder_Light77 |
| **X Subscription Tier** | **None** (⚠️ tier never refreshed — null updated_at) |
| **Account Active** | Yes |

**AI Writer character limits:**
- Short → 280 chars ✅ (only option — None tier)
- Medium / Long → ❌ locked
- Composer max → 280 chars
- ⚠️ Tier has never been fetched from X API — worker will refresh on next run

---

## Summary Table

| User | Plan | X Tier | AI Short (280) | AI Medium (1k) | AI Long (2k) |
|---|---|---|---|---|---|
| @AstraVisionPro | free (trial) | **Premium** | ✅ | ✅ | ✅ |
| Mohanad (no X) | free (trial) | N/A | ✅ | ❌ | ❌ |
| @AstraVisionAI | pro_monthly | None | ✅ | ❌ | ❌ |
| @Thunder_Light77 | pro_annual | None | ✅ | ❌ | ❌ |

---

## Notes

- Character limits in the AI Writer are gated by **X subscription tier** (Basic / Premium / Premium+), not the AstraPost plan.
- Users 3 and 4 are on paid AstraPost plans but only get the 280-char Short option because their X accounts are on the free tier.
- X tier is refreshed automatically by the BullMQ worker every 24 hours per account.
- User 4 (@Thunder_Light77) has never had their tier fetched — will be resolved on the next worker cycle.
