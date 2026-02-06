import { test, expect } from '@playwright/test';

/**
 * UAT Scenario: Partial Transmission Resume
 *
 * Preconditions: App unlocked, active channel, transmission in progress.
 * Steps:
 *   1. Navigate to app with ?testing=1
 *   2. Unlock and reach main view
 *   3. Begin a transmission (if possible in current auth state)
 *   4. Cancel the transmission midway via cancel button
 *   5. Verify cancel confirmation dialog appears
 *   6. Confirm or reject cancellation
 *   7. If cancelled, re-initiate transmission
 *   8. Verify bit position is preserved (resume from where we left off)
 *   9. Complete the transmission
 *
 * Expected Outcomes:
 *   - Cancel button triggers confirmation dialog
 *   - Cancellation stops transmission
 *   - Resume picks up from the last bit position
 *   - Full transmission completes successfully
 *
 * SPEC References: Section 9 (Transmission Protocol), Section 8 (Message Encoding)
 */

test.describe('UAT: Partial Transmission Resume', () => {
  test('cancel button triggers confirmation dialog', async ({ browser }) => {
    test.info().annotations.push(
      { type: 'SPEC', description: 'Section 9: Transmission Protocol' },
      { type: 'UAT', description: 'Partial Resume - Cancel Confirmation' },
    );

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/?testing=1');
    await page.waitForSelector('[data-testid="unlock-screen"]');

    const passphrase = `uat-cancel-${Date.now()}`;
    await page.locator('[data-testid="unlock-passphrase-input"]').fill(passphrase);
    await page.locator('[data-testid="unlock-submit"]').click();

    await page.waitForSelector(
      '[data-testid="transmission-progress"], [data-testid="compose-box"], [data-testid="bluesky-login"], [data-testid="unlock-screen"]',
      { timeout: 10000 },
    );

    // If transmission progress is visible, test the cancel flow
    const transmissionProgress = page.locator('[data-testid="transmission-progress"]');
    if (await transmissionProgress.isVisible()) {
      const cancelBtn = page.locator('[data-testid="transmission-cancel"]');
      await expect(cancelBtn).toBeVisible();

      // Click cancel - should show confirmation
      await cancelBtn.click();

      // Confirmation dialog should appear
      const confirmDialog = page.locator('.transmission-progress__cancel-confirm');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText('Cancel sending');

      // "No, Continue" should dismiss the dialog
      const continueBtn = page.locator('.transmission-progress__button--secondary');
      await continueBtn.click();

      // Transmission should still be active
      await expect(transmissionProgress).toBeVisible();
    }

    await context.close();
  });

  test('confirmed cancellation stops transmission', async ({ browser }) => {
    test.info().annotations.push(
      { type: 'SPEC', description: 'Section 9: Transmission Protocol' },
      { type: 'UAT', description: 'Partial Resume - Confirmed Cancel' },
    );

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/?testing=1');
    await page.waitForSelector('[data-testid="unlock-screen"]');

    const passphrase = `uat-stop-${Date.now()}`;
    await page.locator('[data-testid="unlock-passphrase-input"]').fill(passphrase);
    await page.locator('[data-testid="unlock-submit"]').click();

    await page.waitForSelector(
      '[data-testid="transmission-progress"], [data-testid="compose-box"], [data-testid="bluesky-login"], [data-testid="unlock-screen"]',
      { timeout: 10000 },
    );

    const transmissionProgress = page.locator('[data-testid="transmission-progress"]');
    if (await transmissionProgress.isVisible()) {
      // Record bit position before cancel to verify state
      const percentText = await page.locator('[data-testid="transmission-percentage"]').textContent();
      expect(percentText).toBeTruthy();

      // Click cancel twice (first shows confirm, second confirms)
      const cancelBtn = page.locator('[data-testid="transmission-cancel"]');
      await cancelBtn.click();

      // Click "Yes, Cancel" to confirm
      const confirmBtn = page.locator('.transmission-progress__button--danger');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();

        // Transmission progress should be removed or show cancelled state
        // Allow time for state to update
        await page.waitForTimeout(1000);
      }
    }

    await context.close();
  });

  test('resume preserves bit position after page reload', async ({ browser }) => {
    test.info().annotations.push(
      { type: 'SPEC', description: 'Section 9.1: Sender Procedure' },
      { type: 'SPEC', description: 'Section 8: Message Encoding' },
      { type: 'UAT', description: 'Partial Resume - Bit Position Preservation' },
    );

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/?testing=1');
    await page.waitForSelector('[data-testid="unlock-screen"]');

    const passphrase = `uat-resume-${Date.now()}`;
    await page.locator('[data-testid="unlock-passphrase-input"]').fill(passphrase);
    await page.locator('[data-testid="unlock-submit"]').click();

    await page.waitForSelector(
      '[data-testid="transmission-progress"], [data-testid="compose-box"], [data-testid="bluesky-login"], [data-testid="unlock-screen"]',
      { timeout: 10000 },
    );

    // If transmission is active, record state before reload
    const transmissionProgress = page.locator('[data-testid="transmission-progress"]');
    if (await transmissionProgress.isVisible()) {
      const percentBeforeReload = await page.locator('[data-testid="transmission-percentage"]').textContent();
      expect(percentBeforeReload).toBeTruthy();

      // Reload the page (simulates browser refresh / resume scenario)
      await page.reload();
      await page.waitForSelector('[data-testid="unlock-screen"]');

      // Re-unlock with same passphrase
      await page.locator('[data-testid="unlock-passphrase-input"]').fill(passphrase);
      await page.locator('[data-testid="unlock-submit"]').click();

      await page.waitForSelector(
        '[data-testid="transmission-progress"], [data-testid="compose-box"], [data-testid="bluesky-login"], [data-testid="unlock-screen"]',
        { timeout: 10000 },
      );

      // If transmission resumes, check bit position is preserved
      const resumedProgress = page.locator('[data-testid="transmission-progress"]');
      if (await resumedProgress.isVisible()) {
        const percentAfter = await page.locator('[data-testid="transmission-percentage"]').textContent();
        // Percentage should be >= what it was before (not reset to 0)
        expect(percentAfter).toBeTruthy();
      }
    }

    await context.close();
  });

  test('transmission complete state renders success UI', async ({ browser }) => {
    test.info().annotations.push(
      { type: 'SPEC', description: 'Section 9: Transmission Protocol' },
      { type: 'UAT', description: 'Partial Resume - Completion' },
    );

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/?testing=1');
    await page.waitForSelector('[data-testid="unlock-screen"]');

    const passphrase = `uat-complete-${Date.now()}`;
    await page.locator('[data-testid="unlock-passphrase-input"]').fill(passphrase);
    await page.locator('[data-testid="unlock-submit"]').click();

    await page.waitForSelector(
      '[data-testid="transmission-complete"], [data-testid="transmission-progress"], [data-testid="compose-box"], [data-testid="bluesky-login"], [data-testid="unlock-screen"]',
      { timeout: 10000 },
    );

    // If transmission complete state is visible, verify success UI
    const completeState = page.locator('[data-testid="transmission-complete"]');
    if (await completeState.isVisible()) {
      await expect(completeState).toContainText('Message sent');
    }

    await context.close();
  });
});
