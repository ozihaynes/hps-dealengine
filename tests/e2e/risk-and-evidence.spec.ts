import { test, expect, type Page } from "@playwright/test";
import { getQaDealIdsOrThrow, loginAsQa } from "./_helpers/qaAuth";

const QA_EMAIL =
  process.env.DEALENGINE_QA_USER_EMAIL ?? process.env.DEALENGINE_TEST_USER_EMAIL;
const QA_PASSWORD =
  process.env.DEALENGINE_QA_USER_PASSWORD ?? process.env.DEALENGINE_TEST_USER_PASSWORD;
const QA_READY_DEAL_ID = process.env.DEALENGINE_QA_READY_DEAL_ID;
const QA_STALE_EVIDENCE_DEAL_ID = process.env.DEALENGINE_QA_STALE_EVIDENCE_DEAL_ID;
const QA_HARD_GATE_DEAL_ID = process.env.DEALENGINE_QA_HARD_GATE_DEAL_ID;
const missingCoreEnv = !QA_EMAIL || !QA_PASSWORD;

const readyTest = missingCoreEnv || !QA_READY_DEAL_ID ? test.skip : test;
const staleTest = missingCoreEnv || !QA_STALE_EVIDENCE_DEAL_ID ? test.skip : test;
const hardGateTest = missingCoreEnv || !QA_HARD_GATE_DEAL_ID ? test.skip : test;

async function gotoDealDashboard(page: Page, dealId: string) {
  await loginAsQa(page);
  await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
  const viewAllDeals = page.getByRole("button", { name: /View all deals/i }).first();
  if (await viewAllDeals.isVisible()) {
    await viewAllDeals.click();
    await page.waitForURL("**/deals**", { timeout: 60_000 }).catch(() => {});
    await expect(page.getByRole("heading", { name: /Deals/i, level: 1 })).toBeVisible();
  }
  await page.goto(`/overview?dealId=${dealId}`);
  await page.waitForURL("**/overview**", { timeout: 60_000 });
  await expect(page.getByRole("link", { name: /Dashboard/i }).first()).toBeVisible();
}

// The selectors below align to data-testids introduced in E3-W3.
test.describe("Risk & Evidence - overview + trace", () => {
  readyTest("happy path: ReadyForOffer with fresh evidence and passing gates", async ({ page }) => {
    const { readyDealId } = getQaDealIdsOrThrow();
    await gotoDealDashboard(page, readyDealId);
    const confidence = page.getByTestId("confidence-badge");
    await expect(confidence).toBeVisible({ timeout: 60000 });
    await expect(confidence).toContainText(/A|B/i);

    const workflow = page.getByTestId("workflow-pill");
    await expect(workflow).toBeVisible({ timeout: 60000 });
    await expect(workflow).toContainText(/Ready/i);

    const riskOverall = page.getByTestId("risk-overall-badge");
    await expect(riskOverall).toBeVisible({ timeout: 60000 });
    await expect(riskOverall).toContainText(/Pass/i);
    await expect(page.getByTestId(/evidence-kind-/).first()).toBeVisible();

    await page.goto(`/trace?dealId=${QA_READY_DEAL_ID}`);
    await expect(page.getByTestId("trace-confidence-grade")).toBeVisible();
    await expect(page.getByTestId("trace-workflow-state")).toContainText(/Ready/i);
    await expect(page.getByTestId("trace-risk-overall")).toContainText(/Pass/i);
  });

  staleTest(
    "stale or missing evidence pushes workflow to review/info and surfaces in trace",
    async ({ page }) => {
      await gotoDealDashboard(page, QA_STALE_EVIDENCE_DEAL_ID!);
      const workflow = page.getByTestId("workflow-pill");
      await expect(workflow).toBeVisible({ timeout: 60000 });
      await expect(workflow).toContainText(/Review|Info/i);
      await expect(page.getByTestId(/evidence-status-/).first()).toContainText(/stale|missing/i);
      const riskOverall = page.getByTestId("risk-overall-badge");
      await expect(riskOverall).toBeVisible({ timeout: 60000 });
      await expect(riskOverall).toContainText(/Watch|Fail/i);

      await page.goto(`/trace?dealId=${QA_STALE_EVIDENCE_DEAL_ID}`);
      await expect(page.getByTestId("trace-workflow-state")).toContainText(/Review|Info/i);
      await expect(page.getByRole("heading", { name: /Evidence freshness trace/i })).toBeVisible();
      await expect(page.getByText(/Placeholders:/i)).toBeVisible();
      await expect(page.getByTestId("trace-risk-overall")).toContainText(/Watch|Fail/i);
    },
  );

  hardGateTest("hard gate: insurability/flood/PACE drives Fail gate and non-ready workflow", async ({ page }) => {
    await gotoDealDashboard(page, QA_HARD_GATE_DEAL_ID!);
    const workflow = page.getByTestId("workflow-pill");
    await expect(workflow).toBeVisible({ timeout: 60000 });
    await expect(workflow).not.toContainText(/Ready/i);
    const riskOverall = page.getByTestId("risk-overall-badge");
    await expect(riskOverall).toBeVisible({ timeout: 60000 });
    await expect(riskOverall).toContainText(/Fail/i);
    // Expect at least one gate to be explicitly failing (insurability/flood/PACE/UCC).
    const failingGate = page.getByTestId(/risk-gate-/).filter({ hasText: /fail/i });
    await expect(failingGate.first()).toBeVisible({ timeout: 15000 });

    await page.goto(`/trace?dealId=${QA_HARD_GATE_DEAL_ID}`);
    await expect(page.getByTestId("trace-workflow-state")).not.toContainText(/Ready/i);
    await expect(page.getByTestId("trace-risk-overall")).toContainText(/Fail/i);
    const failingTraceGate = page
      .getByTestId(/trace-gate-/)
      .filter({ hasText: /insurability|flood|pace|ucc/i });
    await expect(failingTraceGate.first()).toBeVisible();
  });
});
