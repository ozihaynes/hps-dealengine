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

    await page.getByLabel("Email address").fill(QA_EMAIL!);
    await page.getByLabel("Password").fill(QA_PASSWORD!);
    await page.getByRole("button", { name: /Sign in/i }).first().click();

    await page.waitForURL("**/startup**", { timeout: 60_000 });

    // Go directly to Underwrite with the target deal to ensure DealSession is set.
    await page.goto(`/underwrite?dealId=${QA_READY_DEAL_ID}`);
    await page.waitForURL("**/underwrite**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Underwrite/i }).first()).toBeVisible();

    const arvInput = page.getByLabel("ARV");
    await arvInput.fill("");
    await arvInput.fill("456789");

    const occupancySelect = page.getByLabel("Occupancy");
    await occupancySelect.selectOption("tenant");

    await expect(page.getByText(/Saved/i).first()).toBeVisible({ timeout: 15_000 });

    // Repairs tab: set sqft and quick estimate selections
    await page.goto(`/repairs?dealId=${QA_READY_DEAL_ID}`);
    await page.waitForURL("**/repairs**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Repairs/i }).first()).toBeVisible();

    const sqftInput = page.getByPlaceholder("Enter sqft");
    await sqftInput.fill("");
    await sqftInput.fill("1111");

    const rehabSelect = page.getByLabel("Rehab Level (PSF Tiers)");
    await rehabSelect.selectOption("light");

    const roofCheckbox = page.getByRole("checkbox", { name: /roof/i }).first();
    await roofCheckbox.check();

    await expect(page.getByText(/Saved/i).first()).toBeVisible({ timeout: 15_000 });

    // Hard refresh
    await page.reload();
    await page.waitForURL("**/repairs**", { timeout: 60_000 });

    await expect(sqftInput).toHaveValue("1111");
    await expect(rehabSelect).toHaveValue("light");
    await expect(roofCheckbox).toBeChecked();

    // Back to Underwrite and confirm persistence
    await page.goto(`/underwrite?dealId=${QA_READY_DEAL_ID}`);
    await page.waitForURL("**/underwrite**", { timeout: 60_000 });
    await expect(arvInput).toHaveValue("456789");
    await expect(occupancySelect).toHaveValue("tenant");
  });
});
