import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { connection as redis } from "@/lib/queue/client";

const authHandler = toNextJsHandler(auth);

/**
 * Rate limit login and sign-up attempts to prevent brute force attacks.
 * Limits: 5 attempts per minute per IP address
 */
async function rateLimitAuth(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Only rate limit login and sign-up endpoints
  const isLoginOrSignup =
    pathname.includes("/sign-in") ||
    pathname.includes("/sign-up") ||
    pathname.includes("/email/password/login") ||
    pathname.includes("/email/password/register");

  if (!isLoginOrSignup) {
    return null; // Allow other auth endpoints
  }

  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateLimitKey = `ratelimit:auth-login:${clientIp}`;

  try {
    const count = await redis.incr(rateLimitKey);
    if (count === 1) {
      // Set expiry to 60 seconds on first request
      await redis.expire(rateLimitKey, 60);
    }

    if (count > 5) {
      logger.warn("auth_rate_limit_exceeded", { clientIp, count });
      return Response.json(
        {
          error: "Too many login attempts. Please try again in a moment.",
          code: "TOO_MANY_REQUESTS",
        },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }
  } catch (err) {
    logger.error("auth_rate_limit_error", { error: err });
    // Fail open if Redis is down — allow the request to proceed
  }

  return null;
}

async function handleAuthRequest(req: Request) {
  // Check rate limit first
  const rateLimitResponse = await rateLimitAuth(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Proceed with normal auth handling
  return authHandler[req.method.toUpperCase() as "GET" | "POST"](req);
}

export async function GET(req: Request) {
  return handleAuthRequest(req);
}

export async function POST(req: Request) {
  return handleAuthRequest(req);
}
