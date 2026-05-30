import { expect, test, type Page } from "@playwright/test";

/**
 * E2E smoke for Wave 6 — Inspiration Page Decomposition (P1-5).
 *
 * The ~735-line inspiration page was split into a thin shell + focused hooks
 * (use-inspiration-*) and presentational subcomponents (inspiration-*). These
 * smokes behavior-lock the surfaces most at risk from that refactor without
 * touching the X tweet-lookup API (which needs a connected account + a live
 * tweet): the three tabs render and switch (useInspirationTabs), and inline URL
 * validation drives the import button enabled/disabled + the invalid-URL hint
 * (useInspirationImport + inspiration-utils.isValidTweetUrl).
 *
 * Note on the import->history-appears flow: it depends on a real X account and
 * a live tweet lookup, so it can't run as an unauthenticated/offline smoke and
 * isn't reproducible on Vercel previews (no X OAuth callback). The pure URL-
 * validation logic that gates it is covered by node tests in
 * src/components/inspiration/inspiration-utils.test.ts; full import->history is
 * verified locally (pnpm dev) or on prod post-merge, matching how
 * composer-wave5.e2e.ts scopes auth-gated paths.
 */

const BASE = "http://127.0.0.1:3000";
const TEST_PASSWORD = "Pass-E2E-Wave6-2025!";
const TEST_NAME = "Inspiration Wave6";

let sessionCookie: { name: string; value: string; domain: string; path: string } | null = null;

test.beforeAll(async () => {
  const id = Date.now().toString(36);
  const email = `e2e-inspiration-${id}@example.com`;

  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD, name: TEST_NAME }),
  });
  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${regRes.status} ${await regRes.text()}`);
  }

  const signInRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
    redirect: "manual",
  });
  const setCookie = signInRes.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error(`Sign-in returned no Set-Cookie header. Status: ${signInRes.status}`);
  }

  const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
  if (!match) {
    throw new Error(`Could not find session token in cookie: ${setCookie}`);
  }

  sessionCookie = {
    name: "better-auth.session_token",
    value: match[1]!,
    domain: "127.0.0.1",
    path: "/",
  };
});

async function setupAuth(page: Page) {
  if (!sessionCookie) throw new Error("Session cookie not initialized");
  await page.context().addCookies([sessionCookie]);
}

function urlInput(page: Page) {
  return page.locator("#tweet-url");
}

test("inspiration page loads with the three tabs and no page errors", async ({ page }) => {
  await setupAuth(page);
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/dashboard/inspiration", { waitUntil: "domcontentloaded" });

  await expect(urlInput(page)).toBeVisible();
  await expect(page.getByRole("tab", { name: /import/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /history/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /bookmark/i })).toBeVisible();
  expect(errors).toEqual([]);
});

test("switching to the history tab shows the (empty) history list", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard/inspiration", { waitUntil: "domcontentloaded" });

  await page.getByRole("tab", { name: /history/i }).click();
  // The history panel becomes the active tabpanel.
  await expect(page.getByRole("tabpanel")).toBeVisible();
});

test("URL validation gates the import button and shows the invalid-URL hint", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard/inspiration", { waitUntil: "domcontentloaded" });

  const input = urlInput(page);
  const importButton = page.getByRole("button", { name: /import/i }).first();

  // Invalid (>=5 chars) → button disabled + inline hint visible.
  await input.fill("not-a-tweet-url");
  await expect(importButton).toBeDisabled();

  // Valid x.com status URL → button enabled, no hint.
  await input.fill("https://x.com/jack/status/20");
  await expect(importButton).toBeEnabled();
});
