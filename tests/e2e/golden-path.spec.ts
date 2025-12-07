import { test, expect } from "@playwright/test";

const QA_EMAIL =
  process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
const QA_PASSWORD =
  process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;
const QA_READY_DEAL_ID = process.env.DEALENGINE_QA_READY_DEAL_ID;
const QA_READY_CLIENT_NAME = process.env.DEALENGINE_QA_READY_CLIENT_NAME ?? "QA Ready Client";

test.describe("HPS DealEngine golden path", () => {
  test.skip(
    !QA_EMAIL || !QA_PASSWORD || !QA_READY_DEAL_ID,
    "Set DEALENGINE_QA_USER_EMAIL, DEALENGINE_QA_USER_PASSWORD, and DEALENGINE_QA_READY_DEAL_ID to run this test.",
  );

  test("login and load seeded clean deal overview/underwrite/trace", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("email").fill(QA_EMAIL!);
    await page.getByPlaceholder("password").fill(QA_PASSWORD!);
    const signInButton = page.getByRole("button", { name: /Sign in/i }).first();
    await signInButton.click();

    await page.waitForURL("**/startup**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
    const viewAllDeals = page.getByRole("button", { name: /View all deals/i }).first();
    await expect(viewAllDeals).toBeVisible();
    await viewAllDeals.click();
    await page.waitForURL("**/deals**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Deals/i })).toBeVisible();

    // Navigate directly to the seeded clean deal (dashboard) to avoid UI creation randomness.
    await page.goto(`/overview?dealId=${QA_READY_DEAL_ID}`);
    await page.waitForURL("**/overview**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();

    if (QA_READY_CLIENT_NAME) {
      // For seeded QA deals, the READY label string may appear in multiple places on the overview
      // page (card header, toolbar, breadcrumbs, etc.). We only care that at least one copy is
      // visible, so we resolve the locator to the first match to avoid strict mode violations.
      const label = page.getByText(QA_READY_CLIENT_NAME).first();
      await expect(label).toBeVisible();
    }

    // Navigate via nav to Underwrite
    await page.getByRole("link", { name: /Underwrite/i }).first().click();
    await page.waitForURL("**/underwrite**", { timeout: 60_000 });

    const underwriteHeading = page.getByRole("heading", { name: /Underwrite/i }).first();
    await expect(underwriteHeading).toBeVisible();

    // Navigate via nav to Repairs
    await page.getByRole("link", { name: /Repairs/i }).first().click();
    await page.waitForURL("**/repairs**", { timeout: 60_000 });
    const repairsHeading = page.getByRole("heading", { name: /Repairs/i }).first();
    await expect(repairsHeading).toBeVisible();

    // Navigate via nav to Trace
    await page.getByRole("link", { name: /Trace/i }).first().click();
    await page.waitForURL("**/trace**", { timeout: 60_000 });
    const traceHeading = page.getByRole("heading", { name: /Runs Trace/i }).first();
    await expect(traceHeading).toBeVisible();
  });
});
