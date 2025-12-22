import { test, expect, type Page } from "@playwright/test";
import { getQaDealIdsOrThrow, loginAsQa } from "./_helpers/qaAuth";

const PLAYWRIGHT_ENABLED = process.env.PLAYWRIGHT_ENABLE === "true";
const describeMaybe = PLAYWRIGHT_ENABLED ? test.describe : test.describe.skip;

const DEAL_REQUIRED_PATHS = new Set([
  "/overview",
  "/underwrite",
  "/repairs",
  "/trace",
  "/runs",
  "/sources",
]);

const cases = [
  { name: "overviewTab", path: "/overview", viewport: { width: 1919, height: 1124 } },
  { name: "underwriteTab", path: "/underwrite", viewport: { width: 471, height: 1180 } },
  { name: "RepairsTab", path: "/repairs", viewport: { width: 608, height: 1046 } },
  { name: "UserSettings", path: "/settings", viewport: { width: 1918, height: 1140 } },
  { name: "SandboxSettings", path: "/sandbox", viewport: { width: 1919, height: 1126 } },
  { name: "AiBridgeDebug", path: "/ai-bridge/debug", viewport: { width: 1919, height: 1124 } },
];

const buildPath = (path: string, readyDealId: string) => {
  if (!DEAL_REQUIRED_PATHS.has(path)) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}dealId=${readyDealId}`;
};

async function waitForReady(page: Page, path: string) {
  if (path === "/overview") {
    await expect(page.getByRole("link", { name: /Dashboard/i }).first()).toBeVisible();
    return;
  }

  if (path === "/underwrite") {
    await expect(page.getByRole("heading", { name: /Underwrite/i }).first()).toBeVisible();
    return;
  }

  if (path === "/repairs") {
    await expect(page.getByRole("heading", { name: /Repairs/i }).first()).toBeVisible();
    return;
  }

  if (path === "/settings") {
    await expect(page.getByRole("heading", { name: /Settings/i }).first()).toBeVisible();
    return;
  }

  if (path === "/sandbox") {
    await expect(page.getByRole("button", { name: /Business Logic Sandbox/i })).toBeVisible();
    return;
  }

  if (path === "/ai-bridge/debug") {
    await expect(page.getByRole("heading", { name: /AI Bridge Debug/i })).toBeVisible();
    return;
  }
}

describeMaybe("pixel snapshots @pixel", () => {
  for (const r of cases) {
    test(`pixel ${r.name}`, async ({ page }) => {
      const { readyDealId } = getQaDealIdsOrThrow();
      await loginAsQa(page);

      await page.setViewportSize(r.viewport); // lock geometry
      await page.goto(buildPath(r.path, readyDealId));
      await waitForReady(page, r.path);
      await page.evaluate(async () => {
        if (document.fonts) {
          await document.fonts.ready;
        }
      });

      await expect(page).not.toHaveURL(/\/login/i);
      await expect(page).not.toHaveURL(/\/_not-found|404/i);
      await expect(page).toHaveScreenshot(`${r.name}.png`, { fullPage: false });
    });
  }
});
