import { test, expect } from '@playwright/test';

// Screenshots are written here so they can be inspected as visual homologation evidence.
const SHOTS = 'test-results/screenshots';

test.describe('Crowd Runner Game Tests', () => {
  test('should load the game, start correctly and play without JS errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors BEFORE navigating
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    // Navigate to the game URL
    await page.goto('/');

    // Check if canvas is rendered
    const canvas = page.locator('#gameCanvas');
    await expect(canvas).toBeVisible();

    // Wait for the game to initialize
    await page.waitForTimeout(1000);

    // PRINT 1: start screen
    await page.screenshot({ path: `${SHOTS}/01-start-screen.png`, fullPage: false });

    // Start the game (start overlay/screen)
    const startBtn = page.locator('#startBtnOverlay');
    const startScreen = page.locator('#startScreen');
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
    } else if (await startScreen.isVisible().catch(() => false)) {
      await startScreen.click();
    }

    // Let the game loop run
    await page.waitForTimeout(2000);

    // PRINT 2: active gameplay
    await page.screenshot({ path: `${SHOTS}/02-gameplay.png`, fullPage: false });

    // Check for JS runtime errors during rendering or updates
    expect(consoleErrors, `Console errors: ${consoleErrors.join(' | ')}`).toHaveLength(0);

    // Ensure the main UI overlay exists
    const controlBtn = page.locator('#superCannonBtnInline');
    await expect(controlBtn).toBeVisible();
  });

  test('should sustain a playable frame rate during gameplay', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await page.waitForTimeout(500);

    const startBtn = page.locator('#startBtnOverlay');
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
    }
    await page.waitForTimeout(1000); // warm up (sprite cache, first frames)

    // Sample frame timings over ~2s using requestAnimationFrame
    const fps = await page.evaluate(() => new Promise<number>((resolve) => {
      const frames: number[] = [];
      let last = performance.now();
      const sampleMs = 2000;
      const start = last;
      function tick(now: number) {
        frames.push(now - last);
        last = now;
        if (now - start < sampleMs) {
          requestAnimationFrame(tick);
        } else {
          const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
          resolve(1000 / avg);
        }
      }
      requestAnimationFrame(tick);
    }));

    console.log(`Measured average FPS: ${fps.toFixed(1)}`);
    // Headless Chromium should comfortably clear 30fps; flag regressions below that.
    expect(fps).toBeGreaterThan(30);
  });

  test('should open the pause screen and capture it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await page.waitForTimeout(500);

    const startBtn = page.locator('#startBtnOverlay');
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
    }
    await page.waitForTimeout(800);

    const pauseBtn = page.locator('#pauseBtnTop');
    if (await pauseBtn.isVisible().catch(() => false)) {
      await pauseBtn.click();
      await page.waitForTimeout(300);
      // PRINT 3: pause screen
      await page.screenshot({ path: `${SHOTS}/03-pause.png`, fullPage: false });
    }
  });
});
