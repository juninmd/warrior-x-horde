import { test, expect, Page } from '@playwright/test';

const SHOTS = 'test-results/screenshots';

async function play(page: Page) {
  await page.goto('/');
  await page.locator('#startBtnOverlay').click();
  await page.waitForFunction(() => (window as any).__wxh?.isStarted(), null, { timeout: 15000 });
}

const box = (page: Page, sel: string) => page.locator(sel).first().boundingBox();

const VIEWPORTS = [
  { name: 'phone-portrait', size: { width: 390, height: 844 }, mobile: true },
  { name: 'phone-small', size: { width: 360, height: 640 }, mobile: true },
  { name: 'desktop', size: { width: 1280, height: 800 }, mobile: false },
];

for (const vp of VIEWPORTS) {
  test.describe(`UX layout — ${vp.name}`, () => {
    test.use({ viewport: vp.size, isMobile: vp.mobile, hasTouch: vp.mobile, deviceScaleFactor: 2 });

    test('canvas keeps the game aspect ratio and fits the viewport', async ({ page }) => {
      await page.goto('/');
      const c = (await box(page, '#gameCanvas'))!;
      expect(Math.abs(c.width / c.height - 480 / 800)).toBeLessThan(0.01);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x + c.width).toBeLessThanOrEqual(vp.size.width + 0.5);
      expect(c.y + c.height).toBeLessThanOrEqual(vp.size.height + 0.5);
    });

    test('shop is a vertical rail on the right edge, SUPER on the left, nothing overlaps or is cut', async ({ page }) => {
      await play(page);
      const canvas = (await box(page, '#gameCanvas'))!;
      const btns = await page.locator('#shopContainer .shop-btn').all();
      expect(btns.length).toBe(6);
      const boxes = [];
      for (const b of btns) boxes.push((await b.boundingBox())!);

      // same column, right half of the canvas, stacked vertically
      const xs = new Set(boxes.map(b => Math.round(b.x)));
      expect(xs.size).toBe(1);
      for (const b of boxes) {
        expect(b.x).toBeGreaterThan(canvas.x + canvas.width * 0.6);
        expect(b.x + b.width).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
        expect(b.y).toBeGreaterThanOrEqual(canvas.y);
        expect(b.y + b.height).toBeLessThanOrEqual(canvas.y + canvas.height + 0.5);
        expect(b.width).toBeGreaterThanOrEqual(44); // touch target
        expect(b.height).toBeGreaterThanOrEqual(44);
      }
      const sorted = [...boxes].sort((a, b) => a.y - b.y);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].y).toBeGreaterThanOrEqual(sorted[i - 1].y + sorted[i - 1].height - 0.5);
      }

      // SUPER on the left, fully inside the canvas
      const sup = (await box(page, '#superCannonBtn'))!;
      expect(sup.x + sup.width / 2).toBeLessThan(canvas.x + canvas.width / 2);
      expect(sup.x).toBeGreaterThanOrEqual(canvas.x);
      expect(sup.y + sup.height).toBeLessThanOrEqual(canvas.y + canvas.height + 0.5);

      // pause / settings / help do not collide with the shop rail
      const topSel = ['#pauseBtnTop', '#settingsBtn', '#shopHelpBtn'];
      for (const s of topSel) {
        const t = (await box(page, s))!;
        for (const b of boxes) {
          const overlap = t.x < b.x + b.width && t.x + t.width > b.x && t.y < b.y + b.height && t.y + t.height > b.y;
          expect(overlap, `${s} overlaps a shop button`).toBe(false);
        }
        expect(t.x + t.width).toBeLessThanOrEqual(canvas.x + canvas.width + 0.5);
      }
      await page.screenshot({ path: `${SHOTS}/20-ux-${vp.name}-play.png` });
    });

    test('help panel explains every item and closes', async ({ page }) => {
      await play(page);
      const panel = page.locator('#shopHelp');
      await expect(panel).toBeHidden();
      await page.locator('#shopHelpBtn').click();
      await expect(panel).toBeVisible();
      await expect(panel.locator('li')).toHaveCount(6);
      const p = (await panel.boundingBox())!;
      const canvas = (await box(page, '#gameCanvas'))!;
      expect(p.x).toBeGreaterThanOrEqual(canvas.x);
      expect(p.y).toBeGreaterThanOrEqual(canvas.y);
      expect(p.y + p.height).toBeLessThanOrEqual(canvas.y + canvas.height + 0.5);
      await page.screenshot({ path: `${SHOTS}/21-ux-${vp.name}-help.png` });
      await page.locator('#shopHelpBtn').click();
      await expect(panel).toBeHidden();
    });

    test('start screen fits and the CTA is reachable', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#startScreen')).toBeVisible();
      await expect(page.locator('.how-to li')).toHaveCount(4);
      const btn = page.locator('#startBtnOverlay');
      await btn.scrollIntoViewIfNeeded();
      const b = (await btn.boundingBox())!;
      expect(b.y + b.height).toBeLessThanOrEqual(vp.size.height + 0.5);
      await page.screenshot({ path: `${SHOTS}/22-ux-${vp.name}-start.png` });
    });

    test('shop and controls are hidden before the game starts', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('#shopContainer')).toBeHidden();
      await expect(page.locator('#superCannonBtn')).toBeHidden();
    });
  });
}
