import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

import { setupShopUI, updateShopUI, setupSuperCannonUI, updateSuperCannonUI, setupGameOverUI, showGameOverScreen } from '../src/ui-overlay';
import { GameState } from '../src/types';

describe('UI Overlay', () => {
    let gameState: GameState;

    beforeEach(() => {
        document.body.innerHTML = '<div id="shopContainer"></div><div id="superCannonContainer"></div><div id="gameOverContainer"></div>';
        gameState = {
            coins: 1000,
            isStarted: true,
            isGameOver: false,
            superCannonReady: true,
            superCannonLastUsed: 0,
            superCannonCooldown: 1000,
            superCannonActive: false,
            score: 100,
            highScore: 200,
            maxCombo: 5,
            currentLevel: 1
        } as any;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Shop UI', () => {
        it('should setup shop UI', () => {
            const onBuy = vi.fn();
            setupShopUI(onBuy);

            const container = document.getElementById('shopContainer');
            expect(container).toBeDefined();
            expect(container?.children.length).toBeGreaterThan(0);

            // Test button click
            const btn = container?.querySelector('button');
            btn?.click();
            expect(onBuy).toHaveBeenCalled();
        });

        it('should update shop UI (enable/disable buttons)', () => {
            setupShopUI(vi.fn());
            const container = document.getElementById('shopContainer');
            const btns = container?.querySelectorAll('button');

            // Coins 1000 -> all enabled
            updateShopUI(gameState);
            expect(btns![0].disabled).toBe(false);

            // Coins 0 -> all disabled
            gameState.coins = 0;
            updateShopUI(gameState);
            expect(btns![0].disabled).toBe(true);
        });

        it('should hide shop if game not started', () => {
            setupShopUI(vi.fn());
            gameState.isStarted = false;
            updateShopUI(gameState);
            const container = document.getElementById('shopContainer');
            expect(container?.style.display).toBe('none');
        });
    });

    describe('Super Cannon UI', () => {
        it('should setup super cannon UI', () => {
            const onActivate = vi.fn();
            setupSuperCannonUI(onActivate);

            const container = document.getElementById('superCannonContainer');
            expect(container?.children.length).toBe(1);

            const btn = document.getElementById('superCannonBtn');
            btn?.click();
            expect(onActivate).toHaveBeenCalled();
        });

        it('should update super cannon UI', () => {
            setupSuperCannonUI(vi.fn());
            const btn = document.getElementById('superCannonBtn') as HTMLButtonElement;

            // Ready
            updateSuperCannonUI(gameState);
            expect(btn.disabled).toBe(false);
            expect(btn.innerHTML).toContain('SUPER');

            // Active
            gameState.superCannonActive = true;
            updateSuperCannonUI(gameState);
            expect(btn.disabled).toBe(true);
            expect(btn.innerHTML).toContain('ATIVO');

            // Cooldown
            gameState.superCannonActive = false;
            gameState.superCannonReady = false;
            gameState.superCannonLastUsed = Date.now();
            updateSuperCannonUI(gameState);
            expect(btn.disabled).toBe(true);
            expect(btn.innerHTML).toContain('s'); // seconds
        });
    });

    describe('Game Over UI', () => {
        it('should setup game over UI', () => {
            setupGameOverUI(vi.fn(), vi.fn());
            const container = document.getElementById('gameOverContainer');
            expect(container).toBeDefined();
            // Should be hidden initially (via logic inside setup calling create)
            // But wait, setup creates it. show makes it visible.
        });

        it('should show game over screen', () => {
            const onRestart = vi.fn();
            const onShare = vi.fn();
            setupGameOverUI(onRestart, onShare);

            showGameOverScreen(gameState);

            const container = document.getElementById('gameOverContainer');
            expect(container?.style.display).toBe('flex');
            expect(container?.innerHTML).toContain('GAME OVER');

            // Test buttons
            const restartBtn = document.getElementById('goRestartBtn');
            restartBtn?.click();
            // It has a timeout
            vi.useFakeTimers();
            restartBtn?.click();
            vi.advanceTimersByTime(300);
            expect(onRestart).toHaveBeenCalled();
            vi.useRealTimers();

            const shareBtn = document.getElementById('goShareX');
            shareBtn?.click();
            expect(onShare).toHaveBeenCalledWith('x');
        });

        it('should show victory screen', () => {
            setupGameOverUI(vi.fn(), vi.fn());
            gameState.isVictory = true;
            gameState.currentLevel = 10;

            showGameOverScreen(gameState);

            const container = document.getElementById('gameOverContainer');
            expect(container?.innerHTML).toContain('VITÓRIA');
        });
    });
});
