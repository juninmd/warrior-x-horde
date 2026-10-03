import { test, expect, Page } from '@playwright/test';

const SHOTS = 'test-results/screenshots';
const isNoise = (t: string) => /ERR_CERT|ERR_NAME|ERR_INTERNET|Failed to load resource/.test(t);
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error' && !isNoise(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}
async function start(page: Page) {
  await page.goto('/');
  await page.locator('#startBtnOverlay').click();
  await page.waitForFunction(() => (window as any).__wxh?.isStarted(), null, { timeout: 15000 });
}
const wxh = <T>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as any).__wxh[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

test.describe('Revamp', () => {
  test('intro cinematic can be replayed from the start screen and skipped', async ({ page }) => {
    await page.goto('/');
    await page.locator('#storyBtn').click();
    const intro = page.locator('#introCinematic');
    await expect(intro).toBeVisible();
    await expect(intro.locator('.intro-title')).toHaveText('Um Mundo em Paz');
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${SHOTS}/90-intro-scene1.png` });
    await page.keyboard.press('Enter'); // completes line
    await page.keyboard.press('Enter'); // next scene
    await expect(intro.locator('.intro-title')).toHaveText('Os Devoradores');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/91-intro-scene2.png` });
    await intro.locator('.intro-skip').click();
    await expect(intro).toBeHidden();
    await expect(page.locator('#startScreen')).toBeVisible(); // did not start the run
    expect(await page.evaluate(() => (window as any).__wxh.isStarted())).toBe(false);
  });

  test('beating a boss opens the perk choice; picking applies it and resumes', async ({ page }) => {
    test.setTimeout(90000);
    const errors = watchErrors(page);
    await start(page);
    await wxh(page, 'forceBoss');
    await page.waitForFunction(() => (window as any).__wxh.boss()?.y > 40, null, { timeout: 25000 });
    await wxh(page, 'killBoss');
    await page.waitForFunction(() => (window as any).__wxh.perkOpen(), null, { timeout: 30000 });
    expect(await wxh(page, 'isPaused')).toBe(true);
    await expect(page.locator('.perk-card')).toHaveCount(3);
    await page.screenshot({ path: `${SHOTS}/92-perk-choice.png` });
    const level = await wxh<number>(page, 'level');
    await page.locator('.perk-card').first().click();
    await expect(page.locator('#perkModal')).toHaveCount(0);
    expect(await wxh(page, 'isPaused')).toBe(false);
    expect((await wxh<unknown[]>(page, 'perks')).length).toBe(1);
    expect(await wxh(page, 'level')).toBe(level);
    // the next chapter banner follows the pick and the game keeps running
    await expect(page.locator('#storyBanner')).toContainText(`CAPÍTULO ${level}`);
    const s0 = await wxh<number>(page, 'distance');
    await page.waitForTimeout(1500);
    expect(await wxh<number>(page, 'distance')).toBeGreaterThan(s0);
    expect(errors).toEqual([]);
  });

  test('biome gallery: all 10 chapters render with weather and no errors', async ({ page }) => {
    test.setTimeout(150000);
    const errors = watchErrors(page);
    await start(page);
    for (let level = 1; level <= 10; level++) {
      await wxh(page, 'goToLevel', level);
      await page.waitForFunction((n) => (window as any).__wxh.level() === n && (window as any).__wxh.isStarted(), level, { timeout: 15000 });
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `${SHOTS}/93-biome-${String(level).padStart(2, '0')}.png` });
    }
    expect(errors).toEqual([]);
  });

  test('later levels spawn special enemies and spitters shoot acid', async ({ page }) => {
    test.setTimeout(90000);
    const errors = watchErrors(page);
    await start(page);
    await wxh(page, 'goToLevel', 8);
    await page.waitForFunction(() => (window as any).__wxh.level() === 8, null, { timeout: 15000 });
    await page.waitForFunction(() => (window as any).__wxh.enemyKinds().spitter > 0, null, { timeout: 30000 });
    const kinds = await wxh<Record<string, number>>(page, 'enemyKinds');
    expect(kinds.spitter + kinds.tank + kinds.runner).toBeGreaterThan(0);
    await page.waitForFunction(() => (window as any).__wxh.enemyBullets() > 0, null, { timeout: 40000 });
    await page.screenshot({ path: `${SHOTS}/94-spitters.png` });
    expect(errors).toEqual([]);
  });
});
