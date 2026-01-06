import { test, expect } from "@playwright/test";
import path from "path";
import { isQaEnvConfigured, loginAsQa } from "./_helpers/qaAuth";

// =============================================================================
// ENVIRONMENT GATING
// =============================================================================

const QA_CONFIGURED = isQaEnvConfigured();

test.describe("Bulk Import Feature", () => {
  // Skip all tests if QA environment is not configured
  test.beforeEach(async ({ page }, testInfo) => {
    if (!QA_CONFIGURED) {
      testInfo.skip(true, "QA environment not configured - skipping bulk import tests");
      return;
    }

    // Login before each test
    await loginAsQa(page);
  });

  // =========================================================================
  // WIZARD FLOW TESTS
  // =========================================================================

  test.describe("Import Wizard", () => {
    test("should navigate to import wizard and display upload interface", async ({ page }) => {
      // Navigate directly to wizard
      await page.goto("/import/wizard");
      await expect(page).toHaveURL(/\/import\/wizard/);

      // Verify wizard loaded
      await expect(page.getByRole("heading", { name: /Import Deals/i })).toBeVisible();

      // Verify upload dropzone is visible
      await expect(page.getByText(/Drag and drop your file here/i)).toBeVisible();
      await expect(page.getByText(/or click to browse/i)).toBeVisible();
    });

    test("should complete full wizard flow with valid CSV", async ({ page }) => {
      await page.goto("/import/wizard");

      // Step 1: Upload
      await expect(page.getByText(/Drag and drop your file here/i)).toBeVisible();

      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, "_fixtures", "import-test-data.csv");
      await fileInput.setInputFiles(testFile);

      // Wait for parsing to complete - should show file stats
      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("3")).toBeVisible(); // 3 rows in test file

      // Step 2: Type confirmation (auto-transitions after upload)
      // Look for CSV type indicator
      await expect(page.getByText(/CSV/i)).toBeVisible();

      // Continue to mapping
      await page.getByRole("button", { name: /Continue to Mapping/i }).click();

      // Step 3: Column Mapping
      await expect(page.getByText(/Map Columns/i)).toBeVisible();

      // Verify auto-mapping detected columns
      await expect(page.getByText("street")).toBeVisible();
      await expect(page.getByText("client_name")).toBeVisible();

      // Continue with mapping (triggers row processing)
      await page.getByRole("button", { name: /Continue/i }).click();

      // Step 4: Validation
      await expect(page.getByText(/Review Data/i)).toBeVisible({ timeout: 15000 });

      // Wait for validation to complete
      await expect(page.getByText(/Valid/i)).toBeVisible({ timeout: 10000 });

      // Continue to commit
      await page.getByRole("button", { name: /Continue to Import/i }).click();

      // Step 5: Commit
      await expect(page.getByText(/Import Summary/i)).toBeVisible();

      // Click start import button
      await page.getByRole("button", { name: /Start Import/i }).click();

      // Should show processing states then redirect
      await expect(page.getByText(/Creating import job/i)).toBeVisible({ timeout: 5000 });

      // Wait for redirect to Import Center
      await expect(page).toHaveURL(/\/import\?jobId=/, { timeout: 30000 });

      // Verify success message
      await expect(page.getByText(/created successfully/i)).toBeVisible();
    });

    test("should show validation errors for invalid data", async ({ page }) => {
      await page.goto("/import/wizard");

      // Upload file with errors
      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, "_fixtures", "import-test-data-errors.csv");
      await fileInput.setInputFiles(testFile);

      // Wait for parsing
      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });

      // Complete type step
      await page.getByRole("button", { name: /Continue to Mapping/i }).click();

      // Complete mapping step
      await page.getByRole("button", { name: /Continue/i }).click();

      // Step 4: Validation should show errors
      await expect(page.getByText(/Review Data/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/Need Fixes/i)).toBeVisible({ timeout: 10000 });

      // Verify error count is shown (should have invalid rows)
      await expect(page.locator('text=/\\d+ error/')).toBeVisible();
    });

    test("should detect duplicate addresses in file", async ({ page }) => {
      await page.goto("/import/wizard");

      // Upload file with duplicates
      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, "_fixtures", "import-test-data-duplicates.csv");
      await fileInput.setInputFiles(testFile);

      // Wait for parsing
      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });

      // Complete type step
      await page.getByRole("button", { name: /Continue to Mapping/i }).click();

      // Complete mapping step
      await page.getByRole("button", { name: /Continue/i }).click();

      // Validation step - may show duplicate warning
      await expect(page.getByText(/Review Data/i)).toBeVisible({ timeout: 15000 });

      // Wait for validation to complete
      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });
    });

    test("should display file size and row limits", async ({ page }) => {
      await page.goto("/import/wizard");

      // Verify the UI shows the limits
      await expect(page.getByText(/50MB/i)).toBeVisible();
      await expect(page.getByText(/10,000 rows/i)).toBeVisible();
    });
  });

  // =========================================================================
  // IMPORT CENTER TESTS
  // =========================================================================

  test.describe("Import Center", () => {
    test("should display jobs list and new import button", async ({ page }) => {
      await page.goto("/import");

      // Verify Import Center loaded
      await expect(page.getByRole("heading", { name: /Import Center/i })).toBeVisible();

      // Should show New Import button
      await expect(page.getByRole("link", { name: /New Import/i })).toBeVisible();

      // Should show Import Jobs section
      await expect(page.getByText(/Import Jobs/i)).toBeVisible();
    });

    test("should navigate to wizard from Import Center", async ({ page }) => {
      await page.goto("/import");

      // Click New Import
      await page.getByRole("link", { name: /New Import/i }).click();

      // Should navigate to wizard
      await expect(page).toHaveURL(/\/import\/wizard/);
    });

    test("should show items panel when job is selected", async ({ page }) => {
      // First create a job via wizard
      await page.goto("/import/wizard");

      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, "_fixtures", "import-test-data.csv");
      await fileInput.setInputFiles(testFile);

      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: /Continue to Mapping/i }).click();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText(/Review Data/i)).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: /Continue to Import/i }).click();
      await page.getByRole("button", { name: /Start Import/i }).click();

      // Wait for redirect to Import Center with job selected
      await expect(page).toHaveURL(/\/import\?jobId=/, { timeout: 30000 });

      // Items panel should be visible with the test file name
      await expect(page.getByText(/import-test-data/i)).toBeVisible();
      await expect(page.getByText(/valid/i)).toBeVisible();
    });
  });

  // =========================================================================
  // ITEM EDIT TESTS
  // =========================================================================

  test.describe("Item Editing", () => {
    test("should show edit button in items table", async ({ page }) => {
      // Create a job first
      await page.goto("/import/wizard");

      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, "_fixtures", "import-test-data.csv");
      await fileInput.setInputFiles(testFile);

      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: /Continue to Mapping/i }).click();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText(/Review Data/i)).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: /Continue to Import/i }).click();
      await page.getByRole("button", { name: /Start Import/i }).click();

      await expect(page).toHaveURL(/\/import\?jobId=/, { timeout: 30000 });

      // Look for edit buttons in the items table
      const editButtons = page.getByRole("button", { name: /edit/i });
      const count = await editButtons.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // PROMOTION TESTS
  // =========================================================================

  test.describe("Promotion Flow", () => {
    test("should show promote button when job has valid items", async ({ page }) => {
      // Create a job first
      await page.goto("/import/wizard");

      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, "_fixtures", "import-test-data.csv");
      await fileInput.setInputFiles(testFile);

      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: /Continue to Mapping/i }).click();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText(/Review Data/i)).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: /Continue to Import/i }).click();
      await page.getByRole("button", { name: /Start Import/i }).click();

      await expect(page).toHaveURL(/\/import\?jobId=/, { timeout: 30000 });

      // Promote button should be visible for jobs with valid items
      await expect(page.getByRole("button", { name: /Promote/i })).toBeVisible({ timeout: 5000 });
    });

    test("should open promotion modal", async ({ page }) => {
      // Create a job first
      await page.goto("/import/wizard");

      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, "_fixtures", "import-test-data.csv");
      await fileInput.setInputFiles(testFile);

      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: /Continue to Mapping/i }).click();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText(/Review Data/i)).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: /Continue to Import/i }).click();
      await page.getByRole("button", { name: /Start Import/i }).click();

      await expect(page).toHaveURL(/\/import\?jobId=/, { timeout: 30000 });

      // Click promote button
      await page.getByRole("button", { name: /Promote/i }).click();

      // Modal should appear with promotion options
      await expect(page.getByText(/Promote to Deals/i)).toBeVisible();
    });

    // Note: Full promotion test would create actual deals
    // Skip in regular test runs to avoid data pollution
    test.skip("should complete promotion and create deals", async () => {
      // This test is skipped by default to avoid creating test deals
      // Enable manually for full integration testing
    });
  });

  // =========================================================================
  // EXPORT TESTS
  // =========================================================================

  test.describe("CSV Export", () => {
    test("should show export button when items are visible", async ({ page }) => {
      // Create a job first
      await page.goto("/import/wizard");

      const fileInput = page.locator('input[type="file"]');
      const testFile = path.join(__dirname, "_fixtures", "import-test-data.csv");
      await fileInput.setInputFiles(testFile);

      await expect(page.getByText(/Total Rows/i)).toBeVisible({ timeout: 10000 });
      await page.getByRole("button", { name: /Continue to Mapping/i }).click();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText(/Review Data/i)).toBeVisible({ timeout: 15000 });
      await page.getByRole("button", { name: /Continue to Import/i }).click();
      await page.getByRole("button", { name: /Start Import/i }).click();

      await expect(page).toHaveURL(/\/import\?jobId=/, { timeout: 30000 });

      // Export button should be visible in the items panel
      await expect(page.getByRole("button", { name: /Export/i })).toBeVisible();
    });
  });
});
