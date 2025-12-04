import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.DEALENGINE_TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.DEALENGINE_TEST_USER_PASSWORD;

test.describe("HPS DealEngine golden path", () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "Set DEALENGINE_TEST_USER_EMAIL and DEALENGINE_TEST_USER_PASSWORD to run this test.",
  );

  test("login, start new deal, and land on overview", async ({ page }) => {
    const timestamp = Date.now();
    const clientName = `Playwright Client ${timestamp}`;
    const clientPhone = "555-0101";
    const clientEmail = `qa+${timestamp}@example.com`;
    const street = "123 Playwright Way";
    const city = "Testville";
    const state = "FL";
    const postal = "32801";

    await page.goto("/login");

    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD!);
    await page.getByRole("button", { name: /Initialize Session/i }).click();

    await page.waitForURL("**/startup", { timeout: 60_000 });

    await page.getByRole("button", { name: /Run New Deal/i }).click();
    await expect(page.getByRole("heading", { name: /Start New Deal/i })).toBeVisible();

    await page.getByPlaceholder("Enter client full name").fill(clientName);
    await page.getByPlaceholder("(555) 000-0000").fill(clientPhone);
    await page.getByPlaceholder("client@email.com").fill(clientEmail);
    await page.getByPlaceholder("Street address").fill(street);
    await page.getByPlaceholder("City").fill(city);
    await page.getByPlaceholder("State").fill(state);
    await page.getByPlaceholder("ZIP").fill(postal);

    await page.getByRole("button", { name: /Start Deal/i }).click();

    await page.waitForURL("**/overview", { timeout: 60_000 });

    await expect(page.getByRole("button", { name: clientName })).toBeVisible();

    await page.goto("/underwrite");
    await expect(page.getByRole("heading", { name: /Underwrite/i })).toBeVisible();

    await page.goto("/repairs");
    await expect(page.getByRole("heading", { name: /Repairs/i })).toBeVisible();

    await page.goto("/trace");
    await expect(page.getByText(/Trace/i)).toBeVisible();
  });
});
