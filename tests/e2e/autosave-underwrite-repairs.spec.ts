import { test, expect } from "@playwright/test";

const QA_EMAIL =
  process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
const QA_PASSWORD =
  process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;
const QA_READY_DEAL_ID = process.env.DEALENGINE_QA_READY_DEAL_ID;

test.describe("Autosave Underwrite + Repairs", () => {
  test.skip(
    !QA_EMAIL || !QA_PASSWORD || !QA_READY_DEAL_ID,
    "Set DEALENGINE_QA_USER_EMAIL, DEALENGINE_QA_USER_PASSWORD, and DEALENGINE_QA_READY_DEAL_ID to run this test.",
  );

  test("persists inputs across refresh and tabs", async ({ page }) => {
    await page.goto("/login");

    await page.getByTestId("login-email").fill(QA_EMAIL!);
    await page.getByTestId("login-password").fill(QA_PASSWORD!);
    await page.getByTestId("login-submit").click();

    await page.waitForURL("**/startup**", { timeout: 60_000 });

    // Go directly to Underwrite with the target deal to ensure DealSession is set.
    await page.goto(`/underwrite?dealId=${QA_READY_DEAL_ID}`);
    await page.waitForURL("**/underwrite**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Underwrite/i }).first()).toBeVisible();

    const countyInput = page.getByTestId("uw-county");
    await countyInput.fill("");
    await countyInput.fill("Orange");

    const occupancySelect = page.getByTestId("uw-occupancy");
    await occupancySelect.selectOption("tenant");

    await expect(page.getByTestId("autosave-status")).toContainText(/Autosave|Saved|Saving/i);

    // Repairs tab: set sqft and quick estimate selections
    await page.goto(`/repairs?dealId=${QA_READY_DEAL_ID}`);
    await page.waitForURL("**/repairs**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Repairs/i }).first()).toBeVisible();

    const rehabSelect = page.getByTestId("repairs-rehab-level");
    await rehabSelect.selectOption("light");

    const roofCheckbox = page.getByRole("checkbox", { name: /roof/i }).first();
    await roofCheckbox.check();

    await expect(page.getByTestId("autosave-status")).toContainText(/Autosave|Saved|Saving/i);

    // Hard refresh
    await page.reload();
    await page.waitForURL("**/repairs**", { timeout: 60_000 });

    await expect(rehabSelect).toHaveValue("light");
    await expect(roofCheckbox).toBeChecked();

    // Back to Underwrite and confirm persistence
    await page.goto(`/underwrite?dealId=${QA_READY_DEAL_ID}`);
    await page.waitForURL("**/underwrite**", { timeout: 60_000 });
    await expect(countyInput).toHaveValue("Orange");
    await expect(occupancySelect).toHaveValue("tenant");
  });
});
