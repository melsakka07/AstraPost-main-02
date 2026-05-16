import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { logger } from "@/lib/logger";
import { getActiveProxyStatus, invalidateActiveProxy } from "@/lib/services/youtube-proxy";

/**
 * GET /api/admin/youtube-proxy
 *
 * Inspect the currently-active YouTube proxy (masked credentials, TTL, source).
 * Read-only — does not trigger rotation.
 */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  const status = await getActiveProxyStatus();
  return Response.json(status);
}

/**
 * DELETE /api/admin/youtube-proxy
 *
 * Manually invalidate the cached proxy. Next request triggers re-resolution
 * (Webshare API → fresh proxy → write to Redis). Use to force-rotate when a
 * silently-degraded proxy is suspected.
 */
export async function DELETE() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("write");
  if (rl) return rl;

  await invalidateActiveProxy("admin_manual");
  logger.info("admin_youtube_proxy_rotated", { adminUserId: auth.session.user.id });
  return Response.json({ ok: true });
}
