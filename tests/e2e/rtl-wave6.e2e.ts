import { expect, test, type Page } from "@playwright/test";

/**
 * E2E smoke for Wave 6 — Task 1 (RTL / Arabic, Phase 1).
 *
 * Locks the core RTL contract: with the Arabic locale active, the document is
 * rendered dir="rtl" lang="ar" and the dashboard's physical→logical class sweep
 * produces no runtime errors, with the desktop sidebar mirrored to the right
 * (start side = right under RTL).
 *
 * Locale is selected by the `locale` cookie (see src/app/layout.tsx — the
 * detection order is ?lang= → `locale` cookie → Accept-Language → user.language).
 * Auth reuses the register+session-cookie pattern from inspiration-wave6.e2e.ts
 * because /dashboard is auth-gated and the X OAuth callback can't run on Vercel
 * previews — run locally (pnpm dev) or on prod post-merge.
 */

const BASE = "http://127.0.0.1:3000";
const TEST_PASSWORD = "Pass-E2E-RTL-2025!";
const TEST_NAME = "RTL Wave6";

let sessionCookie: { name: string; value: string; domain: string; path: string } | null = null;

const localeCookie = {
  name: "locale",
  value: "ar",
  domain: "127.0.0.1",
  path: "/",
};

test.beforeAll(async () => {
  const id = Date.now().toString(36);
  const email = `e2e-rtl-${id}@example.com`;

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

async function setupAuthAndLocale(page: Page) {
  if (!sessionCookie) throw new Error("Session cookie not initialized");
  await page.context().addCookies([sessionCookie, localeCookie]);
}

test("dashboard renders dir=rtl lang=ar in the Arabic locale with no page errors", async ({
  page,
}) => {
  await setupAuthAndLocale(page);
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(html).toHaveAttribute("lang", "ar");
  expect(errors).toEqual([]);
});

test("desktop sidebar is mirrored to the right under RTL", async ({ page }) => {
  await setupAuthAndLocale(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  // The persistent desktop sidebar (md:flex) sits on the start side, which is the
  // right under RTL — its left edge should be past the viewport midpoint.
  const sidebar = page.locator("nav").first();
  await expect(sidebar).toBeVisible();
  const box = await sidebar.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThan(640);
  }
});
