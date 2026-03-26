import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { featureFlags } from "@/lib/schema";

const ANNOUNCEMENT_KEY = "_announcement";

// ── GET /api/announcement — public, user-facing ───────────────────────────────
// Returns the active announcement or null. No auth required.

export async function GET() {
  try {
    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, ANNOUNCEMENT_KEY))
      .limit(1);

    if (!flag || !flag.enabled) {
      return Response.json({ data: null });
    }

    let text = "";
    let type: "info" | "warning" | "success" = "info";
    try {
      const parsed = JSON.parse(flag.description ?? "{}");
      text = parsed.text ?? "";
      type = parsed.type ?? "info";
    } catch {
      text = flag.description ?? "";
    }

    if (!text) return Response.json({ data: null });

    return Response.json({ data: { text, type } });
  } catch {
    return Response.json({ data: null });
  }
}
