import { headers } from "next/headers";
import { APIError as BetterAuthAPIError } from "better-auth/api";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  checkIpRateLimit,
  createIpRateLimitResponse,
} from "@/lib/rate-limiter";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

  // IP-based rate limiting (fail-open for Redis errors)
  const ipResult = await checkIpRateLimit(ip, "register", 3, 900); // 3 per 15 mins
  if (ipResult?.limited) {
    return createIpRateLimitResponse(ipResult.retryAfter!);
  }

  // Parse and validate request body
  let body;
  try {
    body = await req.json();
  } catch {
    return ApiError.badRequest("Invalid JSON");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return ApiError.badRequest(parsed.error.issues);
  }

  const { email, password, name } = parsed.data;

  // User-based rate limiting (email already determined)
  // Use "free" plan as default for unauthenticated registration
  const rlResult = await checkRateLimit(email, "free", "auth");
  if (!rlResult.success) {
    logger.warn("register_rate_limit_exceeded", { email });
    return createRateLimitResponse(rlResult);
  }

  try {
    // Create user with email/password
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name ?? email.split("@")[0], // Use email prefix as default name
      },
      headers: await headers(),
    });

    logger.info("register_success", { email });

    return Response.json(
      {
        success: true,
        user: {
          id: result.user?.id,
          email: result.user?.email,
          name: result.user?.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Better Auth throws APIError on failure
    if (error instanceof BetterAuthAPIError) {
      const apiError = error as BetterAuthAPIError;
      logger.error("register_api_error", {
        email,
        status: apiError.status,
        message: apiError.message,
      });

      // Better Auth returns 400 for duplicate email, convert to 409
      if (apiError.status === 400 && apiError.message?.toLowerCase().includes("email")) {
        return ApiError.conflict("Email already registered");
      }

      return ApiError.badRequest(apiError.message || "Registration failed");
    }

    logger.error("register_internal_error", {
      email,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return ApiError.internal("Registration failed. Please try again.");
  }
}
