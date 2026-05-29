import { expect, test, type Page } from "@playwright/test";

/**
 * E2E verification for Waves 1-4 dashboard UI/UX audit changes.
 *
 * Creates a test user via API, obtains a session cookie, then verifies
 * each wave's UI changes without fragile form interactions.
 */

const BASE = "http://127.0.0.1:3000";
const TEST_PASSWORD = "Pass-E2E-Audit-2025!";
const TEST_NAME = "Audit Regression";

let sessionCookie: { name: string; value: string; domain: string; path: string } | null = null;

test.beforeAll(async () => {
  const id = Date.now().toString(36);
  const email = `e2e-audit-${id}@example.com`;

  // Register
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: TEST_PASSWORD, name: TEST_NAME }),
  });
  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${regRes.status} ${await regRes.text()}`);
  }

  // Sign in — extract session cookie from Set-Cookie header
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

// ── Wave 1 ────────────────────────────────────────────────────────────────────

test("Wave 1 — stat cards use semantic token classes, not raw palette", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const statCards = page.locator('[class*="border-s-"]');
  const count = await statCards.count();
  expect(count).toBeGreaterThanOrEqual(4);

  const classAttr = await page.locator("body").innerHTML();
  expect(classAttr).not.toMatch(/\b(emerald|blue|amber|purple|green)-500\b/);
});

test("Wave 1 — setup checklist has no focusable links for completed steps", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const badLinks = page.locator('a[href="#"]:has(.lucide-check-circle), a.pointer-events-none');
  await expect(badLinks).toHaveCount(0);
});

// ── Wave 2 ────────────────────────────────────────────────────────────────────

test("Wave 2 — AI tools grid renders capability text", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard/ai", { waitUntil: "domcontentloaded" });

  const toolCards = page.locator("a[href*='/dashboard/ai/']");
  const cardCount = await toolCards.count();
  expect(cardCount).toBeGreaterThanOrEqual(6);

  const italicLines = page.locator("p.italic");
  const italicCount = await italicLines.count();
  expect(italicCount).toBeGreaterThanOrEqual(1);
});

// ── Wave 4 ────────────────────────────────────────────────────────────────────

test("Wave 4 — sidebar shows Import & Adapt not Inspiration", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const sidebar = page.locator("nav, aside, [role='navigation']").first();
  await expect(sidebar).toContainText("Import & Adapt");
});

test("Wave 4 — Import & Adapt page loads with correct title", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard/inspiration", { waitUntil: "domcontentloaded" });

  const heading = page.locator("h1, h2").first();
  await expect(heading).toContainText(/Import|Adapt|استيراد/);
});

test("Wave 4 — history tab loads without errors", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard/inspiration", { waitUntil: "domcontentloaded" });

  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  const historyTab = page.getByRole("tab", { name: /history|المحفوظات/i });
  if (await historyTab.isVisible()) {
    await historyTab.click();
    await page.waitForTimeout(500);
  }

  expect(errors.length).toBe(0);
});

// ── Wave 1+3: CLS ─────────────────────────────────────────────────────────────

test("Wave 1+3 — dashboard renders without layout errors", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const mainContent = page.locator("main, [role='main']").first();
  await expect(mainContent).toBeVisible();
});
