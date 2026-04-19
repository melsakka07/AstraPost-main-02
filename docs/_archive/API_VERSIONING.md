# API Versioning Policy

## Overview

All API routes support versioning via the `/api/v{N}/` prefix. The default version (used when no prefix is specified) is v1.

## Version Support Matrix

| Version | Status  | Introduced | End of Life |
| ------- | ------- | ---------- | ----------- |
| v1      | Current | 2026-04-17 | TBD         |
| v2      | Planned | TBD        | TBD         |

## Migration Guide

### Client: Web (Dashboard)

Currently uses `/api/*` (unversioned). To future-proof:

```typescript
// Current
const res = await fetch("/api/posts");

// Future-proof
const res = await fetch("/api/v1/posts");
```

### Client: Mobile App

Should immediately adopt v1:

```swift
let url = URL(string: "https://api.astrapost.com/api/v1/posts")
```

### Client: Third-party integrations

Use `/api/v1/` to ensure stability across server updates.

## Breaking Change Policy

- **Minor changes (additive):** No version bump needed
  - Adding optional fields to responses
  - Adding optional parameters to requests
  - Deprecating fields (keep for 2+ versions)

- **Breaking changes:** Require new version
  - Removing fields from responses
  - Removing request parameters
  - Renaming fields
  - Changing field types

- **Deprecation notice:** All breaking changes announced 1 month before removal

```typescript
// Example: Mark field for deprecation in v1
export type PostResponse = {
  id: string;
  /** @deprecated Use createdAt instead (removed in v2) */
  created_at: string;
  createdAt: string; // New field
};
```

## Testing

All API routes should test both versioned and unversioned access:

```typescript
describe("POST /api/posts", () => {
  it("works via /api/posts", async () => {
    /* ... */
  });
  it("works via /api/v1/posts", async () => {
    /* ... */
  });
});
```
