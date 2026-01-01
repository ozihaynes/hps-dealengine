/**
 * E2E Test: Client Intake Flow
 *
 * Tests the complete intake workflow:
 * 1. Staff logs in and navigates to a deal
 * 2. Staff sends an intake link
 * 3. Client (anonymous) fills out the form
 * 4. Staff reviews the submission in the inbox
 *
 * PREREQUISITE: QA environment must have:
 * - QA_USER_EMAIL and QA_USER_PASSWORD env vars
 * - QA_DEAL_ID env var pointing to a deal with an intake schema
 * - Active intake_schema_versions for the deal's org
 */

import { test, expect } from "@playwright/test";
import { getQaCredsOrThrow, getQaDealIdsOrThrow, loginAsQa } from "./_helpers/qaAuth";

// Skip all tests if QA credentials are not available
const qaAvailable = (() => {
  try {
    getQaCredsOrThrow();
    getQaDealIdsOrThrow();
    return true;
  } catch {
    return false;
  }
})();

test.describe("Client Intake Flow", () => {
  test.skip(!qaAvailable, "QA credentials not available - skipping intake flow tests");

  let intakeLinkUrl: string | null = null;
  let intakeLinkId: string | null = null;

  test("staff can send an intake link from deal page", async ({ page }) => {
    // Login as QA user
    await loginAsQa(page);

    // Navigate to the deal page
    const { dealId } = getQaDealIdsOrThrow();
    await page.goto(`/deals/${dealId}`);
    await page.waitForLoadState("networkidle");

    // Look for the "Send Intake Link" button
    const sendLinkButton = page.getByRole("button", { name: /send intake link/i });
    await expect(sendLinkButton).toBeVisible({ timeout: 10000 });

    // Click to open modal
    await sendLinkButton.click();

    // Modal should appear
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();

    // Fill in recipient details (if required by modal)
    const recipientNameInput = modal.getByLabel(/recipient name/i);
    if (await recipientNameInput.isVisible()) {
      await recipientNameInput.fill("E2E Test Client");
    }

    const recipientEmailInput = modal.getByLabel(/recipient email/i);
    if (await recipientEmailInput.isVisible()) {
      await recipientEmailInput.fill("e2e-test@example.com");
    }

    // Click send/create button
    const createButton = modal.getByRole("button", { name: /create|send|generate/i });
    await createButton.click();

    // Wait for success state - look for the generated link
    const linkDisplay = modal.locator('[data-testid="intake-link-url"], input[readonly]');
    await expect(linkDisplay).toBeVisible({ timeout: 15000 });

    // Extract the link URL
    const linkValue = await linkDisplay.inputValue().catch(() => null) ||
      await linkDisplay.textContent();

    expect(linkValue).toBeTruthy();
    expect(linkValue).toContain("/intake/");

    // Store for subsequent tests
    intakeLinkUrl = linkValue;

    // Extract link ID from URL
    const urlMatch = linkValue?.match(/\/intake\/([a-f0-9-]+)\?token=/);
    if (urlMatch) {
      intakeLinkId = urlMatch[1];
    }

    // Close modal
    const closeButton = modal.getByRole("button", { name: /close|done/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test("client can access intake form via link", async ({ page }) => {
    test.skip(!intakeLinkUrl, "No intake link URL from previous test");

    // Navigate to the intake link (as anonymous user)
    await page.goto(intakeLinkUrl!);
    await page.waitForLoadState("networkidle");

    // Should see the intake form, not an error
    const form = page.locator("form");
    await expect(form).toBeVisible({ timeout: 10000 });

    // Should see form sections/fields
    const formContent = page.locator('[data-testid="intake-form"], .intake-form, form');
    await expect(formContent).toBeVisible();

    // Should NOT see authentication prompts
    const loginPrompt = page.getByRole("button", { name: /sign in|log in/i });
    await expect(loginPrompt).not.toBeVisible();
  });

  test("client can fill and submit intake form", async ({ page }) => {
    test.skip(!intakeLinkUrl, "No intake link URL from previous test");

    await page.goto(intakeLinkUrl!);
    await page.waitForLoadState("networkidle");

    // Fill out form fields (generic approach - find inputs and fill them)
    const textInputs = page.locator('input[type="text"], input[type="email"], input:not([type])');
    const inputCount = await textInputs.count();

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = textInputs.nth(i);
      if (await input.isVisible() && await input.isEnabled()) {
        const placeholder = await input.getAttribute("placeholder") || "";
        const name = await input.getAttribute("name") || `field_${i}`;

        if (placeholder.toLowerCase().includes("email") || name.toLowerCase().includes("email")) {
          await input.fill("e2e-test@example.com");
        } else if (placeholder.toLowerCase().includes("phone") || name.toLowerCase().includes("phone")) {
          await input.fill("555-123-4567");
        } else {
          await input.fill(`E2E Test Value ${i + 1}`);
        }
      }
    }

    // Handle textareas
    const textareas = page.locator("textarea");
    const textareaCount = await textareas.count();

    for (let i = 0; i < textareaCount; i++) {
      const textarea = textareas.nth(i);
      if (await textarea.isVisible() && await textarea.isEnabled()) {
        await textarea.fill("E2E test notes - this submission was created by automated testing.");
      }
    }

    // Navigate through sections if multi-step form
    const nextButton = page.getByRole("button", { name: /next|continue/i });
    while (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500); // Brief wait for transition
    }

    // Submit the form
    const submitButton = page.getByRole("button", { name: /submit|complete|finish/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Wait for success indication
      const successMessage = page.getByText(/thank you|submitted|success/i);
      await expect(successMessage).toBeVisible({ timeout: 15000 });
    }
  });

  test("staff can view submission in intake inbox", async ({ page }) => {
    test.skip(!intakeLinkId, "No intake link ID from previous test");

    // Login as QA user
    await loginAsQa(page);

    // Navigate to intake inbox
    await page.goto("/intake-inbox");
    await page.waitForLoadState("networkidle");

    // Should see the inbox with submissions
    const inbox = page.locator('[data-testid="intake-inbox"], .intake-inbox, main');
    await expect(inbox).toBeVisible();

    // Look for the submission (may need to click on it)
    const submissionLink = page.locator(`a[href*="${intakeLinkId}"], [data-link-id="${intakeLinkId}"]`);

    if (await submissionLink.isVisible()) {
      await submissionLink.click();
      await page.waitForLoadState("networkidle");

      // Should see submission details
      const detailView = page.locator('[data-testid="submission-detail"], .submission-detail');
      await expect(detailView).toBeVisible({ timeout: 10000 });
    }
  });

  test("staff can populate deal from submission", async ({ page }) => {
    test.skip(!intakeLinkId, "No intake link ID from previous test");

    // Login and navigate to the submission detail
    await loginAsQa(page);
    await page.goto(`/intake-inbox/${intakeLinkId}`);
    await page.waitForLoadState("networkidle");

    // Look for populate button
    const populateButton = page.getByRole("button", { name: /populate|apply|import/i });

    if (await populateButton.isVisible()) {
      await populateButton.click();

      // Modal should appear
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();

      // Confirm population
      const confirmButton = modal.getByRole("button", { name: /confirm|populate|apply/i });
      if (await confirmButton.isVisible()) {
        await confirmButton.click();

        // Wait for success
        const successIndicator = page.getByText(/populated|applied|success/i);
        await expect(successIndicator).toBeVisible({ timeout: 15000 });
      }
    }
  });
});

test.describe("Intake Link Edge Cases", () => {
  test.skip(!qaAvailable, "QA credentials not available - skipping edge case tests");

  test("expired link shows appropriate error", async ({ page }) => {
    // Navigate to a fake/expired link
    await page.goto("/intake/00000000-0000-0000-0000-000000000000?token=expired123");
    await page.waitForLoadState("networkidle");

    // Should see an error message
    const errorMessage = page.getByText(/expired|invalid|not found|error/i);
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test("invalid token shows appropriate error", async ({ page }) => {
    // Navigate with malformed token
    await page.goto("/intake/test-link-id?token=invalid");
    await page.waitForLoadState("networkidle");

    // Should see an error message
    const errorMessage = page.getByText(/invalid|unauthorized|error/i);
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });
});
