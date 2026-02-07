import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as uiOverlay from '../src/ui-overlay';
import { GameState } from '../src/types';
import * as input from '../src/input';

// Mock input
vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

describe('UI Overlay Extra Coverage', () => {
    let gameState: GameState;
    let shopCallback: any;
    let superCannonCallback: any;

    beforeEach(() => {
        document.body.innerHTML = ''; // Clear DOM
        // Setup mocks
        shopCallback = vi.fn();
        superCannonCallback = vi.fn();

        gameState = {
            isStarted: false,
            isGameOver: false,
            coins: 1000,
            score: 0,
            highScore: 100,
            currentLevel: 1,
            superCannonLastUsed: 0,
            superCannonCooldown: 10000,
            superCannonActive: false,
            superCannonReady: false,
            superCannonDuration: 5000,
            superCannonTimer: 0,
            maxCombo: 10,
            isVictory: false
        } as any;

        vi.clearAllMocks();
        localStorage.clear();

        // Mock animate for JSDOM
        HTMLElement.prototype.animate = vi.fn().mockReturnValue({
            finished: Promise.resolve(),
            cancel: vi.fn(),
            play: vi.fn(),
            pause: vi.fn(),
            reverse: vi.fn(),
            onfinish: null
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    describe('Shop UI', () => {
        it('should setup shop UI and handle Soldier button specifics', () => {
            uiOverlay.setupShopUI(shopCallback);
            const container = document.getElementById('shopContainer');
            expect(container).toBeDefined();

            // Verify buttons exist
            const soldierBtn = container?.children[0] as HTMLButtonElement;
            expect(soldierBtn).toBeDefined();
            // Check HTML content for soldier override
            expect(soldierBtn.innerHTML).toContain('+10 UNITS');

            // Click it
            soldierBtn.click();
            expect(shopCallback).toHaveBeenCalledWith('soldier', 50);
            expect(input.vibrate).toHaveBeenCalled();
        });

        it('should handle Nuke button specifics', () => {
            uiOverlay.setupShopUI(shopCallback);
            const container = document.getElementById('shopContainer');
            const nukeBtn = container?.children[4] as HTMLButtonElement; // 5th button
            expect(nukeBtn.innerHTML).toContain('NUKE');

            nukeBtn.click();
            expect(shopCallback).toHaveBeenCalledWith('nuke', 500);
        });

        it('should handle Recharge button specifics', () => {
            uiOverlay.setupShopUI(shopCallback);
            const container = document.getElementById('shopContainer');
            const rechargeBtn = container?.children[5] as HTMLButtonElement; // 6th button
            expect(rechargeBtn.innerHTML).toContain('RECARGA');

            rechargeBtn.click();
            expect(shopCallback).toHaveBeenCalledWith('recharge_super', 200);
        });

        it('should hide shop when game not started or game over', () => {
            uiOverlay.setupShopUI(shopCallback);
            const container = document.getElementById('shopContainer');

            gameState.isStarted = false;
            uiOverlay.updateShopUI(gameState);
            expect(container?.style.display).toBe('none');

            gameState.isStarted = true;
            gameState.isGameOver = true;
            uiOverlay.updateShopUI(gameState);
            expect(container?.style.display).toBe('none');
        });

        it('should show shop and update button states', () => {
            uiOverlay.setupShopUI(shopCallback);
            const container = document.getElementById('shopContainer');

            gameState.isStarted = true;
            gameState.coins = 60; // Enough for soldier (50), not for Rambo (100)

            uiOverlay.updateShopUI(gameState);
            expect(container?.style.display).toBe('flex');

            const soldierBtn = container?.children[0] as HTMLButtonElement;
            const ramboBtn = container?.children[2] as HTMLButtonElement;

            expect(soldierBtn.disabled).toBe(false);
            expect(ramboBtn.disabled).toBe(true);
            expect(ramboBtn.style.opacity).toBe('0.5');
        });

        it('should handle pointer events for visuals', () => {
            uiOverlay.setupShopUI(shopCallback);
            const container = document.getElementById('shopContainer');
            const btn = container?.children[0] as HTMLButtonElement;

            // Pointer down
            btn.dispatchEvent(new Event('pointerdown'));
            expect(btn.style.transform).toBe('scale(0.95)');

            // Pointer up
            btn.dispatchEvent(new Event('pointerup'));
            expect(btn.style.transform).toBe('scale(1)');

             // Pointer leave
            btn.dispatchEvent(new Event('pointerdown'));
            btn.dispatchEvent(new Event('pointerleave'));
            expect(btn.style.transform).toBe('scale(1)');
        });
    });

    describe('Super Cannon UI', () => {
        it('should setup and handle click', () => {
            // Needs container in DOM first as it expects it
            const container = document.createElement('div');
            container.id = 'superCannonContainer';
            document.body.appendChild(container);

            uiOverlay.setupSuperCannonUI(superCannonCallback);

            const btn = document.getElementById('superCannonBtn') as HTMLButtonElement;
            expect(btn).toBeDefined();

            // Click
            btn.click();
            expect(superCannonCallback).toHaveBeenCalled();
            expect(input.vibrate).toHaveBeenCalled();
        });

        it('should hide when not playing', () => {
            const container = document.createElement('div');
            container.id = 'superCannonContainer';
            document.body.appendChild(container);
            uiOverlay.setupSuperCannonUI(superCannonCallback);

            gameState.isStarted = false;
            uiOverlay.updateSuperCannonUI(gameState);
            expect(container.style.display).toBe('none');
        });

        it('should show states: Active', () => {
            const container = document.createElement('div');
            container.id = 'superCannonContainer';
            document.body.appendChild(container);
            uiOverlay.setupSuperCannonUI(superCannonCallback);
            const btn = document.getElementById('superCannonBtn') as HTMLButtonElement;

            gameState.isStarted = true;
            gameState.superCannonActive = true;

            uiOverlay.updateSuperCannonUI(gameState);
            expect(btn.innerHTML).toBe('⚡ ATIVO!');
            expect(btn.disabled).toBe(true);
        });

        it('should show states: Cooldown', () => {
            const container = document.createElement('div');
            container.id = 'superCannonContainer';
            document.body.appendChild(container);
            uiOverlay.setupSuperCannonUI(superCannonCallback);
            const btn = document.getElementById('superCannonBtn') as HTMLButtonElement;

            gameState.isStarted = true;
            gameState.superCannonActive = false;
            gameState.superCannonLastUsed = Date.now(); // Just used

            uiOverlay.updateSuperCannonUI(gameState);
            expect(btn.innerHTML).toContain('⏳');
            expect(btn.disabled).toBe(true);
        });

        it('should show states: Ready', () => {
            const container = document.createElement('div');
            container.id = 'superCannonContainer';
            document.body.appendChild(container);
            uiOverlay.setupSuperCannonUI(superCannonCallback);
            const btn = document.getElementById('superCannonBtn') as HTMLButtonElement;

            gameState.isStarted = true;
            gameState.superCannonActive = false;
            gameState.superCannonLastUsed = 0; // Long ago

            uiOverlay.updateSuperCannonUI(gameState);
            expect(btn.innerHTML).toBe('⚡ SUPER');
            expect(btn.disabled).toBe(false);
        });
    });

    describe('Game Over UI', () => {
        let restartCb: any;
        let shareCb: any;

        beforeEach(() => {
            restartCb = vi.fn();
            shareCb = vi.fn();
            uiOverlay.setupGameOverUI(restartCb, shareCb);
        });

        it('should show game over screen with Rank C', () => {
            gameState.score = 500; // < 1000
            uiOverlay.showGameOverScreen(gameState);

            const container = document.getElementById('gameOverContainer');
            expect(container?.style.display).toBe('flex');
            expect(container?.innerHTML).toContain('RANK');
            expect(container?.innerHTML).toContain('>C<');
            expect(container?.innerHTML).toContain('GAME OVER');
        });

        it('should show Rank B', () => {
            gameState.score = 1500;
            uiOverlay.showGameOverScreen(gameState);
            const container = document.getElementById('gameOverContainer');
            expect(container?.innerHTML).toContain('>B<');
        });

        it('should show Rank A', () => {
            gameState.score = 3500;
            uiOverlay.showGameOverScreen(gameState);
            const container = document.getElementById('gameOverContainer');
            expect(container?.innerHTML).toContain('>A<');
        });

        it('should show Rank S', () => {
            gameState.score = 6000;
            uiOverlay.showGameOverScreen(gameState);
            const container = document.getElementById('gameOverContainer');
            expect(container?.innerHTML).toContain('>S<');
        });

        it('should show Victory title', () => {
            gameState.isVictory = true;
            gameState.currentLevel = 10;
            uiOverlay.showGameOverScreen(gameState);
            const container = document.getElementById('gameOverContainer');
            expect(container?.innerHTML).toContain('VITÓRIA');
            expect(container?.innerHTML).toContain('MOTHERSHIP DESTROYED');

            const restartBtn = document.getElementById('goRestartBtn');
            expect(restartBtn?.textContent).toContain('CONTINUE LEVEL 11');
        });

        it('should render leaderboard', () => {
            const leaderboard = [
                { score: 5000, date: 123 },
                { score: 3000, date: 123 }
            ];
            localStorage.setItem('crowdLeaderboard', JSON.stringify(leaderboard));

            gameState.score = 3000; // Should highlight
            uiOverlay.showGameOverScreen(gameState);

            const container = document.getElementById('gameOverContainer');
            expect(container?.innerHTML).toContain('Top Commanders');
            expect(container?.innerHTML).toContain('5,000');
            expect(container?.innerHTML).toContain('3,000');
        });

        it('should handle broken leaderboard in localStorage', () => {
             const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
             localStorage.setItem('crowdLeaderboard', '{broken json');

             uiOverlay.showGameOverScreen(gameState);

             // Should not crash, just empty leaderboard
             const container = document.getElementById('gameOverContainer');
             expect(container?.innerHTML).not.toContain('Top Commanders');
             consoleSpy.mockRestore();
        });

        it('should handle Restart click', () => {
            vi.useFakeTimers();
            uiOverlay.showGameOverScreen(gameState);

            const btn = document.getElementById('goRestartBtn');
            btn?.click();

            expect(input.vibrate).toHaveBeenCalled();
            // Wait for fade out
            vi.advanceTimersByTime(350);

            expect(restartCb).toHaveBeenCalled();
            vi.useRealTimers();
        });

        it('should handle Share clicks', () => {
            uiOverlay.showGameOverScreen(gameState);

            const xBtn = document.getElementById('goShareX');
            xBtn?.click();
            expect(shareCb).toHaveBeenCalledWith('x');

            const waBtn = document.getElementById('goShareWa');
            waBtn?.click();
            expect(shareCb).toHaveBeenCalledWith('whatsapp');
        });
    });

    describe('Countdown', () => {
        it('should run countdown', () => {
            vi.useFakeTimers();
            const onComplete = vi.fn();

            uiOverlay.startCountdown(onComplete);

            // 3...
            vi.advanceTimersByTime(800);
            // 2...
            vi.advanceTimersByTime(800);
            // 1...
            vi.advanceTimersByTime(800);
            // GO!

            // Wait for GO animation
            vi.advanceTimersByTime(500);

            expect(onComplete).toHaveBeenCalled();
            vi.useRealTimers();
        });
    });
});
