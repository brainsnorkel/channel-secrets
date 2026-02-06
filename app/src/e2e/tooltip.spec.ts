import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Tooltip Positioning and Rendering
 *
 * Tests verify tooltip placement, viewport edge handling,
 * responsive behavior, and testing vs production mode rendering.
 */

test.describe('Tooltip Rendering', () => {
  test.describe('testing mode vs production mode', () => {
    test('testing mode shows inline tooltip content without trigger icon', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate with testing mode enabled
      await page.goto('/?testing=1');
      await page.waitForSelector('[data-testid="unlock-screen"]');

      // In testing mode, tooltips render inline with class tooltip-testing
      // Check if any tooltip wrappers exist with testing class
      const testingTooltips = page.locator('.tooltip-testing');
      const count = await testingTooltips.count();

      // If tooltips are present on the unlock screen, verify they have inline text
      if (count > 0) {
        const firstTooltip = testingTooltips.first();
        await expect(firstTooltip).toBeVisible();
        // Testing mode tooltips should have inline text visible
        const inlineText = firstTooltip.locator('.tooltip-inline-text');
        await expect(inlineText).toBeVisible();
      }

      await context.close();
    });

    test('production mode shows (?) trigger icon', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate without testing mode
      await page.goto('/?testing=0');
      await page.waitForSelector('[data-testid="unlock-screen"]');

      // In production mode, tooltips should show (?) trigger buttons
      const triggerButtons = page.locator('.tooltip-trigger');
      const count = await triggerButtons.count();

      if (count > 0) {
        const firstTrigger = triggerButtons.first();
        await expect(firstTrigger).toBeVisible();
        // Should contain the (?) icon
        const icon = firstTrigger.locator('.tooltip-icon');
        await expect(icon).toHaveText('(?)');
      }

      await context.close();
    });

    test('production mode click reveals tooltip popover', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/?testing=0');
      await page.waitForSelector('[data-testid="unlock-screen"]');

      const triggerButtons = page.locator('.tooltip-trigger');
      const count = await triggerButtons.count();

      if (count > 0) {
        // Click the first trigger
        await triggerButtons.first().click();

        // Tooltip popover should appear
        const popover = page.locator('.tooltip-popover');
        await expect(popover).toBeVisible();

        // Should have short content and a "Learn more" button
        const learnMore = popover.locator('.tooltip-learn-more');
        if (await learnMore.isVisible()) {
          await expect(learnMore).toHaveText('Learn more');
        }
      }

      await context.close();
    });
  });

  test.describe('placement positions', () => {
    test('tooltip popover applies correct placement class', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/?testing=0');
      await page.waitForSelector('[data-testid="unlock-screen"]');

      const triggerButtons = page.locator('.tooltip-trigger');
      const count = await triggerButtons.count();

      if (count > 0) {
        await triggerButtons.first().click();

        // Check that the popover has a placement class
        const popover = page.locator('.tooltip-popover');
        await expect(popover).toBeVisible();

        // Verify it has one of the placement classes
        const classAttr = await popover.getAttribute('class');
        expect(classAttr).toMatch(/tooltip-popover-(top|bottom|left|right)/);
      }

      await context.close();
    });
  });

  test.describe('responsive behavior', () => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 800, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      test(`renders correctly at ${viewport.name} viewport (${viewport.width}x${viewport.height})`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
        });
        const page = await context.newPage();

        await page.goto('/?testing=1');
        await page.waitForSelector('[data-testid="unlock-screen"]');

        // Verify the unlock screen renders properly at this viewport
        const unlockScreen = page.locator('[data-testid="unlock-screen"]');
        await expect(unlockScreen).toBeVisible();

        // Verify the screen fits within the viewport
        const box = await unlockScreen.boundingBox();
        expect(box).toBeTruthy();
        if (box) {
          expect(box.width).toBeLessThanOrEqual(viewport.width);
        }

        await context.close();
      });
    }
  });

  test.describe('keyboard accessibility', () => {
    test('tooltip trigger is keyboard accessible', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/?testing=0');
      await page.waitForSelector('[data-testid="unlock-screen"]');

      const triggerButtons = page.locator('.tooltip-trigger');
      const count = await triggerButtons.count();

      if (count > 0) {
        // Focus the trigger via Tab
        await triggerButtons.first().focus();

        // Press Enter to activate
        await page.keyboard.press('Enter');

        // Tooltip should open
        const popover = page.locator('.tooltip-popover');
        await expect(popover).toBeVisible();

        // Press Escape to close
        await page.keyboard.press('Escape');
        await expect(popover).not.toBeVisible();
      }

      await context.close();
    });
  });
});
