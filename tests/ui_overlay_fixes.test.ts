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
        // Setup UI first to initialize module variables
        setupSuperCannonUI(() => {});

        const gameState = {
            isStarted: false,
            isGameOver: false,
            superCannonLastUsed: 0,
            superCannonCooldown: 10000,
            superCannonActive: false,
            score: 0
        } as GameState;

        updateSuperCannonUI(gameState);

        const superContainer = document.getElementById('superCannonContainer');
        expect(superContainer?.style.display).toBe('none');
    });

    it('should hide super cannon button when game is over', () => {
        setupSuperCannonUI(() => {});

        const gameState = {
            isStarted: true,
            isGameOver: true,
            superCannonLastUsed: 0,
            superCannonCooldown: 10000,
            superCannonActive: false,
            score: 0
        } as GameState;

        updateSuperCannonUI(gameState);

        const superContainer = document.getElementById('superCannonContainer');
        expect(superContainer?.style.display).toBe('none');
    });

    it('should assign rank C for score between 500 and 999', () => {
        // Setup Game Over UI to initialize module variables
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
        // Check for Rank C color (#2ECC71) in the innerHTML
        // The implementation uses: rankColor = '#2ECC71'
        expect(content?.innerHTML).toContain('#2ECC71');

        // Also check that it rendered correctly
        expect(content?.innerHTML).toContain('RANK');
    });
});
