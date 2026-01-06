/**
 * E2E Test Utilities and Page Objects
 *
 * Playwright-based utilities for end-to-end testing of the HPS DealEngine
 * Command Center. Includes page objects for consistent interaction patterns
 * and test data helpers.
 *
 * @module e2e/utils
 * @version 1.0.0 (Slice 19 - E2E Tests)
 */

import { Page, Locator, expect } from "@playwright/test";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const TEST_CONFIG = {
  /** Base URL for the application */
  baseUrl: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

  /** Default timeout for operations */
  timeout: 10000,

  /** Viewport sizes for responsive testing */
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 800 },
    wide: { width: 1920, height: 1080 },
  },

  /** Test user credentials (use test environment) */
  testUser: {
    email: process.env.TEST_USER_EMAIL || "test@hpsdealengine.com",
    password: process.env.TEST_USER_PASSWORD || "test-password-123",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// PAGE OBJECTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base Page Object with common methods.
 */
export class BasePage {
  constructor(protected page: Page) {}

  /** Navigate to a path */
  async goto(path: string): Promise<void> {
    await this.page.goto(`${TEST_CONFIG.baseUrl}${path}`);
  }

  /** Wait for page to be fully loaded */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /** Check if element is visible */
  async isVisible(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    return await element.isVisible();
  }

  /** Get text content of element */
  async getText(selector: string): Promise<string> {
    const element = this.page.locator(selector);
    return (await element.textContent()) || "";
  }

  /** Click element and wait for navigation if needed */
  async clickAndWait(selector: string): Promise<void> {
    await this.page.locator(selector).click();
    await this.page.waitForLoadState("networkidle");
  }

  /** Take a screenshot for visual regression */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}

/**
 * Login Page Object
 */
export class LoginPage extends BasePage {
  private emailInput = this.page.locator('input[type="email"]');
  private passwordInput = this.page.locator('input[type="password"]');
  private submitButton = this.page.locator('button[type="submit"]');

  async login(email: string, password: string): Promise<void> {
    await this.goto("/login");
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.waitForPageLoad();
  }

  async loginAsTestUser(): Promise<void> {
    await this.login(TEST_CONFIG.testUser.email, TEST_CONFIG.testUser.password);
  }
}

/**
 * Command Center (Overview) Page Object
 */
export class OverviewPage extends BasePage {
  // Selectors
  private verdictCard = this.page.locator('[data-testid="verdict-card"]');
  private scoreGauges = this.page.locator('[data-testid="score-gauges"]');
  private keyMetrics = this.page.locator('[data-testid="key-metrics"]');
  private signalCards = this.page.locator('[data-testid="signal-card"]');
  private timelineSection = this.page.locator('[data-testid="timeline-section"]');
  private loadingSkeleton = this.page.locator('[data-testid="loading-skeleton"]');
  private errorState = this.page.locator('[data-testid="error-state"]');
  private emptyState = this.page.locator('[data-testid="empty-state"]');

  // Tab navigation
  private tabs = {
    overview: this.page.locator('[data-testid="tab-overview"]'),
    underwrite: this.page.locator('[data-testid="tab-underwrite"]'),
    evidence: this.page.locator('[data-testid="tab-evidence"]'),
    timeline: this.page.locator('[data-testid="tab-timeline"]'),
  };

  /** Navigate to overview page with optional deal ID */
  async navigateTo(dealId?: string): Promise<void> {
    const path = dealId ? `/overview?dealId=${dealId}` : "/overview";
    await this.goto(path);
    await this.waitForPageLoad();
  }

  /** Wait for content to load (skeleton disappears) */
  async waitForContent(): Promise<void> {
    await this.loadingSkeleton.waitFor({ state: "hidden", timeout: TEST_CONFIG.timeout });
  }

  /** Check if loading skeleton is visible */
  async isLoading(): Promise<boolean> {
    return await this.loadingSkeleton.isVisible();
  }

  /** Check if error state is displayed */
  async hasError(): Promise<boolean> {
    return await this.errorState.isVisible();
  }

  /** Check if empty state is displayed */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /** Get verdict from verdict card */
  async getVerdict(): Promise<string> {
    await this.verdictCard.waitFor({ state: "visible" });
    const verdictLabel = this.verdictCard.locator('[data-testid="verdict-label"]');
    return (await verdictLabel.textContent()) || "";
  }

  /** Get confidence grade from verdict card */
  async getConfidenceGrade(): Promise<string> {
    await this.verdictCard.waitFor({ state: "visible" });
    const grade = this.verdictCard.locator('[data-testid="confidence-grade"]');
    return (await grade.textContent()) || "";
  }

  /** Get all score values */
  async getScores(): Promise<{ name: string; value: number }[]> {
    await this.scoreGauges.waitFor({ state: "visible" });
    const gauges = this.scoreGauges.locator('[data-testid="score-gauge"]');
    const count = await gauges.count();
    const scores: { name: string; value: number }[] = [];

    for (let i = 0; i < count; i++) {
      const gauge = gauges.nth(i);
      const name = (await gauge.locator('[data-testid="gauge-name"]').textContent()) || "";
      const valueText = (await gauge.locator('[data-testid="gauge-value"]').textContent()) || "0";
      const value = parseInt(valueText.replace("%", ""), 10);
      scores.push({ name, value });
    }

    return scores;
  }

  /** Get key metrics values */
  async getKeyMetrics(): Promise<Record<string, string>> {
    await this.keyMetrics.waitFor({ state: "visible" });
    const metrics = this.keyMetrics.locator('[data-testid="metric-item"]');
    const count = await metrics.count();
    const result: Record<string, string> = {};

    for (let i = 0; i < count; i++) {
      const metric = metrics.nth(i);
      const label = (await metric.locator('[data-testid="metric-label"]').textContent()) || "";
      const value = (await metric.locator('[data-testid="metric-value"]').textContent()) || "";
      result[label] = value;
    }

    return result;
  }

  /** Get count of signal cards */
  async getSignalCount(): Promise<number> {
    return await this.signalCards.count();
  }

  /** Click a specific tab */
  async clickTab(tabName: keyof typeof this.tabs): Promise<void> {
    await this.tabs[tabName].click();
    await this.waitForPageLoad();
  }

  /** Check if a tab is active */
  async isTabActive(tabName: keyof typeof this.tabs): Promise<boolean> {
    const tab = this.tabs[tabName];
    const classes = await tab.getAttribute("class");
    return classes?.includes("active") || false;
  }
}

/**
 * Portfolio Dashboard Page Object
 */
export class PortfolioDashboardPage extends BasePage {
  // Selectors
  private header = this.page.locator('[data-testid="portfolio-header"]');
  private metricsStrip = this.page.locator('[data-testid="portfolio-pulse"]');
  private filterBar = this.page.locator('[data-testid="filter-bar"]');
  private dealGrid = this.page.locator('[data-testid="deal-grid"]');
  private dealCards = this.page.locator('[data-testid="deal-card"]');
  private searchInput = this.page.locator('[data-testid="search-input"]');
  private loadingSkeleton = this.page.locator('[data-testid="portfolio-skeleton"]');
  private emptyState = this.page.locator('[data-testid="empty-state"]');
  private noResultsState = this.page.locator('[data-testid="no-results-state"]');

  // Filters
  private statusFilter = this.page.locator('[data-testid="filter-status"]');
  private verdictFilter = this.page.locator('[data-testid="filter-verdict"]');
  private analysisFilter = this.page.locator('[data-testid="filter-analysis"]');
  private sortDropdown = this.page.locator('[data-testid="sort-dropdown"]');

  /** Navigate to portfolio dashboard */
  async navigateTo(): Promise<void> {
    await this.goto("/dashboard");
    await this.waitForPageLoad();
  }

  /** Wait for content to load */
  async waitForContent(): Promise<void> {
    await this.loadingSkeleton.waitFor({ state: "hidden", timeout: TEST_CONFIG.timeout });
  }

  /** Check if loading */
  async isLoading(): Promise<boolean> {
    return await this.loadingSkeleton.isVisible();
  }

  /** Check if empty state is shown */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.isVisible();
  }

  /** Check if no results state is shown */
  async hasNoResults(): Promise<boolean> {
    return await this.noResultsState.isVisible();
  }

  /** Get deal count from header */
  async getDealCount(): Promise<number> {
    await this.header.waitFor({ state: "visible" });
    const countBadge = this.header.locator('[data-testid="deal-count"]');
    const text = (await countBadge.textContent()) || "0";
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /** Get visible deal card count */
  async getVisibleDealCount(): Promise<number> {
    return await this.dealCards.count();
  }

  /** Get aggregate metrics */
  async getMetrics(): Promise<{
    totalDeals: number;
    pipelineValue: string;
    spreadOpportunity: string;
    avgCloseability: string;
  }> {
    await this.metricsStrip.waitFor({ state: "visible" });

    const totalDeals = await this.metricsStrip.locator('[data-testid="metric-total-deals"]').textContent();
    const pipelineValue = await this.metricsStrip.locator('[data-testid="metric-pipeline-value"]').textContent();
    const spreadOpportunity = await this.metricsStrip.locator('[data-testid="metric-spread"]').textContent();
    const avgCloseability = await this.metricsStrip.locator('[data-testid="metric-closeability"]').textContent();

    return {
      totalDeals: parseInt(totalDeals || "0", 10),
      pipelineValue: pipelineValue || "$0",
      spreadOpportunity: spreadOpportunity || "$0",
      avgCloseability: avgCloseability || "0%",
    };
  }

  /** Filter by status */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  /** Filter by verdict */
  async filterByVerdict(verdict: string): Promise<void> {
    await this.verdictFilter.selectOption(verdict);
    await this.page.waitForTimeout(500);
  }

  /** Search for deals */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for debounce
  }

  /** Clear search */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /** Sort deals */
  async sortBy(field: string): Promise<void> {
    await this.sortDropdown.selectOption(field);
    await this.page.waitForTimeout(500);
  }

  /** Click on a deal card */
  async clickDealCard(index: number): Promise<void> {
    const card = this.dealCards.nth(index);
    await card.click();
    await this.waitForPageLoad();
  }

  /** Get deal card data */
  async getDealCardData(index: number): Promise<{
    address: string;
    verdict: string;
    status: string;
  }> {
    const card = this.dealCards.nth(index);
    await card.waitFor({ state: "visible" });

    const address = (await card.locator('[data-testid="deal-address"]').textContent()) || "";
    const verdict = (await card.locator('[data-testid="deal-verdict"]').textContent()) || "";
    const status = (await card.locator('[data-testid="deal-status"]').textContent()) || "";

    return { address, verdict, status };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wait for network requests to complete.
 */
export async function waitForNetworkIdle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
}

/**
 * Mock API response for testing.
 */
export async function mockApiResponse(
  page: Page,
  url: string | RegExp,
  response: { status: number; body: unknown }
): Promise<void> {
  await page.route(url, (route) => {
    route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });
}

/**
 * Set viewport size.
 */
export async function setViewport(
  page: Page,
  size: keyof typeof TEST_CONFIG.viewports
): Promise<void> {
  await page.setViewportSize(TEST_CONFIG.viewports[size]);
}

/**
 * Check for accessibility violations using axe-core.
 */
export async function checkAccessibility(page: Page): Promise<void> {
  // Note: Requires @axe-core/playwright to be installed
  // const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  // expect(accessibilityScanResults.violations).toEqual([]);
}

/**
 * Assert element has specific CSS property.
 */
export async function assertStyle(
  locator: Locator,
  property: string,
  expectedValue: string
): Promise<void> {
  const style = await locator.evaluate((el, prop) => {
    return window.getComputedStyle(el).getPropertyValue(prop);
  }, property);
  expect(style).toBe(expectedValue);
}

/**
 * Generate test deal data.
 */
export function generateTestDeal(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `test-deal-${Date.now()}`,
    address: "123 Test Street",
    city: "Orlando",
    state: "FL",
    zip: "32801",
    status: "active",
    closeability_index: 75,
    urgency_score: 50,
    risk_adjusted_spread: 25000,
    buyer_demand_index: 65,
    verdict: "HOLD",
    has_analysis: true,
    arv: 350000,
    ...overrides,
  };
}

/**
 * Generate multiple test deals.
 */
export function generateTestDeals(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) =>
    generateTestDeal({
      id: `test-deal-${i}`,
      address: `${100 + i} Test Street`,
      closeability_index: 50 + (i % 50),
      verdict: ["GO", "PROCEED_WITH_CAUTION", "HOLD", "PASS"][i % 4],
    })
  );
}
