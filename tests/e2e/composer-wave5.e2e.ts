import { expect, test, type Page } from "@playwright/test";

/**
 * E2E smoke for Wave 5 — Composer Decomposition (P1-1).
 *
 * The composer shell was split into focused hooks/subcomponents. These smokes
 * behavior-lock the two flows most at risk from that refactor — localStorage
 * autosave → restore-draft banner (useComposerDrafts) and the ⌘K keyboard
 * shortcut that toggles the AI panel (useComposerShortcuts) — without fragile
 * publish-path interactions.
 */

const BASE = "http://127.0.0.1:3000";
const TEST_PASSWORD = "Pass-E2E-Wave5-2025!";
const TEST_NAME = "Composer Wave5";

let sessionCookie: { name: string; value: string; domain: string; path: string } | null = null;

test.beforeAll(async () => {
  const id = Date.now().toString(36);
  const email = `e2e-composer-${id}@example.com`;

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

function tweetEditor(page: Page) {
  return page.getByPlaceholder("What's on your mind?").first();
}

test("composer loads with an editable tweet field and no page errors", async ({ page }) => {
  await setupAuth(page);
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/dashboard/compose", { waitUntil: "domcontentloaded" });

  await expect(tweetEditor(page)).toBeVisible();
  expect(errors).toEqual([]);
});

test("autosave persists a draft and the restore banner re-offers it after reload", async ({
  page,
}) => {
  await setupAuth(page);
  await page.goto("/dashboard/compose", { waitUntil: "domcontentloaded" });

  const draftText = `Wave5 autosave smoke ${Date.now()}`;
  await tweetEditor(page).fill(draftText);

  // Autosave debounce is 2s — wait for localStorage to be written before reload.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("astra-post-drafts")), { timeout: 6000 })
    .toContain("Wave5 autosave smoke");

  await page.reload({ waitUntil: "domcontentloaded" });

  const banner = page.getByText("unsaved draft from a previous session", { exact: false });
  await expect(banner).toBeVisible();

  await page.getByRole("button", { name: "Restore" }).click();
  await expect(tweetEditor(page)).toHaveValue(draftText);
});

test("the ⌘K / Ctrl+K shortcut opens the AI tools panel", async ({ page }) => {
  await setupAuth(page);
  await page.goto("/dashboard/compose", { waitUntil: "domcontentloaded" });
  await expect(tweetEditor(page)).toBeVisible();

  const aiPanel = page.getByRole("tablist", { name: "AI tool" });
  await expect(aiPanel).toBeHidden();

  await page.keyboard.press("ControlOrMeta+k");
  await expect(aiPanel).toBeVisible();
});
