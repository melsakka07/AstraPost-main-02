---
paths:
  - "src/lib/security/**/*"
  - "src/lib/auth.ts"
  - "src/app/api/x/**/*"
  - "src/app/api/auth/**/*"
---

# Security & Token Rules

- X OAuth tokens are encrypted at rest — NEVER store as plaintext
- Use `isEncryptedToken()` guard before encrypting to prevent double-encryption
- Token format: `v1:kid:iv.ct.tag` — check before re-encrypting
- Decryption via `decryptToken()` safely returns plaintext if not encrypted
- `TOKEN_ENCRYPTION_KEYS` env var: comma-separated 32-byte base64 keys (first is primary)
- For rotation: `pnpm run tokens:rotate`
