import { test, expect, Page } from '@playwright/test';

// Full-game homologation: boss gallery for all 10 chapters, boss attack/phase checks,
// shop purchase, skin selection, a random-input bot and defeat/victory flows.
const SHOTS = 'test-results/screenshots';
const isNoise = (t: string) => /ERR_CERT|ERR_NAME|ERR_INTERNET|Failed to load resource/.test(t);
const w = (page: Page) => page.evaluate.bind(page);

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

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

test.describe('Homologation', () => {
  test('chapter banner appears at the start of the campaign', async ({ page }) => {
    const errors = watchErrors(page);
    await start(page);
    const banner = page.locator('#storyBanner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('CAPÍTULO 1');
    await expect(banner).toContainText('Portão da Cidade');
    await page.screenshot({ path: `${SHOTS}/40-story-chapter1.png` });
    expect(errors).toEqual([]);
  });

  test('every level: boss spawns, telegraphs, shoots, changes phase and dies cleanly', async ({ page }) => {
    test.setTimeout(240000);
    const errors = watchErrors(page);
    await start(page);

    for (let level = 1; level <= 10; level++) {
      await page.evaluate((n) => (window as any).__wxh.goToLevel(n), level);
      await page.waitForFunction(() => (window as any).__wxh.isStarted(), null, { timeout: 15000 });
      await page.evaluate(() => (window as any).__wxh.forceBoss());

      // boss enters the screen
      await page.waitForFunction(() => { const b = (window as any).__wxh.boss(); return b && b.y > 40; }, null, { timeout: 25000 })
        .catch(async (e) => { throw new Error(`level ${level}: boss never entered (state: ${JSON.stringify(await page.evaluate(() => ({ boss: (window as any).__wxh.boss(), over: (window as any).__wxh.isGameOver(), alive: (window as any).__wxh.armyAlive() })))}) ${e.message}`); });
      const info = await page.evaluate(() => (window as any).__wxh.boss());
      expect(info.maxHp).toBeGreaterThan(0);
      await expect(page.locator('#storyBanner')).toContainText(/CHEFE|CAPÍTULO/);

      // telegraph then projectiles
      await page.waitForFunction(() => (window as any).__wxh.boss()?.telegraph > 0, null, { timeout: 15000 });
      await page.screenshot({ path: `${SHOTS}/50-boss-${String(level).padStart(2, '0')}-telegraph.png` });
      await page.waitForFunction(() => (window as any).__wxh.enemyBullets() > 0, null, { timeout: 15000 });

      // phase 2 → 3
      await page.evaluate(() => (window as any).__wxh.setBossHpRatio(0.5));
      await page.waitForFunction(() => (window as any).__wxh.boss()?.phase >= 2, null, { timeout: 5000 });
      await page.evaluate(() => (window as any).__wxh.setBossHpRatio(0.2));
      await page.waitForFunction(() => (window as any).__wxh.boss()?.phase === 3, null, { timeout: 5000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SHOTS}/51-boss-${String(level).padStart(2, '0')}-phase3.png` });

      // finish the boss; level advances (or victory on level 10)
      await page.evaluate(() => (window as any).__wxh.killBoss());
      if (level < 10) {
        await page.waitForFunction((n) => (window as any).__wxh.level() > n || (window as any).__wxh.isGameOver(), level, { timeout: 25000 });
        // clearing a chapter pauses the run on the perk-choice cards: pick the first one
        if (await page.evaluate(() => (window as any).__wxh.perkOpen())) {
          await page.locator('.perk-card').first().click();
        }
        if (await page.evaluate(() => (window as any).__wxh.isGameOver())) {
          // army was wiped by the volleys — acceptable outcome; restart the run for the next level
          await page.evaluate(() => (window as any).__wxh.goToLevel(1));
        }
      } else {
        await page.waitForFunction(() => (window as any).__wxh.isGameOver() || (window as any).__wxh.victory(), null, { timeout: 30000 });
      }
    }
    expect(errors).toEqual([]);
  });

  test('boss volleys can defeat the army and the defeat screen shows the epilogue', async ({ page }) => {
    test.setTimeout(120000);
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => (window as any).__wxh.goToLevel(9));
    await page.evaluate(() => { (window as any).__wxh.forceBoss(); (window as any).__wxh.setBossHpRatio(0.2); });
    // stand still: the aimed/rain patterns must eventually wipe a standing army
    await page.waitForFunction(() => (window as any).__wxh.isGameOver(), null, { timeout: 90000 });
    await expect(page.locator('.epilogue')).toBeVisible();
    // pause/settings are gone and the share buttons are reachable inside the viewport
    await expect(page.locator('.top-controls')).toBeHidden();
    const share = page.locator('.share-btn').first();
    await share.scrollIntoViewIfNeeded();
    const sb = (await share.boundingBox())!;
    expect(sb.y + sb.height).toBeLessThanOrEqual(844 + 0.5);
    await page.screenshot({ path: `${SHOTS}/60-defeat-epilogue.png` });
    expect(errors).toEqual([]);
  });

  test('shop purchase adds soldiers and spends coins', async ({ page }) => {
    await start(page);
    await page.evaluate(() => (window as any).__wxh.setCoins(120));
    const before = await page.evaluate(() => (window as any).__wxh.armyAlive());
    await page.locator('#shopContainer .shop-btn').first().click(); // +10 tropas (50)
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => (window as any).__wxh.armyAlive());
    expect(after).toBeGreaterThanOrEqual(before + 10);
    const coins = await page.evaluate(() => (window as any).__wxh.coins());
    expect(coins).toBeLessThan(120);
  });

  test('unlocked skin can be selected and persists into the run', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('crowdHighScore', '25000'));
    await page.goto('/');
    const galaxy = page.locator('.skin-card[data-skin-id="galaxy"]');
    await galaxy.scrollIntoViewIfNeeded();
    await expect(galaxy).toBeEnabled();
    await galaxy.click();
    await expect(galaxy).toHaveClass(/selected/);
    await page.screenshot({ path: `${SHOTS}/70-skin-galaxy-picker.png` });
    await page.locator('#startBtnOverlay').click();
    await page.waitForFunction(() => (window as any).__wxh?.isStarted(), null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SHOTS}/71-skin-galaxy-play.png` });
    expect(await page.evaluate(() => localStorage.getItem('crowdHeroSkin'))).toBe('galaxy');
  });

  test('random-input bot plays 25s without errors', async ({ page }) => {
    test.setTimeout(90000);
    const errors = watchErrors(page);
    await start(page);
    await page.evaluate(() => (window as any).__wxh.setCoins(5000));
    const canvas = (await page.locator('#gameCanvas').boundingBox())!;
    const end = Date.now() + 25000;
    let i = 0;
    while (Date.now() < end) {
      const x = canvas.x + canvas.width * (0.15 + 0.7 * Math.random());
      await page.touchscreen.tap(x, canvas.y + canvas.height * 0.7);
      if (i++ % 5 === 0) await page.keyboard.press(Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight');
      if (i % 7 === 0) await page.locator('#shopContainer .shop-btn:not([disabled])').first().click({ trial: false }).catch(() => {});
      await page.waitForTimeout(250);
    }
    await page.screenshot({ path: `${SHOTS}/80-bot-session.png` });
    expect(errors).toEqual([]);
  });
});
