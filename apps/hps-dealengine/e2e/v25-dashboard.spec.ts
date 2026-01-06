/**
 * V2.5 Dashboard E2E Tests — Slice 13
 *
 * End-to-end tests for the V2.5 dashboard experience.
 * Tests feature flag behavior, component rendering, and interactions.
 *
 * TEST CATEGORIES:
 * 1. Feature Flag - Enable/disable via URL and localStorage
 * 2. Dashboard Rendering - Verdict Hero, Status Strip, Key Metrics
 * 3. Loading States - Skeleton display
 * 4. Empty States - No analysis run
 * 5. Responsive - Mobile, tablet, desktop layouts
 * 6. Accessibility - Keyboard navigation, ARIA labels
 *
 * @module e2e/v25-dashboard.spec
 * @version 1.0.0 (Slice 13 - E2E Scaffold)
 */

import { test, expect, Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════
// TEST CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  testDealId: 'test-deal-v25-001',
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set a feature flag via localStorage before navigation
 */
async function setFeatureFlag(
  page: Page,
  flag: string,
  value: boolean | null
): Promise<void> {
  await page.addInitScript(
    ({ flag, value }) => {
      if (value === null) {
        localStorage.removeItem(flag);
      } else {
        localStorage.setItem(flag, String(value));
      }
    },
    { flag, value }
  );
}

/**
 * Navigate to overview with V2.5 dashboard feature flag
 */
async function navigateToV25Overview(
  page: Page,
  dealId: string,
  enableV25: boolean = true
): Promise<void> {
  // Set feature flag via URL param (takes priority)
  const url = enableV25
    ? `${TEST_CONFIG.baseUrl}/overview?dealId=${dealId}&v25=true`
    : `${TEST_CONFIG.baseUrl}/overview?dealId=${dealId}&v25=false`;

  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Mock engine analysis results
 */
async function mockEngineResults(page: Page, outputs: Record<string, unknown>): Promise<void> {
  await page.route('**/api/deals/*/runs*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          outputs,
          calculations: {},
          created_at: new Date().toISOString(),
        },
      }),
    });
  });
}

/**
 * Set viewport to specific device size
 */
