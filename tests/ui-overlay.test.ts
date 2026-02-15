import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

import { setupShopUI, updateShopUI, setupSuperCannonUI, updateSuperCannonUI, setupGameOverUI, showGameOverScreen, updateStartScreenLeaderboard, startCountdown, _testing } from '../src/ui-overlay';
import { GameState } from '../src/types';

describe('UI Overlay', () => {
    let gameState: GameState;

    beforeEach(() => {
        document.body.innerHTML = '<div id="shopContainer"></div><div id="superCannonContainer"></div><div id="gameOverContainer"></div><div class="start-screen-content"><button class="start-btn">START</button></div>';
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
            currentLevel: 1,
            totalKills: 50,
            runStartTime: Date.now() - 10000 // 10 seconds ago
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
        it('should setup shop UI when container does not exist', () => {
            document.getElementById('shopContainer')?.remove();
            setupShopUI(vi.fn());
            expect(document.getElementById('shopContainer')).toBeDefined();
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

        it('should handle pointer effects on buttons', () => {
            setupShopUI(vi.fn());
            const btn = document.getElementById('shopContainer')!.children[0] as HTMLButtonElement;

            // Dispatch pointerdown
            const event = new Event('pointerdown');
            btn.dispatchEvent(event);
            expect(btn.style.transform).toBe('scale(0.95)');

            // Dispatch pointerup
            const eventUp = new Event('pointerup');
            btn.dispatchEvent(eventUp);
            expect(btn.style.transform).toBe('scale(1)');

            // Dispatch pointerleave
            const eventLeave = new Event('pointerleave');
            btn.dispatchEvent(eventLeave);
            expect(btn.style.transform).toBe('scale(1)');
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

        it('should handle start countdown', () => {
            vi.useFakeTimers();
            const onComplete = vi.fn();

            // Mock Element.animate if not available in JSDOM environment or to control it
            window.HTMLElement.prototype.animate = vi.fn().mockReturnValue({
                finished: Promise.resolve(),
                cancel: vi.fn(),
                addEventListener: vi.fn(),
            });

            startCountdown(onComplete);

            // Check DOM
            let el = document.body.lastElementChild as HTMLElement;
            expect(el.innerText).toBe('3');

            // Advance timers
            vi.advanceTimersByTime(800);
            expect(el.innerText).toBe('2');

            vi.advanceTimersByTime(800);
            expect(el.innerText).toBe('1');

            vi.advanceTimersByTime(800);
            expect(el.innerText).toBe('GO!');

            vi.advanceTimersByTime(500);
            // Should be removed
            expect(document.body.contains(el)).toBe(false);
            expect(onComplete).toHaveBeenCalled();

            vi.useRealTimers();
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

    describe('Leaderboard UI', () => {
        it('should handle empty leaderboard', () => {
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue('[]');
            updateStartScreenLeaderboard();
            const lb = document.getElementById('startScreenLeaderboard');
            expect(lb).toBeNull();
        });

        it('should handle null localStorage', () => {
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
            updateStartScreenLeaderboard();
            const lb = document.getElementById('startScreenLeaderboard');
            expect(lb).toBeNull();
        });

        it('should handle populated leaderboard with full rank coverage', () => {
            // Entries for 1st, 2nd, 3rd, and 4th place to cover all rank color branches
            const data = [
                { score: 1000, date: Date.now() },
                { score: 900, date: Date.now() },
                { score: 800, date: Date.now() },
                { score: 700, date: Date.now() }
            ];
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify(data));

            updateStartScreenLeaderboard();

            const lb = document.getElementById('startScreenLeaderboard');
            expect(lb).not.toBeNull();
            expect(lb?.innerHTML).toContain('Top Commanders');
            expect(lb?.innerHTML).toContain('1,000');

            // Verify Rank Colors
            expect(lb?.innerHTML).toContain('#FFD700'); // Gold
            expect(lb?.innerHTML).toContain('#C0C0C0'); // Silver
            expect(lb?.innerHTML).toContain('#CD7F32'); // Bronze
            expect(lb?.innerHTML).toContain('#AAA');    // Default
        });

        it('should handle corrupt localStorage data', () => {
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue('{invalid');
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            updateStartScreenLeaderboard();

            expect(consoleSpy).toHaveBeenCalled();
            const lb = document.getElementById('startScreenLeaderboard');
            expect(lb).toBeNull();
        });

        it('should handle missing container safely', () => {
            document.body.innerHTML = ''; // Clear DOM
            updateStartScreenLeaderboard();
            // Should just return
        });


        it('should handle valid JSON that is not an array', () => {
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue('{}');
            updateStartScreenLeaderboard();
            const lb = document.getElementById('startScreenLeaderboard');
            expect(lb).toBeNull();
        });
        it('should sanitize HTML in leaderboard entries (direct test)', () => {
            const data = [
                { score: '<script>alert(1)</script>' }, // Malicious
                { score: 12345 }
            ];
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify(data));

            // Call internal function directly
            const html = _testing.getLeaderboardHTML();

            // Should contain the safe score (0 for malicious, 12345 for valid)
            expect(html).toContain('12,345');
            // Malicious score becomes NaN -> 0
            expect(html).toContain('>0</span>');
            // Should NOT contain script tags
            expect(html).not.toContain('<script>');
        });
        it('should highlight current player score', () => {
            const data = [{ score: 1000 }];
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify(data));

            // Call with matching score
            const html = _testing.getLeaderboardHTML(1000);

            expect(html).toContain('linear-gradient(90deg, rgba(255, 215, 0, 0.2), transparent)'); // Highlight color
            expect(html).toContain('font-weight: 800');
        });


        it('should remove existing leaderboard container to avoid duplicates', () => {
            const data = [{ score: 1000 }];
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify(data));

            // Call first time
            updateStartScreenLeaderboard();
            const lb1 = document.getElementById('startScreenLeaderboard');
            expect(lb1).not.toBeNull();

            // Call second time - should replace
            updateStartScreenLeaderboard();
            const lb2 = document.getElementById('startScreenLeaderboard');
            expect(lb2).not.toBeNull();
            expect(lb2).not.toBe(lb1); // Should be a new element
        });
    });
});
