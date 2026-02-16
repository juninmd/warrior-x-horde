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
