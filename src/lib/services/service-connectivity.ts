import "server-only";

import { logger } from "@/lib/logger";

/**
 * On-demand connectivity + best-effort balance checks for the paid AI providers.
 *
 * Design (see the Operations Center plan, §2.3):
 * - Runs only when an admin opens the dashboard; results are cached in-process
 *   for 60s so refreshes don't hammer providers. There is NO background cron.
 * - Balance is read ONLY where the provider genuinely exposes it: OpenRouter
 *   (`/api/v1/credits`) and Deepgram (`/v1/projects/{id}/balances`). Replicate
 *   and OpenAI expose no balance API, so `balanceCents` is null and
 *   `balanceSource` is "none" — the UI shows "not exposed by provider", never a
 *   fabricated $0.
 * - Every check is non-throwing: failures return `{ up: false }` and log a warning.
 */

export type BalanceSource = "api" | "none";

export interface ServiceConnectivity {
  service: string;
  up: boolean;
  balanceCents: number | null;
  balanceSource: BalanceSource;
  latencyMs: number;
  error?: string;
}

const TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 60_000;

let cache: { at: number; data: ServiceConnectivity[] } | null = null;

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

async function checkOpenRouter(): Promise<ServiceConnectivity> {
  const service = "openrouter";
  const start = Date.now();
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return {
      service,
      up: false,
      balanceCents: null,
      balanceSource: "none",
      latencyMs: 0,
      error: "Not configured",
    };
  }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        service,
        up: false,
        balanceCents: null,
        balanceSource: "none",
        latencyMs: Date.now() - start,
        error: `HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as { data?: { total_credits?: number; total_usage?: number } };
    const credits = json.data?.total_credits;
    const usage = json.data?.total_usage;
    const balanceCents =
      typeof credits === "number" && typeof usage === "number"
        ? dollarsToCents(credits - usage)
        : null;
    return {
      service,
      up: true,
      balanceCents,
      balanceSource: balanceCents !== null ? "api" : "none",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    logger.warn("connectivity_check_failed", { service, error });
    return {
      service,
      up: false,
      balanceCents: null,
      balanceSource: "none",
      latencyMs: Date.now() - start,
      error,
    };
  }
}

async function checkDeepgram(): Promise<ServiceConnectivity> {
  const service = "deepgram";
  const start = Date.now();
  const key = process.env.YOUTUBE_DEEPGRAM_API_KEY;
  if (!key) {
    return {
      service,
      up: false,
      balanceCents: null,
      balanceSource: "none",
      latencyMs: 0,
      error: "Not configured",
    };
  }
  try {
    const headers = { Authorization: `Token ${key}` };
    // Step 1: resolve the first project id.
    const projectsRes = await fetch("https://api.deepgram.com/v1/projects", {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!projectsRes.ok) {
      return {
        service,
        up: false,
        balanceCents: null,
        balanceSource: "none",
        latencyMs: Date.now() - start,
        error: `HTTP ${projectsRes.status}`,
      };
    }
    const projects = (await projectsRes.json()) as { projects?: Array<{ project_id?: string }> };
    const projectId = projects.projects?.[0]?.project_id;
    if (!projectId) {
      return {
        service,
        up: true,
        balanceCents: null,
        balanceSource: "none",
        latencyMs: Date.now() - start,
      };
    }
    // Step 2: read balances for that project (credit accounts only).
    const balancesRes = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/balances`, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!balancesRes.ok) {
      // Reachable but balance not available (e.g. non-credit account).
      return {
        service,
        up: true,
        balanceCents: null,
        balanceSource: "none",
        latencyMs: Date.now() - start,
      };
    }
    const balances = (await balancesRes.json()) as { balances?: Array<{ amount?: number }> };
    const total = (balances.balances ?? []).reduce((sum, b) => sum + (b.amount ?? 0), 0);
    return {
      service,
      up: true,
      balanceCents: dollarsToCents(total),
      balanceSource: "api",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    logger.warn("connectivity_check_failed", { service, error });
    return {
      service,
      up: false,
      balanceCents: null,
      balanceSource: "none",
      latencyMs: Date.now() - start,
      error,
    };
  }
}

/** Liveness-only check (no balance endpoint exists for this provider). */
async function checkLiveness(
  service: string,
  url: string,
  authHeader: string | undefined
): Promise<ServiceConnectivity> {
  const start = Date.now();
  if (!authHeader) {
    return {
      service,
      up: false,
      balanceCents: null,
      balanceSource: "none",
      latencyMs: 0,
      error: "Not configured",
    };
  }
  try {
    const res = await fetch(url, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return {
      service,
      up: res.ok,
      balanceCents: null,
      balanceSource: "none",
      latencyMs: Date.now() - start,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    logger.warn("connectivity_check_failed", { service, error });
    return {
      service,
      up: false,
      balanceCents: null,
      balanceSource: "none",
      latencyMs: Date.now() - start,
      error,
    };
  }
}

function checkReplicate(): Promise<ServiceConnectivity> {
  const token = process.env.REPLICATE_API_TOKEN;
  return checkLiveness(
    "replicate",
    "https://api.replicate.com/v1/account",
    token ? `Bearer ${token}` : undefined
  );
}

function checkOpenAI(): Promise<ServiceConnectivity> {
  const token = process.env.OPENAI_API_KEY;
  return checkLiveness(
    "openai",
    "https://api.openai.com/v1/models",
    token ? `Bearer ${token}` : undefined
  );
}

/**
 * Returns connectivity for all monitored AI providers, cached in-process for 60s.
 */
export async function getServiceConnectivity(): Promise<ServiceConnectivity[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }
  const data = await Promise.all([
    checkOpenRouter(),
    checkReplicate(),
    checkOpenAI(),
    checkDeepgram(),
  ]);
  cache = { at: Date.now(), data };
  return data;
}
