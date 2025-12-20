import { test, expect, type Page } from "@playwright/test";

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

async function login(page: Page) {
  if (!QA_EMAIL || !QA_PASSWORD) {
    throw new Error("Set DEALENGINE_QA_USER_EMAIL and DEALENGINE_QA_USER_PASSWORD to run these tests.");
  }
  await page.goto("/login");
  await page.getByLabel("Email address").fill(QA_EMAIL);
  await page.getByLabel("Password").fill(QA_PASSWORD);
  const signInButton = page.getByRole("button", { name: /Sign in/i }).first();
  await signInButton.click();
  await page.waitForURL("**/startup", { timeout: 60_000 });
}

async function gotoDealDashboard(page: Page, dealId: string) {
  await login(page);
  await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
  const viewAllDeals = page.getByRole("button", { name: /View all deals/i }).first();
  if (await viewAllDeals.isVisible()) {
    await viewAllDeals.click();
    await page.waitForURL("**/deals**", { timeout: 60_000 }).catch(() => {});
    await expect(page.getByRole("heading", { name: /Deals/i })).toBeVisible();
  }
  await page.goto(`/overview?dealId=${dealId}`);
  await page.waitForURL("**/overview**", { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
}

// The selectors below align to data-testids introduced in E3-W3.
test.describe("Risk & Evidence - overview + trace", () => {
  readyTest("happy path: ReadyForOffer with fresh evidence and passing gates", async ({ page }) => {
    await gotoDealDashboard(page, QA_READY_DEAL_ID!);
    await expect(page.getByTestId("confidence-badge")).toContainText(/A|B/i);
    await expect(page.getByTestId("workflow-pill")).toContainText(/Ready/i);
    await expect(page.getByTestId("risk-overall-badge")).toContainText(/Pass/i);
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
      await expect(page.getByTestId("workflow-pill")).toContainText(/Review|Info/i);
      await expect(page.getByTestId(/evidence-status-/).first()).toContainText(/stale|missing/i);
      await expect(page.getByTestId("risk-overall-badge")).toContainText(/Watch|Fail/i);

      await page.goto(`/trace?dealId=${QA_STALE_EVIDENCE_DEAL_ID}`);
      await expect(page.getByTestId("trace-workflow-state")).toContainText(/Review|Info/i);
      await expect(page.getByText(/Evidence freshness trace/i)).toBeVisible();
      await expect(page.getByText(/Placeholders:/i)).toBeVisible();
      await expect(page.getByTestId("trace-risk-overall")).toContainText(/Watch|Fail/i);
    },
  );

  hardGateTest("hard gate: insurability/flood/PACE drives Fail gate and non-ready workflow", async ({ page }) => {
    await gotoDealDashboard(page, QA_HARD_GATE_DEAL_ID!);
    await expect(page.getByTestId("workflow-pill")).not.toContainText(/Ready/i);
    await expect(page.getByTestId("risk-overall-badge")).toContainText(/Fail/i);
    // Expect at least one gate to be explicitly failing (insurability/flood/PACE/UCC).
    await expect(page.getByTestId(/risk-gate-/)).toContainText(/fail/i);

    await page.goto(`/trace?dealId=${QA_HARD_GATE_DEAL_ID}`);
    await expect(page.getByTestId("trace-workflow-state")).not.toContainText(/Ready/i);
    await expect(page.getByTestId("trace-risk-overall")).toContainText(/Fail/i);
    await expect(page.getByText(/insurability|flood|pace|ucc/i)).toBeVisible();
  });
});
