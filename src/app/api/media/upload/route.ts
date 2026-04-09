import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { user } from "@/lib/schema";
import { upload } from "@/lib/storage";

// ── Magic-bytes detection ──────────────────────────────────────────────────
// We never trust the attacker-controlled Content-Type header (file.type) or
// the filename extension (file.name) to determine what kind of file was
// uploaded.  Instead we examine the first ~12 bytes of the buffer, which the
// uploader cannot spoof without corrupting the file's own format.

type DetectedFile = { mime: string; ext: string };

/**
 * Detects MIME type and a safe canonical extension by examining magic bytes.
 * Returns null if the buffer does not match any allowed file signature.
 */
function detectMimeFromBuffer(buf: Buffer): DetectedFile | null {
  // Need at least 12 bytes for WebP detection
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", ext: ".jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { mime: "image/png", ext: ".png" };
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return { mime: "image/gif", ext: ".gif" };
  }

  // WebP: RIFF????WEBP  (bytes 0-3 = "RIFF", bytes 8-11 = "WEBP")
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return { mime: "image/webp", ext: ".webp" };
  }

  // MP4 / MOV: ????ftyp  (4-byte box-size + ASCII "ftyp" at offset 4)
  // This covers mp4, m4v, mov, and other ISO Base Media formats.
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    return { mime: "video/mp4", ext: ".mp4" };
  }

  return null;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Absolute ceiling across all types (used for cheap pre-check before buffer read). */
const ABSOLUTE_MAX_BYTES = 50 * 1024 * 1024; // 50 MB (video ceiling)
const IMAGE_MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true },
    });

    const rlResult = await checkRateLimit(session.user.id, dbUser?.plan || "free", "media");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    // ── Size pre-check (cheap — protects memory before reading the full buffer) ──
    // We use the absolute maximum across all supported types here so that we do
    // NOT trust the attacker-controlled file.type to choose the ceiling.
    // The per-type limit is enforced again below, after magic-bytes detection.
    if (file.size > ABSOLUTE_MAX_BYTES) {
      return new Response("File too large", { status: 400 });
    }

    // ── Magic-bytes validation ─────────────────────────────────────────────
    // Read the full buffer, then detect the actual file type from its content.
    // The extension and MIME reported by the browser are intentionally ignored.
    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectMimeFromBuffer(buffer);

    if (!detected) {
      return new Response("Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4/MOV.", {
        status: 415,
      });
    }

    // ── Per-type size enforcement (now uses the verified detected type) ─────
    const isVideo = detected.mime.startsWith("video/");
    const typeMaxBytes = isVideo ? ABSOLUTE_MAX_BYTES : IMAGE_MAX_BYTES;
    if (file.size > typeMaxBytes) {
      return new Response(isVideo ? "Video too large (max 50 MB)" : "Image too large (max 15 MB)", {
        status: 400,
      });
    }

    // ── Build a safe filename using only the canonical extension ──────────
    // Never use path.extname(file.name) — that trusts attacker-supplied input.
    const filename = `${randomUUID()}${detected.ext}`;
    const fileType = detected.ext === ".gif" ? "gif" : isVideo ? "video" : "image";

    // ── Persist to durable storage ────────────────────────────────────────
    // upload() routes to Vercel Blob in production (BLOB_READ_WRITE_TOKEN set)
    // and to public/uploads/media/ on local dev — both via the same abstraction.
    // We pass ABSOLUTE_MAX_BYTES as the config ceiling so validateFile() inside
    // upload() doesn't re-reject files that already passed our per-type checks.
    const result = await upload(buffer, filename, "media", {
      maxSize: ABSOLUTE_MAX_BYTES,
    });

    return Response.json({
      url: result.url,
      filename,
      mimeType: detected.mime,
      fileType,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
