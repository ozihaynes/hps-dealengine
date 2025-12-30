import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { getQaDealIdsOrThrow, loginAsQa } from "./_helpers/qaAuth";

const QA_EMAIL =
  process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
const QA_PASSWORD =
  process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;
const QA_READY_DEAL_ID = process.env.DEALENGINE_QA_READY_DEAL_ID;
const AUDIT_DIR = process.env.HPS_UI_AUDIT_DIR;

test.describe("DealFlow Guide UI proof", () => {
  test.skip(
    !QA_EMAIL || !QA_PASSWORD || !QA_READY_DEAL_ID || !AUDIT_DIR,
    "Set DEALENGINE_QA_USER_EMAIL, DEALENGINE_QA_USER_PASSWORD, DEALENGINE_QA_READY_DEAL_ID, and HPS_UI_AUDIT_DIR to run this test.",
  );

  test("renders guide and captures task-states response", async ({ page }) => {
    const { readyDealId } = getQaDealIdsOrThrow();
    const auditDir = AUDIT_DIR!;
    fs.mkdirSync(auditDir, { recursive: true });

    await loginAsQa(page);

    await page.goto(`/underwrite?dealId=${readyDealId}`);
    await page.waitForURL("**/underwrite**", { timeout: 60_000 });

    const guideButton = page.getByRole("button", { name: /^Guide$/i });
    await expect(guideButton).toBeVisible();

    const taskStatesResponse = page.waitForResponse(
      (resp) =>
        resp.url().includes("/functions/v1/v1-deal-task-states") &&
        resp.request().method() === "POST" &&
        resp.status() === 200,
      { timeout: 60_000 },
    );

    await guideButton.click();
    await expect(page.getByRole("dialog", { name: "DealFlow Guide" })).toBeVisible();

    const taskResp = await taskStatesResponse;
    const taskJson = await taskResp.json();

    fs.writeFileSync(
      path.join(auditDir, "captured_task_states.json"),
      JSON.stringify(taskJson, null, 2),
      "utf8",
    );

    await page.screenshot({ path: path.join(auditDir, "screenshot.png"), fullPage: true });
  });
});
