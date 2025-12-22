import { test, expect } from "@playwright/test";
import { loginAsQa } from "./_helpers/qaAuth";

const QA_EMAIL =
  process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
const QA_PASSWORD =
  process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;
const QA_TIMELINE_DEAL_ID = process.env.DEALENGINE_QA_TIMELINE_DEAL_ID;
const QA_TIMELINE_DTM_DAYS = Number(process.env.DEALENGINE_QA_TIMELINE_DTM_DAYS ?? "");
const QA_TIMELINE_CARRY_MONTHS = Number(process.env.DEALENGINE_QA_TIMELINE_CARRY_MONTHS ?? "");
const QA_TIMELINE_SPEED_BAND = process.env.DEALENGINE_QA_TIMELINE_SPEED_BAND;
const missingTimelineEnv = !QA_EMAIL || !QA_PASSWORD || !QA_TIMELINE_DEAL_ID;

/**
 * Timeline & Carry e2e coverage using seeded deterministic deal.
 */
test.describe("Timeline & Carry - overview + trace", () => {
  test.skip(
    missingTimelineEnv,
    "Set DEALENGINE_QA_USER_EMAIL, DEALENGINE_QA_USER_PASSWORD, and DEALENGINE_QA_TIMELINE_DEAL_ID to run this test.",
  );

  test("renders policy-driven timeline & carry data on /overview and /trace", async ({ page }) => {
    await loginAsQa(page);
    await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
    const viewAllDeals = page.getByRole("button", { name: /View all deals/i }).first();
    await viewAllDeals.click();
    await page.waitForURL("**/deals**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /^Deals$/, level: 1 })).toBeVisible();

    await page.goto(`/overview?dealId=${QA_TIMELINE_DEAL_ID}`);
    await expect(page.getByText("Timeline & Carry").first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/Speed: (fast|balanced|slow)/i).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/Days to money/i).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/Carry Months/i).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/Monthly Hold/i).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/Total Carry/i).first()).toBeVisible({ timeout: 60000 });

    if (!Number.isNaN(QA_TIMELINE_DTM_DAYS)) {
      await expect(page.getByTestId("timeline-dtm-value")).toHaveText(
        new RegExp(`${QA_TIMELINE_DTM_DAYS}`),
      );
    }
    if (!Number.isNaN(QA_TIMELINE_CARRY_MONTHS)) {
      await expect(page.getByTestId("timeline-carry-months")).toHaveText(
        new RegExp(`${QA_TIMELINE_CARRY_MONTHS}(\\.0)?`),
      );
    }
    if (QA_TIMELINE_SPEED_BAND) {
      await expect(page.getByTestId("timeline-speed-band")).toContainText(
        new RegExp(QA_TIMELINE_SPEED_BAND, "i"),
      );
    }

    await page.goto(`/trace?dealId=${QA_TIMELINE_DEAL_ID}`);
    await expect(page.getByText(/Timeline & Carry/i).first()).toBeVisible();
    await expect(page.getByText(/Speed band/i).first()).toBeVisible();
    await expect(page.getByText(/Days to money/i).first()).toBeVisible();
    await expect(page.getByText(/Carry months/i).first()).toBeVisible();
  });
});
