import { test, expect, Page } from '@playwright/test';

const SHOTS = 'test-results/screenshots';
// Network-only noise (Google Fonts blocked in sandbox) is not a game error.
const isNoise = (t: string) => /ERR_CERT|ERR_NAME|ERR_INTERNET|Failed to load resource/.test(t);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

async function startGame(page: Page) {
  await page.goto('/');
  await expect(page.locator('#startScreen')).toBeVisible();
  await page.locator('#startBtnOverlay').click();
  // The game runs a short countdown before gameplay begins
  await page.waitForFunction(() => (window as any).__wxh?.isStarted(), null, { timeout: 15000 });
}

test.describe('PixiJS rendering layers', () => {
  test('activates WebGL layer stacked exactly over the game canvas', async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await expect(page.locator('html')).toHaveAttribute('data-renderer', 'pixi');

    const rects = await page.evaluate(() =>
      ['gameCanvas', 'pixiCanvas', 'hudCanvas'].map(id => {
        const r = document.getElementById(id)!.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height].map(Math.round);
      }));
    expect(rects[1]).toEqual(rects[0]);
    expect(rects[2]).toEqual(rects[0]);
    expect(errors).toEqual([]);
  });

  test('start overlay is dismissed when the game starts (regression)', async ({ page }) => {
    await startGame(page);
    await expect(page.locator('#startScreen')).toBeHidden();
    await expect(page.locator('#gameCanvas')).toBeVisible();
  });

  test('keyboard moves the army and the game keeps running', async ({ page }) => {
    const errors = collectErrors(page);
    await startGame(page);
    await page.waitForTimeout(800);
    const x0 = await page.evaluate(() => (window as any).__wxh.armyX());
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(700);
    await page.keyboard.up('ArrowLeft');
    const x1 = await page.evaluate(() => (window as any).__wxh.armyX());
    expect(x1).toBeLessThan(x0);

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowRight');
    const x2 = await page.evaluate(() => (window as any).__wxh.armyX());
    expect(x2).toBeGreaterThan(x1);
    expect(await page.evaluate(() => (window as any).__wxh.isGameOver())).toBe(false);
    await page.screenshot({ path: `${SHOTS}/10-pixi-gameplay.png` });
    expect(errors).toEqual([]);
  });

  test('army and bullets are drawn as Pixi sprites', async ({ page }) => {
    await startGame(page);
    await expect.poll(() => page.evaluate(() => (window as any).__wxh.pixiSprites()), { timeout: 8000 })
      .toBeGreaterThan(0);
  });

  test('pause and settings overlays work on top of the layers', async ({ page }) => {
    await startGame(page);
    await page.waitForTimeout(600);
    await page.locator('#pauseBtnTop').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/11-pixi-pause.png` });
    await page.keyboard.press('p');
    await page.locator('#settingsBtn').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/12-pixi-settings.png` });
  });

  test('mobile viewport renders layers correctly', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = collectErrors(page);
    await startGame(page);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/13-pixi-mobile.png` });
    const rects = await page.evaluate(() =>
      ['gameCanvas', 'pixiCanvas'].map(id => {
        const r = document.getElementById(id)!.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height].map(Math.round);
      }));
    expect(rects[1]).toEqual(rects[0]);
    expect(errors).toEqual([]);
    await ctx.close();
  });
});

test.describe('Canvas2D fallback (no WebGL)', () => {
  test('game still starts and plays when WebGL is unavailable', async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...a: any[]) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
        return (orig as any).call(this, type, ...a);
      } as any;
    });
    const page = await ctx.newPage();
    const errors = collectErrors(page);
    await startGame(page);
    await page.waitForTimeout(2000);
    expect(await page.evaluate(() => document.documentElement.dataset.renderer)).toBeUndefined();
    expect(await page.locator('#pixiCanvas').count()).toBe(0);
    await page.screenshot({ path: `${SHOTS}/14-canvas2d-fallback.png` });
    expect(errors).toEqual([]);
    await ctx.close();
  });
});
