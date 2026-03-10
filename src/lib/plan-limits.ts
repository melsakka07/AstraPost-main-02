export const PLAN_LIMITS = {
  free: {
    postsPerMonth: 10,
    aiGenerationsPerMonth: 0,
    maxXAccounts: 1,
    canUseAi: false,
  },
  pro_monthly: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: Infinity,
    maxXAccounts: 3,
    canUseAi: true,
  },
  pro_annual: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: Infinity,
    maxXAccounts: 3,
    canUseAi: true,
  },
  agency: {
    postsPerMonth: Infinity,
    aiGenerationsPerMonth: Infinity,
    maxXAccounts: 10,
    canUseAi: true,
  }
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string | null | undefined) {
  return PLAN_LIMITS[(plan || "free") as PlanType] || PLAN_LIMITS.free;
}