async function setViewport(
  page: Page,
  device: 'mobile' | 'tablet' | 'desktop'
): Promise<void> {
  const viewports = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 800 },
  };
  await page.setViewportSize(viewports[device]);
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE FLAG TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('V2.5 Feature Flag', () => {
  test('enables V2.5 dashboard via URL param', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const v25Section = page.locator('[data-testid="v25-section"]');
    await expect(v25Section).toHaveAttribute('data-enabled', 'true');
  });

  test('disables V2.5 dashboard via URL param', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, false);

    const v25Section = page.locator('[data-testid="v25-section"]');
    await expect(v25Section).toHaveAttribute('data-enabled', 'false');
  });

  test('enables V2.5 dashboard via localStorage', async ({ page }) => {
    await setFeatureFlag(page, 'v25_dashboard', true);
    await page.goto(`${TEST_CONFIG.baseUrl}/overview?dealId=${TEST_CONFIG.testDealId}`);
    await page.waitForLoadState('networkidle');

    const v25Section = page.locator('[data-testid="v25-section"]');
    // Should be enabled if localStorage is set
    await expect(v25Section).toBeVisible();
  });

  test('URL param takes priority over localStorage', async ({ page }) => {
    // Set localStorage to false
    await setFeatureFlag(page, 'v25_dashboard', false);
    // Navigate with URL param true
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const v25Section = page.locator('[data-testid="v25-section"]');
    await expect(v25Section).toHaveAttribute('data-enabled', 'true');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD RENDERING TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('V2.5 Dashboard Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Mock engine results
    await mockEngineResults(page, {
      workflow_state: 'ReadyForOffer',
      confidence_grade: 'B',
      price_geometry: {
        zopa: 25000,
        zopa_pct_of_arv: 8.5,
        entry_point: 275000,
        respect_floor: 250000,
        buyer_ceiling: 350000,
      },
      net_clearance: {
        recommended_exit: 'assignment',
        assignment: { gross: 30000, costs: 5000, net: 25000, margin_pct: 9.0 },
        double_close: { gross: 35000, costs: 8000, net: 27000, margin_pct: 9.5 },
      },
      risk_summary: {
        any_blocking: false,
        per_gate: {
          comps: { status: 'pass' },
          zopa: { status: 'pass' },
          liens: { status: 'pass' },
          equity: { status: 'pass' },
        },
      },
      evidence_summary: {
        freshness_by_kind: {
          comps: { status: 'fresh' },
          avm: { status: 'fresh' },
          title: { status: 'stale' },
          photos: { status: 'missing', blocking: true },
        },
      },
      market_velocity: {
        dom_zip_days: 25,
        moi_zip_months: 3,
        liquidity_score: 72,
      },
      comp_quality: {
        quality_score: 78,
        quality_band: 'good',
        comp_count: 5,
      },
    });
  });

  test('displays Verdict Hero section', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const verdictHero = page.locator('[data-testid="v25-verdict-hero"]');
    await expect(verdictHero).toBeVisible();
  });

  test('displays correct verdict recommendation', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    // Wait for content to load
    await page.waitForSelector('[data-testid="v25-dashboard"][data-state="loaded"]', {
      timeout: 10000,
    });

    const dashboard = page.locator('[data-testid="v25-dashboard"]');
    await expect(dashboard).toHaveAttribute('data-verdict', 'PURSUE');
  });

  test('displays Status Strip with risk and evidence', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const statusStrip = page.locator('[data-testid="v25-status-strip"]');
    await expect(statusStrip).toBeVisible();

    const riskStatus = page.locator('[data-testid="v25-risk-status"]');
    await expect(riskStatus).toBeVisible();

    const evidenceStatus = page.locator('[data-testid="v25-evidence-status"]');
    await expect(evidenceStatus).toBeVisible();
  });

  test('displays Key Metrics grid', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const keyMetrics = page.locator('[data-testid="v25-key-metrics"]');
    await expect(keyMetrics).toBeVisible();

    // Check individual metrics
    const zopaMetric = page.locator('[data-testid="v25-metric-zopa"]');
    await expect(zopaMetric).toBeVisible();

    const netMetric = page.locator('[data-testid="v25-metric-net"]');
    await expect(netMetric).toBeVisible();

    const marketMetric = page.locator('[data-testid="v25-metric-market"]');
    await expect(marketMetric).toBeVisible();

    const compsMetric = page.locator('[data-testid="v25-metric-comps"]');
    await expect(compsMetric).toBeVisible();
  });

  test('displays ZOPA amount correctly', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const zopaMetric = page.locator('[data-testid="v25-metric-zopa"]');
    const zopaText = await zopaMetric.textContent();

    // Should contain dollar amount
    expect(zopaText).toMatch(/\$25K/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LOADING STATE TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('V2.5 Loading States', () => {
  test('shows skeleton while loading', async ({ page }) => {
    // Add delay to API response
    await page.route('**/api/deals/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.continue();
    });

    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    // Should show loading state
    const dashboard = page.locator('[data-testid="v25-dashboard"][data-state="loading"]');
    await expect(dashboard).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('V2.5 Empty States', () => {
  test('shows empty state when no analysis run', async ({ page }) => {
    // Mock empty analysis
    await page.route('**/api/deals/*/runs*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
    });

    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const dashboard = page.locator('[data-testid="v25-dashboard"][data-state="empty"]');
    await expect(dashboard).toBeVisible();
  });

  test('empty state contains helpful message', async ({ page }) => {
    await page.route('**/api/deals/*/runs*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null }),
      });
    });

    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const emptyMessage = page.locator('[data-testid="v25-dashboard"]');
    const text = await emptyMessage.textContent();

    expect(text).toContain('No Analysis');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSIVE TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('V2.5 Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await mockEngineResults(page, {
      workflow_state: 'ReadyForOffer',
      confidence_grade: 'B',
      price_geometry: { zopa: 25000 },
      risk_summary: { any_blocking: false },
    });
  });

  test('displays correctly on mobile', async ({ page }) => {
    await setViewport(page, 'mobile');
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const dashboard = page.locator('[data-testid="v25-dashboard"]');
    await expect(dashboard).toBeVisible();

    const verdictHero = page.locator('[data-testid="v25-verdict-hero"]');
    await expect(verdictHero).toBeVisible();
  });

  test('displays correctly on tablet', async ({ page }) => {
    await setViewport(page, 'tablet');
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const dashboard = page.locator('[data-testid="v25-dashboard"]');
    await expect(dashboard).toBeVisible();
  });

  test('displays correctly on desktop', async ({ page }) => {
    await setViewport(page, 'desktop');
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const dashboard = page.locator('[data-testid="v25-dashboard"]');
    await expect(dashboard).toBeVisible();

    // Key metrics should be in a 4-column grid on desktop
    const keyMetrics = page.locator('[data-testid="v25-key-metrics"]');
    await expect(keyMetrics).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('V2.5 Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await mockEngineResults(page, {
      workflow_state: 'ReadyForOffer',
      confidence_grade: 'B',
      price_geometry: { zopa: 25000 },
    });
  });

  test('dashboard has proper heading hierarchy', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    // Check for h2 in verdict hero
    const h2 = page.locator('[data-testid="v25-verdict-hero"] h2');
    await expect(h2).toBeVisible();
  });

  test('verdict chip has aria-label', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const verdictChip = page.locator('[data-testid="verdict-chip"]');
    const ariaLabel = await verdictChip.getAttribute('aria-label');

    expect(ariaLabel).toContain('verdict');
  });

  test('keyboard navigation works', async ({ page }) => {
    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    // Tab through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that focus is visible somewhere
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('loading state announces to screen readers', async ({ page }) => {
    await page.route('**/api/deals/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      route.continue();
    });

    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const skeleton = page.locator('[data-testid="v25-dashboard-skeleton"]');
    const ariaLabel = await skeleton.getAttribute('aria-label');
    const ariaBusy = await skeleton.getAttribute('aria-busy');

    expect(ariaLabel).toContain('Loading');
    expect(ariaBusy).toBe('true');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT VARIATIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('V2.5 Verdict Variations', () => {
  test('displays PURSUE verdict with green styling', async ({ page }) => {
    await mockEngineResults(page, {
      workflow_state: 'ReadyForOffer',
      price_geometry: { zopa: 25000 },
      risk_summary: { any_blocking: false },
    });

    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const dashboard = page.locator('[data-testid="v25-dashboard"]');
    await expect(dashboard).toHaveAttribute('data-verdict', 'PURSUE');
  });

  test('displays NEEDS_EVIDENCE verdict with amber styling', async ({ page }) => {
    await mockEngineResults(page, {
      workflow_state: 'NeedsInfo',
      price_geometry: { zopa: 25000 },
      risk_summary: { any_blocking: false },
    });

    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const dashboard = page.locator('[data-testid="v25-dashboard"]');
    await expect(dashboard).toHaveAttribute('data-verdict', 'NEEDS_EVIDENCE');
  });

  test('displays PASS verdict with red styling when blocking', async ({ page }) => {
    await mockEngineResults(page, {
      workflow_state: 'ReadyForOffer',
      price_geometry: { zopa: 25000 },
      risk_summary: { any_blocking: true },
    });

    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const dashboard = page.locator('[data-testid="v25-dashboard"]');
    await expect(dashboard).toHaveAttribute('data-verdict', 'PASS');
  });

  test('displays PASS verdict when ZOPA is negative', async ({ page }) => {
    await mockEngineResults(page, {
      workflow_state: 'ReadyForOffer',
      price_geometry: { zopa: -5000 },
      risk_summary: { any_blocking: false },
    });

    await navigateToV25Overview(page, TEST_CONFIG.testDealId, true);

    const dashboard = page.locator('[data-testid="v25-dashboard"]');
    await expect(dashboard).toHaveAttribute('data-verdict', 'PASS');
  });
});
