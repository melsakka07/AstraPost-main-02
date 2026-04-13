---
paths:
  - "src/app/api/ai/**/*.ts"
  - "src/app/api/chat/**/*.ts"
  - "src/lib/services/ai-*.ts"
  - "src/lib/ai/**/*.ts"
  - "src/components/ai/**/*.tsx"
---

# AI Integration Rules

- Use OpenRouter (`@openrouter/ai-sdk-provider`), NOT direct OpenAI
- Model names from env vars ONLY — `process.env.OPENROUTER_MODEL!`, never hardcoded
- Replicate models: `REPLICATE_MODEL_FAST!`, `REPLICATE_MODEL_PRO!`, `REPLICATE_MODEL_FALLBACK!`
- Model mapping exclusively in `src/lib/services/ai-image.ts` → `startImageGeneration()`
- Adding a new AI model = add to `.env` + `env.ts` + mapping function — never as a literal string
- Every AI endpoint must call `recordAiUsage()` for billing tracking
- Plan/quota enforcement via `require-plan.ts` helpers (`checkAiLimitDetailed`, `checkAiQuotaDetailed`)
