import { test, expect } from "@playwright/test";
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

describeMaybe("pixel snapshots", () => {
  for (const r of cases) {
    test(`pixel ${r.name}`, async ({ page }) => {
      const { readyDealId } = getQaDealIdsOrThrow();
      await loginAsQa(page);

      await page.setViewportSize(r.viewport); // lock geometry
      await page.goto(buildPath(r.path, readyDealId));
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(200);

      await expect(page).not.toHaveURL(/\/login/i);
      await expect(page).not.toHaveURL(/\/_not-found|404/i);
      await expect(page).toHaveScreenshot(`${r.name}.png`, { fullPage: false });
    });
  }
});
