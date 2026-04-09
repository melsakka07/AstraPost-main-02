import { expect, test, type Page } from "@playwright/test";

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/dashboard/queue",
  "/dashboard/calendar",
  "/dashboard/analytics",
] as const;

async function ensureAuthenticated(page: Page) {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  if (!page.url().includes("/login")) {
    return;
  }

  const id = Date.now().toString(36);
  const email = `ui-regression-${id}@example.com`;
  const password = `Pass-${id}-Secure!`;

  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Name").fill("UI Regression");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

async function expectNoMainDoubleScrollbar(page: Page) {
  const problematicScrollableContainers = await page.evaluate(() => {
    const isVisible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const entries = Array.from(document.querySelectorAll<HTMLElement>("*"));
    return entries.filter((el) => {
      const style = window.getComputedStyle(el);
      const canScroll =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight + 1;
      const wideMainRegion = el.clientWidth > window.innerWidth * 0.5;
      return canScroll && wideMainRegion && isVisible(el);
    }).length;
  });

  expect(problematicScrollableContainers).toBe(0);
}

async function expectFooterVisibleAndNotClipped(page: Page) {
  const footer = page.locator("footer").first();
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  const footerBox = await footer.boundingBox();
  expect(footerBox).not.toBeNull();
  expect(footerBox!.x).toBeGreaterThanOrEqual(0);
  expect(footerBox!.x + footerBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
}

test("dashboard routes keep single-page scrolling and footer integrity", async ({ page }) => {
  await ensureAuthenticated(page);

  for (const route of DASHBOARD_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expectNoMainDoubleScrollbar(page);
    await expectFooterVisibleAndNotClipped(page);
  }
});

test("queue and analytics support density toggles", async ({ page }) => {
  await ensureAuthenticated(page);

  await page.goto("/dashboard/queue", { waitUntil: "domcontentloaded" });
  const queueCompact = page.getByRole("link", { name: "Compact" }).first();
  if (await queueCompact.isVisible()) {
    await queueCompact.click();
    await expect(page).toHaveURL(/density=compact/);
  }

  await page.goto("/dashboard/analytics", { waitUntil: "domcontentloaded" });
  const analyticsCompact = page.getByRole("link", { name: "Compact" }).first();
  if (await analyticsCompact.isVisible()) {
    await analyticsCompact.click();
    await expect(page).toHaveURL(/density=compact/);
  }
});
