import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

import { setupShopUI, updateShopUI } from '../src/ui-overlay';
import { GameState } from '../src/types';

describe('UI Overlay Extra Coverage', () => {
    let gameState: GameState;

    beforeEach(() => {
        document.body.innerHTML = '';
        gameState = {
            coins: 1000,
            isStarted: true,
            isGameOver: false
        } as any;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Shop UI', () => {
        it('should show shop and update button states', () => {
            setupShopUI(vi.fn());
            const container = document.getElementById('shopContainer');

            // Set mixed coins
            gameState.coins = 75; // Enough for soldier (50), not rambo (100)
            updateShopUI(gameState);

            expect(container?.style.display).toBe('flex');

            const btns = container?.querySelectorAll('button');
            const soldierBtn = btns![0];
            const ramboBtn = btns![2];

            expect(soldierBtn.disabled).toBe(false);
            expect(ramboBtn.disabled).toBe(true);
            // Inline opacity check removed as it's now handled by CSS :disabled
        });

        it('should handle pointer events for visuals', () => {
            setupShopUI(vi.fn());
            const btn = document.getElementById('shopContainer')!.children[0] as HTMLButtonElement;

            // Pointer down
            btn.dispatchEvent(new Event('pointerdown'));
            // Visual change is CSS now, so no inline style assertion

            // Pointer up
            btn.dispatchEvent(new Event('pointerup'));
            // Check logic if any
        });
    });
});

describe('getLeaderboardElement coverage', () => {
    it('should handle corrupted score formats like NaN or Infinity', async () => {
        vi.resetModules();

        const originalParse = JSON.parse;
        vi.spyOn(JSON, 'parse').mockImplementation((text) => {
            if (text === 'CROWD_MOCK') {
                return [
                    { name: 'Corrupt 1', score: NaN },
                    { name: 'Corrupt 2', score: Infinity },
                    { name: 'Zero', score: 0 }
                ];
            }
            return originalParse(text);
        });

        vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) => {
            if (key === 'crowdLeaderboard') {
                return 'CROWD_MOCK';
            }
            return null;
        });

        const uiModule = await import('../src/ui-overlay');
        const getLeaderboardElement = uiModule._testing.getLeaderboardElement;

        const el = getLeaderboardElement(0);
        const items = el.querySelectorAll('.score-col');

        expect(items.length).toBeGreaterThan(0);
        expect(items[0].textContent).toBe('0');
        expect(items[1].textContent).toBe('0');
        expect(items[2].textContent).toBe('0');

        vi.restoreAllMocks();
    });
});
