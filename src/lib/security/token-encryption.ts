import crypto from "crypto";

function decodeKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  return Buffer.from(trimmed, "base64");
}

// Module-level key cache. Parsing TOKEN_ENCRYPTION_KEYS involves base64/hex
// decoding and length validation on every encrypt/decrypt call — once per
// request for every X account lookup. Caching after the first parse cuts
// repeated allocations and makes hot paths measurably cheaper.
//
// The cache is intentionally module-scoped (not exported) so only this file
// can populate or read it. Tests that need to exercise different key sets
// should use jest.resetModules() or similar to force re-evaluation.
let _cachedKeys: Buffer[] | null = null;

function parseAndValidateKeys(raw: string): Buffer[] {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error("TOKEN_ENCRYPTION_KEYS is required");
  }
  const keys = parts.map(decodeKey);
  for (const k of keys) {
    if (k.length !== 32) {
      throw new Error("TOKEN_ENCRYPTION_KEYS must contain 32-byte keys");
    }
  }
  return keys;
}

function getKeys(): Buffer[] {
  if (_cachedKeys) return _cachedKeys;
  const raw = process.env.TOKEN_ENCRYPTION_KEYS;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEYS is required");
  }
  _cachedKeys = parseAndValidateKeys(raw);
  return _cachedKeys;
}

export function encryptToken(plaintext: string): string {
  const keys = getKeys();
  const key = keys[0]!;
  const kid = 0;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${kid}:${iv.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptToken(value: string): string {
  const keys = getKeys();
  if (!value.startsWith("v1:")) {
    return value;
  }
  const rest = value.slice(3);
  const [kidStr, payload] = rest.split(":", 2);
  const kid = Number(kidStr);
  const [ivB64, ctB64, tagB64] = (payload || "").split(".");
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("Invalid encrypted token format");
  }
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const tryKeys = Number.isFinite(kid) && kid >= 0 && kid < keys.length ? [keys[kid]!] : keys;

  let lastErr: unknown;
  for (const key of tryKeys) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(ct), decipher.final()]);
      return plaintext.toString("utf8");
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Failed to decrypt token");
}

export function isPrimaryKeyToken(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return value.startsWith("v1:0:");
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("v1:");
}
