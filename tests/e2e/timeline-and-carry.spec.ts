import { test, expect, type Page } from "@playwright/test";

const QA_EMAIL =
  process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
const QA_PASSWORD =
  process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;
const QA_TIMELINE_DEAL_ID = process.env.DEALENGINE_QA_TIMELINE_DEAL_ID;
const QA_TIMELINE_DTM_DAYS = Number(process.env.DEALENGINE_QA_TIMELINE_DTM_DAYS ?? "");
const QA_TIMELINE_CARRY_MONTHS = Number(process.env.DEALENGINE_QA_TIMELINE_CARRY_MONTHS ?? "");
const QA_TIMELINE_SPEED_BAND = process.env.DEALENGINE_QA_TIMELINE_SPEED_BAND;
const missingTimelineEnv = !QA_EMAIL || !QA_PASSWORD || !QA_TIMELINE_DEAL_ID;

async function login(page: Page) {
  if (!QA_EMAIL || !QA_PASSWORD) {
    throw new Error("Set DEALENGINE_QA_USER_EMAIL and DEALENGINE_QA_USER_PASSWORD to run this test.");
  }
  await page.goto("/login");
  await page.getByLabel("Email address").fill(QA_EMAIL);
  await page.getByLabel("Password").fill(QA_PASSWORD);
  const signInButton = page.getByRole("button", { name: /Sign in/i }).first();
  await signInButton.click();
  await page.waitForURL("**/startup", { timeout: 60_000 });
}

/**
 * Timeline & Carry e2e coverage using seeded deterministic deal.
 */
test.describe("Timeline & Carry — overview + trace", () => {
  test.skip(
    missingTimelineEnv,
    "Set DEALENGINE_QA_USER_EMAIL, DEALENGINE_QA_USER_PASSWORD, and DEALENGINE_QA_TIMELINE_DEAL_ID to run this test.",
  );

  test("renders policy-driven timeline & carry data on /overview and /trace", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
    const viewAllDeals = page.getByRole("button", { name: /View all deals/i }).first();
    await viewAllDeals.click();
    await page.waitForURL("**/deals**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Deals/i })).toBeVisible();

    await page.goto(`/overview?dealId=${QA_TIMELINE_DEAL_ID}`);
    await expect(page.getByText("Timeline & Carry")).toBeVisible();
    await expect(page.getByText(/Speed: (fast|balanced|slow)/i)).toBeVisible();
    await expect(page.getByText(/Days to money/i)).toBeVisible();
    await expect(page.getByText(/Carry Months/i)).toBeVisible();
    await expect(page.getByText(/Monthly Hold/i)).toBeVisible();
    await expect(page.getByText(/Total Carry/i)).toBeVisible();

    if (!Number.isNaN(QA_TIMELINE_DTM_DAYS)) {
      await expect(page.getByText(new RegExp(`${QA_TIMELINE_DTM_DAYS}\\s*days`, "i"))).toBeVisible();
    }
    if (!Number.isNaN(QA_TIMELINE_CARRY_MONTHS)) {
      await expect(
        page.getByText(new RegExp(`${QA_TIMELINE_CARRY_MONTHS}\\s*carry`, "i")),
      ).toBeVisible();
    }
    if (QA_TIMELINE_SPEED_BAND) {
      await expect(page.getByText(new RegExp(QA_TIMELINE_SPEED_BAND, "i"))).toBeVisible();
    }

    await page.goto(`/trace?dealId=${QA_TIMELINE_DEAL_ID}`);
    await expect(page.getByText(/Timeline & Carry/i)).toBeVisible();
    await expect(page.getByText(/Speed band/i)).toBeVisible();
    await expect(page.getByText(/Days to money/i)).toBeVisible();
    await expect(page.getByText(/Carry months/i)).toBeVisible();
  });
});
