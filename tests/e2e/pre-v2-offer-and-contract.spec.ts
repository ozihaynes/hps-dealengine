import { test, expect } from "@playwright/test";
import { getQaDealIdsOrThrow, loginAsQa } from "./_helpers/qaAuth";

const QA_EMAIL =
  process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
const QA_PASSWORD =
  process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;
const QA_READY_DEAL_ID = process.env.DEALENGINE_QA_READY_DEAL_ID;
const QA_VALUATION_DEAL_ID = process.env.DEALENGINE_QA_VALUATION_DEAL_ID;

const CONTRACT_PRICE = "123456";

test.describe("pre-v2-offer-and-contract: Pre-V2 valuation rails", () => {
  test.skip(
    !QA_EMAIL || !QA_PASSWORD || !QA_READY_DEAL_ID,
    "Set DEALENGINE_QA_USER_EMAIL, DEALENGINE_QA_USER_PASSWORD, and DEALENGINE_QA_READY_DEAL_ID to run this test.",
  );

  test("offer package flow", async ({ page }) => {
    const { readyDealId } = getQaDealIdsOrThrow();
    await loginAsQa(page);

    await page.goto(`/overview?dealId=${readyDealId}`);
    await page.waitForURL("**/overview**", { timeout: 60_000 });

    const workflowPill = page.getByTestId("workflow-pill");
    await expect(workflowPill).toBeVisible();
    await expect(workflowPill).toContainText(/Ready/i);

    const clientButton = page.getByRole("button", { name: /view/i }).first();
    await expect(clientButton).toBeVisible();
    await clientButton.click();

    const sendOfferButton = page.getByTestId("cta-send-offer");
    await expect(sendOfferButton).toBeEnabled();
    await sendOfferButton.click();

    await page.waitForURL(/\/offer-packages\//, { timeout: 60_000 });

    const offerPackagePage = page.getByTestId("offer-package-page");
    await expect(offerPackagePage).toBeVisible();

    const offerAmount = page.getByTestId("offer-package-amount");
    await expect(offerAmount).toBeVisible();
    const amountText = (await offerAmount.textContent())?.trim() ?? "";
    expect(amountText).not.toEqual("");
    expect(amountText).not.toEqual("-");
  });

  test("under contract capture flow", async ({ page }) => {
    const { readyDealId } = getQaDealIdsOrThrow();
    await loginAsQa(page);

    await page.goto(`/overview?dealId=${readyDealId}`);
    await page.waitForURL("**/overview**", { timeout: 60_000 });

    const markUnderContract = page.getByTestId("cta-mark-under-contract");
    await expect(markUnderContract).toBeVisible();
    await markUnderContract.click();

    const contractPriceInput = page.getByTestId("contract-executed-price");
    await expect(contractPriceInput).toBeVisible();
    await contractPriceInput.fill(CONTRACT_PRICE);

    const submitButton = page.getByTestId("contract-submit");
    await submitButton.click();
    await expect(page.getByText("Deal marked under contract.")).toBeVisible({ timeout: 20_000 });

    await page.goto(`/underwrite?dealId=${readyDealId}`);
    await page.waitForURL(new RegExp(`/underwrite\\?dealId=${readyDealId}`), {
      timeout: 60_000,
    });

    const executedPrice = page.getByTestId("executed-contract-price");
    await expect(executedPrice).toBeVisible();
    await expect
      .poll(
        async () => {
          const text = (await executedPrice.textContent()) ?? "";
          return text.replace(/\D/g, "");
        },
        { timeout: 20_000 },
      )
      .toContain(CONTRACT_PRICE);
    const executedText = (await executedPrice.textContent()) ?? "";
    expect(executedText).toContain("$");
  });

  test("market provenance trace present", async ({ page }) => {
    const { readyDealId } = getQaDealIdsOrThrow();
    const valuationDealId = QA_VALUATION_DEAL_ID ?? readyDealId;
    await loginAsQa(page);

    await page.goto(`/trace?dealId=${valuationDealId}`);
    await page.waitForURL("**/trace**", { timeout: 60_000 });

    const provenanceTrace = page.getByTestId("trace-frame-MARKET_PROVENANCE");
    await expect(provenanceTrace).toBeAttached();
  });
});
