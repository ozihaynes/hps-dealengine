import { test, expect } from "@playwright/test";

const PLAYWRIGHT_ENABLED = process.env.PLAYWRIGHT_ENABLE === "true";
const describeMaybe = PLAYWRIGHT_ENABLED ? test.describe : test.describe.skip;

const cases = [
  { name: "overviewTab",     path: "/overview",   viewport: { width: 1919, height: 1124 } },
  { name: "underwriteTab",   path: "/underwrite", viewport: { width:  471, height: 1180 } },
  { name: "RepairsTab",      path: "/repairs",    viewport: { width:  608, height: 1046 } },
  { name: "UserSettings",    path: "/settings",   viewport: { width: 1918, height: 1140 } },
  { name: "SandboxSettings", path: "/sandbox",    viewport: { width: 1919, height: 1126 } },
  { name: "UnderwriteDebug", path: "/underwrite/debug", viewport: { width: 1919, height: 1124 } },
];

describeMaybe("pixel snapshots", () => {
  for (const r of cases) {
    test(`pixel ${r.name}`, async ({ page }) => {
      await page.setViewportSize(r.viewport); // lock geometry
      await page.goto(r.path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot(`${r.name}.png`, { fullPage: false });
    });
  }
});
