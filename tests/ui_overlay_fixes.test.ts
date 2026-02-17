import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateSuperCannonUI, showGameOverScreen, setupGameOverUI, setupSuperCannonUI } from '../src/ui-overlay';
import { GameState } from '../src/types';

// Mock dependencies
vi.mock('../src/input', () => ({
    vibrate: vi.fn()
}));

describe('UI Overlay Fixes', () => {
    let container: HTMLElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);

        // Setup mock elements
        document.body.innerHTML = '<div id="superCannonContainer"></div><div id="gameOverContainer"><div class="game-over-content"></div></div>';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    it('should hide super cannon button when game is not started', () => {
        // Setup UI first
        setupSuperCannonUI(() => {}, 10000);

        const gameState = {
            isStarted: false,
            isGameOver: false,
            superCannonLastUsed: 0,
            superCannonCooldown: 10000,
            superCannonActive: false,
            score: 0
        } as GameState;

        updateSuperCannonUI(gameState);

        const superBtnContainer = document.getElementById('superCannonContainer');
        // Because setupSuperCannonUI creates a new div if not found or uses existing?
        // Let's check implementation. setupSuperCannonUI creates a button inside the container.
        // updateSuperCannonUI hides the container.

        // We need to make sure the elements exist as updateSuperCannonUI expects
        // It relies on module-level variables shopContainer, superCannonContainer
        // which are set by setup functions.
        // So calling setupSuperCannonUI is correct.

        // However, since we are testing internal state of module variables we can't easily reset them
        // without a reset function or reloading module.
        // But since we are in JSDOM, let's hope the module state persists or we re-initialize.

        // Wait, the module level variables in ui-overlay.ts might be an issue if tests run in same context.
        // But Vitest usually isolates test files.

        // Let's verify the display style.
        // We need to inspect the element that updateSuperCannonUI touches.
        // It touches 'superCannonContainer'.

        // In the implementation:
        // if (!superCannonContainer || !buttons['superCannon']) return;
        // So we must have called setupSuperCannonUI.

        expect(document.querySelector('.super-cannon-container')?.getAttribute('style')).toContain('display: none');
    });

    it('should hide super cannon button when game is over', () => {
        setupSuperCannonUI(() => {}, 10000);

        const gameState = {
            isStarted: true,
            isGameOver: true,
            superCannonLastUsed: 0,
            superCannonCooldown: 10000,
            superCannonActive: false,
            score: 0
        } as GameState;

        updateSuperCannonUI(gameState);

        expect(document.querySelector('.super-cannon-container')?.getAttribute('style')).toContain('display: none');
    });

    it('should assign rank C for score between 500 and 999', () => {
        // Setup Game Over UI
        setupGameOverUI(() => {}, () => {});

        const gameState = {
            isVictory: false,
            score: 750, // Triggers Rank C
            highScore: 1000,
            maxCombo: 10,
            totalKills: 50,
            runStartTime: Date.now() - 10000,
            currentLevel: 1
        } as GameState;

        showGameOverScreen(gameState);

        const content = document.querySelector('.game-over-content');
        expect(content?.innerHTML).toContain('RANK');
        // We can check if the color for Rank C (#2ECC71) is present
        expect(content?.innerHTML).toContain('#2ECC71');
        // Or check specifically for the rank text if possible, but it's inside span
    });
});
