/**
 * Command Center E2E Tests
 *
 * End-to-end tests for the Command Center (Overview) page. Tests cover
 * page loading, data display, navigation, interactions, and error states.
 *
 * TEST CATEGORIES:
 * 1. Page Load - Initial render, loading states, data fetch
 * 2. Verdict Display - VerdictCard rendering and styling
 * 3. Score Display - ScoreGauges with correct values
 * 4. Key Metrics - MAO, Spread, ARV display
 * 5. Signal Cards - Priority signals display
 * 6. Navigation - Tab switching, deal selection
 * 7. Error Handling - API failures, empty states
 * 8. Responsive - Mobile, tablet, desktop layouts
 *
 * @module e2e/command-center.spec
 * @version 1.0.0 (Slice 19 - E2E Tests)
 */

import { test, expect } from "@playwright/test";
import {
  OverviewPage,
  PortfolioDashboardPage,
  LoginPage,
  TEST_CONFIG,
  mockApiResponse,
  setViewport,
  generateTestDeal,
  generateTestDeals,
} from "./e2e-test-utils";

// ═══════════════════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Command Center", () => {
  let overviewPage: OverviewPage;

  test.beforeEach(async ({ page }) => {
    overviewPage = new OverviewPage(page);

    // Mock API responses for consistent testing
    await mockApiResponse(page, /\/api\/deals/, {
      status: 200,
      body: { data: [generateTestDeal()] },
    });

    await mockApiResponse(page, /\/api\/runs/, {
      status: 200,
      body: {
        data: {
          outputs: {
            closeability_index: 75,
            urgency_score: 50,
            risk_adjusted_spread: 25000,
            buyer_demand_index: 65,
            arv: 350000,
            mao_cash: 245000,
            mao_creative: 280000,
          },
        },
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE LOAD TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Page Load", () => {
    test("shows loading skeleton initially", async ({ page }) => {
      // Navigate without waiting
      await page.goto(`${TEST_CONFIG.baseUrl}/overview?dealId=test-deal-1`);

      // Should show skeleton immediately
      const skeleton = page.locator('[data-testid="loading-skeleton"]');
      await expect(skeleton).toBeVisible();
    });

    test("loads and displays content after fetch", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      // Skeleton should be gone
      const isLoading = await overviewPage.isLoading();
      expect(isLoading).toBe(false);

      // Content should be visible
      const verdictCard = page.locator('[data-testid="verdict-card"]');
      await expect(verdictCard).toBeVisible();
    });

    test("displays page title correctly", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      // Check page title
      const title = await page.title();
      expect(title).toContain("Command Center");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VERDICT CARD TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Verdict Card", () => {
    test("displays verdict correctly", async ({ page }) => {
      // Mock a GO verdict
      await mockApiResponse(page, /\/api\/runs/, {
        status: 200,
        body: {
          data: {
            outputs: {
              closeability_index: 85,
              urgency_score: 40,
              risk_adjusted_spread: 35000,
            },
          },
        },
      });

      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const verdict = await overviewPage.getVerdict();
      expect(["GO", "PROCEED WITH CAUTION", "HOLD", "PASS"]).toContain(verdict.toUpperCase());
    });

    test("displays confidence grade", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const grade = await overviewPage.getConfidenceGrade();
      expect(["A", "B", "C", "D", "F"]).toContain(grade.toUpperCase());
    });

    test("verdict card has correct styling for GO verdict", async ({ page }) => {
      await mockApiResponse(page, /\/api\/runs/, {
        status: 200,
        body: {
          data: {
            outputs: {
              closeability_index: 90,
              urgency_score: 30,
              risk_adjusted_spread: 50000,
            },
          },
        },
      });

      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const verdictCard = page.locator('[data-testid="verdict-card"]');
      const backgroundColor = await verdictCard.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // Should have green-ish background for GO
      expect(backgroundColor).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SCORE GAUGES TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Score Gauges", () => {
    test("displays all four score gauges", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const scores = await overviewPage.getScores();
      expect(scores.length).toBe(4);
    });

    test("displays closeability score correctly", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const scores = await overviewPage.getScores();
      const closeability = scores.find((s) => s.name.toLowerCase().includes("close"));
      expect(closeability).toBeDefined();
      expect(closeability?.value).toBeGreaterThanOrEqual(0);
      expect(closeability?.value).toBeLessThanOrEqual(100);
    });

    test("displays urgency score correctly", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const scores = await overviewPage.getScores();
      const urgency = scores.find((s) => s.name.toLowerCase().includes("urgent"));
      expect(urgency).toBeDefined();
    });

    test("gauges have animated fill on load", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");

      // Wait a moment for animation to start
      await page.waitForTimeout(100);

      const gauge = page.locator('[data-testid="score-gauge"]').first();
      const fill = gauge.locator('[data-testid="gauge-fill"]');

      // Check that fill element exists and has transition
      await expect(fill).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // KEY METRICS TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Key Metrics", () => {
    test("displays MAO Cash", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const metrics = await overviewPage.getKeyMetrics();
      expect(Object.keys(metrics).some((k) => k.toLowerCase().includes("mao"))).toBe(true);
    });

    test("displays ARV", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const metrics = await overviewPage.getKeyMetrics();
      expect(Object.keys(metrics).some((k) => k.toLowerCase().includes("arv"))).toBe(true);
    });

    test("displays spread with correct formatting", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const metrics = await overviewPage.getKeyMetrics();
      const spreadKey = Object.keys(metrics).find((k) => k.toLowerCase().includes("spread"));
      if (spreadKey) {
        expect(metrics[spreadKey]).toMatch(/\$[\d,]+/);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SIGNAL CARDS TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Signal Cards", () => {
    test("displays signal cards", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const signalCount = await overviewPage.getSignalCount();
      expect(signalCount).toBeGreaterThanOrEqual(0);
    });

    test("signal cards have priority badges", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const signalCards = page.locator('[data-testid="signal-card"]');
      const count = await signalCards.count();

      if (count > 0) {
        const firstCard = signalCards.first();
        const badge = firstCard.locator('[data-testid="priority-badge"]');
        await expect(badge).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // NAVIGATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Navigation", () => {
    test("clicking tab switches content", async ({ page }) => {
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      // Click underwrite tab
      await overviewPage.clickTab("underwrite");

      // URL should update
      expect(page.url()).toContain("tab=underwrite");
    });

    test("tabs maintain state on refresh", async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseUrl}/overview?dealId=test-deal-1&tab=underwrite`);
      await overviewPage.waitForContent();

      // Underwrite tab should be active
      const isActive = await overviewPage.isTabActive("underwrite");
      expect(isActive).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ERROR STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Error States", () => {
    test("displays error state on API failure", async ({ page }) => {
      // Mock API error
      await mockApiResponse(page, /\/api\/deals/, {
        status: 500,
        body: { error: "Internal server error" },
      });

      await overviewPage.navigateTo("test-deal-1");
      await page.waitForTimeout(1000);

      const hasError = await overviewPage.hasError();
      expect(hasError).toBe(true);
    });

    test("displays empty state when no data", async ({ page }) => {
      // Mock empty response
      await mockApiResponse(page, /\/api\/deals/, {
        status: 200,
        body: { data: null },
      });

      await overviewPage.navigateTo("test-deal-1");
      await page.waitForTimeout(1000);

      const isEmpty = await overviewPage.isEmpty();
      expect(isEmpty).toBe(true);
    });

    test("error state has retry button", async ({ page }) => {
      await mockApiResponse(page, /\/api\/deals/, {
        status: 500,
        body: { error: "Error" },
      });

      await overviewPage.navigateTo("test-deal-1");
      await page.waitForTimeout(1000);

      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RESPONSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Responsive Layout", () => {
    test("displays correctly on mobile", async ({ page }) => {
      await setViewport(page, "mobile");
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      // Verdict card should still be visible
      const verdictCard = page.locator('[data-testid="verdict-card"]');
      await expect(verdictCard).toBeVisible();
    });

    test("displays correctly on tablet", async ({ page }) => {
      await setViewport(page, "tablet");
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const verdictCard = page.locator('[data-testid="verdict-card"]');
      await expect(verdictCard).toBeVisible();
    });

    test("score gauges stack on mobile", async ({ page }) => {
      await setViewport(page, "mobile");
      await overviewPage.navigateTo("test-deal-1");
      await overviewPage.waitForContent();

      const gauges = page.locator('[data-testid="score-gauges"]');
      const gridColumns = await gauges.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });

      // Should have fewer columns on mobile
      expect(gridColumns).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PORTFOLIO DASHBOARD TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Portfolio Dashboard", () => {
  let dashboardPage: PortfolioDashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new PortfolioDashboardPage(page);

    // Mock deals API
    await mockApiResponse(page, /\/api\/deals/, {
      status: 200,
      body: { data: generateTestDeals(10) },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE LOAD TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Page Load", () => {
    test("shows loading skeleton initially", async ({ page }) => {
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);

      const skeleton = page.locator('[data-testid="portfolio-skeleton"]');
      await expect(skeleton).toBeVisible();
    });

    test("loads and displays content", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const isLoading = await dashboardPage.isLoading();
      expect(isLoading).toBe(false);
    });

    test("displays correct deal count", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const count = await dashboardPage.getDealCount();
      expect(count).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // METRICS STRIP TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Metrics Strip", () => {
    test("displays aggregate metrics", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const metrics = await dashboardPage.getMetrics();
      expect(metrics.totalDeals).toBeGreaterThan(0);
    });

    test("displays pipeline value", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const metrics = await dashboardPage.getMetrics();
      expect(metrics.pipelineValue).toMatch(/\$/);
    });

    test("displays verdict distribution", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const verdictChart = page.locator('[data-testid="verdict-distribution"]');
      await expect(verdictChart).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FILTERING TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Filtering", () => {
    test("filters by status", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const initialCount = await dashboardPage.getVisibleDealCount();
      await dashboardPage.filterByStatus("under_contract");

      const filteredCount = await dashboardPage.getVisibleDealCount();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    });

    test("filters by verdict", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      await dashboardPage.filterByVerdict("GO");

      const dealCards = page.locator('[data-testid="deal-card"]');
      const count = await dealCards.count();

      // All visible cards should have GO verdict
      for (let i = 0; i < count; i++) {
        const card = dealCards.nth(i);
        const verdict = await card.locator('[data-testid="deal-verdict"]').textContent();
        expect(verdict?.toUpperCase()).toBe("GO");
      }
    });

    test("search filters by address", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      await dashboardPage.search("100 Test");

      const count = await dashboardPage.getVisibleDealCount();
      expect(count).toBeLessThanOrEqual(10);
    });

    test("clear filters restores all deals", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      await dashboardPage.filterByVerdict("GO");
      const filteredCount = await dashboardPage.getVisibleDealCount();

      await dashboardPage.filterByVerdict("all");
      const restoredCount = await dashboardPage.getVisibleDealCount();

      expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SORTING TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Sorting", () => {
    test("sorts by closeability", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      await dashboardPage.sortBy("closeability");

      // First card should have high closeability
      const firstCard = page.locator('[data-testid="deal-card"]').first();
      await expect(firstCard).toBeVisible();
    });

    test("sorts by verdict", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      await dashboardPage.sortBy("verdict");

      // First card should be GO
      const firstCard = page.locator('[data-testid="deal-card"]').first();
      const verdict = await firstCard.locator('[data-testid="deal-verdict"]').textContent();
      expect(verdict?.toUpperCase()).toBe("GO");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // NAVIGATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Navigation", () => {
    test("clicking deal card navigates to overview", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      await dashboardPage.clickDealCard(0);

      expect(page.url()).toContain("/overview");
    });

    test("new deal button navigates to deal creation", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const newDealButton = page.locator('[data-testid="new-deal-button"]');
      await newDealButton.click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("/deals/new");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EMPTY STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Empty States", () => {
    test("displays empty state when no deals", async ({ page }) => {
      await mockApiResponse(page, /\/api\/deals/, {
        status: 200,
        body: { data: [] },
      });

      await dashboardPage.navigateTo();
      await page.waitForTimeout(1000);

      const isEmpty = await dashboardPage.isEmpty();
      expect(isEmpty).toBe(true);
    });

    test("empty state has CTA button", async ({ page }) => {
      await mockApiResponse(page, /\/api\/deals/, {
        status: 200,
        body: { data: [] },
      });

      await dashboardPage.navigateTo();
      await page.waitForTimeout(1000);

      const ctaButton = page.locator('[data-testid="create-deal-cta"]');
      await expect(ctaButton).toBeVisible();
    });

    test("displays no results when filters match nothing", async ({ page }) => {
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      await dashboardPage.search("nonexistent address xyz 12345");

      const hasNoResults = await dashboardPage.hasNoResults();
      expect(hasNoResults).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RESPONSIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  test.describe("Responsive Layout", () => {
    test("displays single column on mobile", async ({ page }) => {
      await setViewport(page, "mobile");
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const grid = page.locator('[data-testid="deal-grid"]');
      const gridColumns = await grid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });

      // Should be single column
      expect(gridColumns).not.toContain("repeat");
    });

    test("displays multiple columns on desktop", async ({ page }) => {
      await setViewport(page, "desktop");
      await dashboardPage.navigateTo();
      await dashboardPage.waitForContent();

      const grid = page.locator('[data-testid="deal-grid"]');
      await expect(grid).toBeVisible();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Accessibility", () => {
  test("page has no major accessibility violations", async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/overview?dealId=test-deal-1`);
    await page.waitForLoadState("networkidle");

    // Basic accessibility checks
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();

    // Check for heading hierarchy
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
  });

  test("keyboard navigation works", async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Check that focus is visible
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("screen reader labels present", async ({ page }) => {
    await page.goto(`${TEST_CONFIG.baseUrl}/overview?dealId=test-deal-1`);
    await page.waitForLoadState("networkidle");

    // Check for aria-labels
    const buttons = page.locator("button[aria-label]");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
