import { test, expect } from '@playwright/test';

test.describe('Crowd Runner Game Tests', () => {
  test('should load the game, start correctly and play without JS errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors BEFORE navigating
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Some Vite/third-party extensions might throw benign warnings or 404s, but let's log them to fail if any runtime errors occur.
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the game URL
    await page.goto('/');

    // Check if canvas is rendered
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    // Wait for the game to initialize
    await page.waitForTimeout(1000);

    // Assume there is a start screen to click
    const startScreen = page.locator('#startScreen');
    if (await startScreen.isVisible()) {
        await startScreen.click();
    }

    // Let the game loop run for a second
    await page.waitForTimeout(2000);

    // Check for JS runtime errors during rendering or updates
    expect(consoleErrors).toHaveLength(0);

    // Ensure the main UI overlay exists
    const controlBtn = page.locator('#superCannonBtnInline');
    await expect(controlBtn).toBeVisible();
    
    // Test passed! Game renders and runs logic without throwing errors
  });
});
