import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateStartScreenLeaderboard, updateSuperCannonUI, setupSuperCannonUI, setupGameOverUI, showGameOverScreen } from '../src/ui-overlay';
import { GameState } from '../src/types';

// Mock dependencies
vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

describe('UI Overlay Final Coverage', () => {
    let gameState: GameState;

    beforeEach(() => {
        document.body.innerHTML = '';
        gameState = {
            isStarted: true,
            isGameOver: false,
            score: 0,
            highScore: 0,
            coins: 0,
            superCannonReady: false,
            superCannonLastUsed: 0,
            superCannonCooldown: 1000,
            superCannonActive: false,
            maxCombo: 0,
            currentLevel: 1,
            totalKills: 0,
            runStartTime: Date.now(),
        } as any;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('updateStartScreenLeaderboard', () => {
        it('should append leaderboard if start button is missing', () => {
            document.body.innerHTML = `
                <div class="start-screen-content">
                    <div class="game-logo">LOGO</div>
                    <!-- No .start-btn -->
                </div>
            `;

            // Mock localStorage
            vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify([{score: 100}]));

            updateStartScreenLeaderboard();

            const container = document.querySelector('.start-screen-content');
            const lb = document.getElementById('startScreenLeaderboard');
            expect(lb).not.toBeNull();
            // Should be appended to end
            expect(container?.lastElementChild).toBe(lb);
        });

        it('should insert before button if present', () => {
             document.body.innerHTML = `
                <div class="start-screen-content">
                    <button class="start-btn">START</button>
                </div>
            `;
             vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify([{score: 100}]));
             updateStartScreenLeaderboard();
             // Check order
             const content = document.querySelector('.start-screen-content');
             expect(content?.children[0].id).toBe('startScreenLeaderboard');
        });

        it('should handle missing logo element', () => {
             document.body.innerHTML = `
                <div class="start-screen-content">
                    <!-- No logo -->
                </div>
            `;
             vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify([{score: 100}]));
             // Should not crash
             updateStartScreenLeaderboard();
        });
    });

    describe('updateSuperCannonUI', () => {
        it('should return early if buttons are missing but container exists', () => {
             const container = document.createElement('div');
             container.id = 'superCannonContainer';
             document.body.appendChild(container);

             // Ensure 'buttons' cache is empty for this key by NOT calling setup
             updateSuperCannonUI(gameState);
        });

        it('should hide container if game not started', () => {
             setupSuperCannonUI(vi.fn());
             gameState.isStarted = false;
             updateSuperCannonUI(gameState);
             const container = document.getElementById('superCannonContainer');
             expect(container?.style.display).toBe('none');
        });

        it('should hide container if game over', () => {
             setupSuperCannonUI(vi.fn());
             gameState.isGameOver = true;
             updateSuperCannonUI(gameState);
             const container = document.getElementById('superCannonContainer');
             expect(container?.style.display).toBe('none');
        });
    });

    describe('showGameOverScreen', () => {
        it('should handle Install App button click', async () => {
             const promptMock = {
                 prompt: vi.fn(),
                 userChoice: Promise.resolve({ outcome: 'accepted' })
             };
             gameState.deferredInstallPrompt = promptMock as any;

             setupGameOverUI(vi.fn(), vi.fn());
             showGameOverScreen(gameState);

             const installBtn = document.getElementById('goInstallBtn');
             expect(installBtn).not.toBeNull();

             // Click it
             installBtn?.click();

             // Wait for async handler promises to resolve
             await Promise.resolve();
             await Promise.resolve();

             expect(promptMock.prompt).toHaveBeenCalled();
             // Should hide button
             expect(installBtn?.style.display).toBe('none');
        });

        it('should show Rank C for score 500', () => {
             gameState.score = 500;
             setupGameOverUI(vi.fn(), vi.fn());
             showGameOverScreen(gameState);
             const container = document.getElementById('gameOverContainer');
             expect(container?.innerHTML).toContain('C'); // Rank C
             expect(container?.innerHTML).toContain('#2ECC71'); // Green
        });

        it('should animate score count up', () => {
             setupGameOverUI(vi.fn(), vi.fn());
             gameState.score = 1000;

             let frameCallback: FrameRequestCallback | null = null;
             const rAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
                 frameCallback = cb;
                 return 1;
             });

             showGameOverScreen(gameState);

             const scoreEl = document.getElementById('finalScoreDisplay');
             expect(scoreEl?.innerHTML).toBe('0');

             // Trigger first frame (init startTimestamp)
             const start = 1000;
             if(frameCallback) (frameCallback as any)(start);

             // Advance time to start animation (500ms later) -> Should trigger recursion
             if(frameCallback) (frameCallback as any)(start + 500);

             // Initial (1) + First Frame (2) + Second Frame (3)
             expect(rAF).toHaveBeenCalledTimes(3);
             expect(scoreEl?.innerHTML).not.toBe('0');

             // Advance to end
             if(frameCallback) (frameCallback as any)(start + 2000);

             expect(scoreEl?.innerHTML).toBe('1,000');
        });
    });
});
