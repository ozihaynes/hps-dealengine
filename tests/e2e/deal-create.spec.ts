import { test, expect } from "@playwright/test";
import { loginAsQa } from "./_helpers/qaAuth";

const PLAYWRIGHT_ENABLED = process.env.PLAYWRIGHT_ENABLE === "true";
const describeMaybe = PLAYWRIGHT_ENABLED ? test.describe : test.describe.skip;

const QA_EMAIL =
  process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
const QA_PASSWORD =
  process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;

const missingCoreEnv = !QA_EMAIL || !QA_PASSWORD;
const qaTest = missingCoreEnv ? test.skip : test;

const CREATED_DEAL = {
  clientName: "QA E2E Created Deal",
  clientPhone: "407-555-0111",
  clientEmail: "qa-created@test.local",
  propertyStreet: "100 QA E2E St",
  propertyCity: "Orlando",
  propertyState: "FL",
  propertyPostalCode: "32801",
};

describeMaybe("Deal creation - Run New Deal", () => {
  qaTest("creates a deal from /startup and navigates to deal routes", async ({ page }) => {
    await loginAsQa(page);

    await page.goto("/startup");
    await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();

    const runNewDeal = page.getByRole("button", { name: /Run New Deal/i }).first();
    await expect(runNewDeal).toBeVisible();
    await runNewDeal.click();

    const dialog = page.getByRole("dialog", { name: /Start New Deal/i });
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("Enter client full name").fill(CREATED_DEAL.clientName);
    await dialog.getByPlaceholder("(555) 000-0000").fill(CREATED_DEAL.clientPhone);
    await dialog.getByPlaceholder("client@email.com").fill(CREATED_DEAL.clientEmail);
    await dialog.getByPlaceholder("Search for an address").fill(CREATED_DEAL.propertyStreet);
    await dialog.getByPlaceholder("City").fill(CREATED_DEAL.propertyCity);
    await dialog.getByPlaceholder("State").fill(CREATED_DEAL.propertyState);
    await dialog.getByPlaceholder("ZIP").fill(CREATED_DEAL.propertyPostalCode);

    const startDeal = dialog.getByRole("button", { name: /Start Deal/i });
    await expect(startDeal).toBeEnabled();
    await startDeal.click();

    await page.waitForURL(
      (url) => url.pathname.endsWith("/underwrite") && url.searchParams.has("dealId"),
      { timeout: 60_000 },
    );
    await expect(page.getByRole("heading", { name: /Underwrite/i }).first()).toBeVisible();

    const dealId = new URL(page.url()).searchParams.get("dealId");
    expect(dealId).toBeTruthy();

    await page.goto(`/overview?dealId=${dealId}`);
    await expect(page.getByRole("link", { name: /Dashboard/i }).first()).toBeVisible();

    await page.goto(`/underwrite?dealId=${dealId}`);
    await expect(page.getByRole("heading", { name: /Underwrite/i }).first()).toBeVisible();
  });
});
