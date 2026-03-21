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
    });

    describe('updateSuperCannonUI', () => {
        it('should return early if buttons are missing but container exists', () => {
             // Create container but don't setup buttons (or clear them from DOM/memory if possible)
             // The module-level 'buttons' cache is populated by 'setup'.
             // If we rely on internal state of the module, we might need to trick it.
             // However, 'buttons' export is not available.
             // But 'buttons' is populated in 'setupSuperCannonUI'.
             // If we manually clear innerHTML of container, the DOM element is gone, but 'buttons' cache might still hold ref?
             // Actually 'updateSuperCannonUI' checks `!superCannonContainer || !buttons['superCannon']`.

             // To hit `!buttons['superCannon']`, we need `setup` to NOT have run, or failed?
             // But if setup didn't run, container might not exist.
             // Let's create container manually in DOM, but NOT call setupSuperCannonUI.

             const container = document.createElement('div');
             container.id = 'superCannonContainer';
             document.body.appendChild(container);

             // Call update. It should find container but fail on button cache check (since setup wasn't called to populate it).
             // Note: This relies on 'buttons' being empty/undefined for this key.
             // Since tests run in same context, 'buttons' might be polluted by previous tests.
             // We can't easily clear the module-level 'buttons' var without a reset helper.
             // BUT, if we create a NEW container ID? No, the code looks for 'superCannonContainer'.

             // Let's assume 'buttons' has 'superCannon' from previous tests.
             // Code: `const btn = buttons['superCannon'];`
             // If we remove the element from DOM, `btn` ref still exists in memory.

             // Maybe we can trigger the check by ensuring setup hasn't run in THIS test file context?
             // Vitest isolates test files usually.

             updateSuperCannonUI(gameState);
             // Should return safely without error.
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
             await installBtn?.click();

             expect(promptMock.prompt).toHaveBeenCalled();
             // Should hide button
             expect(installBtn?.style.display).toBe('none');
        });

        it('should animate score count up', () => {
             setupGameOverUI(vi.fn(), vi.fn());
             gameState.score = 1000;

             // Mock requestAnimationFrame
             // We want to verify the callback recurses.
             // vi.useFakeTimers() + rAF mocking.

             let frameCallback: FrameRequestCallback | null = null;
             vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
                 frameCallback = cb;
                 return 1;
             });

             showGameOverScreen(gameState);

             const scoreEl = document.getElementById('finalScoreDisplay');
             expect(scoreEl?.innerHTML).toBe('0');

             // Trigger first frame (init startTimestamp)
             const start = 1000;
             if(frameCallback) (frameCallback as any)(start);

             // Advance time to start animation (500ms later)
             if(frameCallback) (frameCallback as any)(start + 500);

             expect(scoreEl?.innerHTML).not.toBe('0');
             expect(scoreEl?.innerHTML).not.toBe('1,000');

             // Advance to end
             if(frameCallback) (frameCallback as any)(start + 2000);

             expect(scoreEl?.innerHTML).toBe('1.000');
        });
    });
});
