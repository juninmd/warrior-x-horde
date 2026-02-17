import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupSuperCannonUI, showGameOverScreen, setupGameOverUI, updateSuperCannonUI, updateShopUI, setupShopUI, _testing } from '../src/ui-overlay';
import { GameState } from '../src/types';

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

describe('UI Overlay Final Coverage', () => {
    let gameState: GameState;

    beforeEach(() => {
        // Clear DOM
        document.body.innerHTML = '';
        _testing.resetContainers(); // Ensure clean state
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
            runStartTime: Date.now() - 10000,
            deferredInstallPrompt: null
        } as any;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should create super cannon container if it does not exist', () => {
        // Container is null due to resetContainers in beforeEach
        setupSuperCannonUI(vi.fn());

        const created = document.getElementById('superCannonContainer');
        expect(created).toBeDefined();
        expect(created?.id).toBe('superCannonContainer');
    });

    it('should return early in showGameOverScreen if content is missing', () => {
        setupGameOverUI(vi.fn(), vi.fn());
        const container = document.getElementById('gameOverContainer');
        if (container) {
            const content = container.querySelector('.game-over-content');
            content?.remove();
        }
        showGameOverScreen(gameState);
    });

    it('should hide super cannon UI when game is not started', () => {
        setupSuperCannonUI(vi.fn());
        gameState.isStarted = false;
        updateSuperCannonUI(gameState);
        const container = document.getElementById('superCannonContainer');
        expect(container?.style.display).toBe('none');
    });

    it('should assign Rank C (score >= 500)', () => {
        setupGameOverUI(vi.fn(), vi.fn());
        gameState.score = 600;
        showGameOverScreen(gameState);
        const content = document.querySelector('.game-over-content');
        expect(content?.innerHTML).toContain('C');
    });

    it('should assign Rank B (score >= 1000)', () => {
        setupGameOverUI(vi.fn(), vi.fn());
        gameState.score = 1500;
        showGameOverScreen(gameState);
        const content = document.querySelector('.game-over-content');
        expect(content?.innerHTML).toContain('B');
    });

    it('should assign Rank A (score >= 3000)', () => {
        setupGameOverUI(vi.fn(), vi.fn());
        gameState.score = 3500;
        showGameOverScreen(gameState);
        const content = document.querySelector('.game-over-content');
        expect(content?.innerHTML).toContain('A');
    });

    it('should assign Rank S (score >= 5000)', () => {
        setupGameOverUI(vi.fn(), vi.fn());
        gameState.score = 6000;
        showGameOverScreen(gameState);
        const content = document.querySelector('.game-over-content');
        expect(content?.innerHTML).toContain('S');
    });

    it('should handle updateShopUI when container is missing', () => {
        // Container is null due to resetContainers
        updateShopUI(gameState);
    });

    it('should handle showGameOverScreen when container is missing', () => {
        // Container is null due to resetContainers
        showGameOverScreen(gameState);
    });

    it('should handle showGameOverScreen when callbacks are missing', () => {
        setupGameOverUI(vi.fn(), vi.fn());
        const container = document.getElementById('gameOverContainer') as any;
        delete container._onRestart;
        delete container._onShare;
        showGameOverScreen(gameState);
    });

    it('should handle showGameOverScreen when only onShare is missing (partial callback check)', () => {
        setupGameOverUI(vi.fn(), vi.fn());
        const container = document.getElementById('gameOverContainer') as any;
        delete container._onShare;
        showGameOverScreen(gameState);
    });

    it('should handle install button click in game over screen', async () => {
        const promptEvent = {
            prompt: vi.fn(),
            userChoice: Promise.resolve({ outcome: 'accepted' })
        };
        gameState.deferredInstallPrompt = promptEvent as any;

        setupGameOverUI(vi.fn(), vi.fn());
        showGameOverScreen(gameState);

        const installBtn = document.getElementById('goInstallBtn');
        expect(installBtn).not.toBeNull();

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await installBtn?.click();

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(promptEvent.prompt).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('User response to install prompt'));
        expect(gameState.deferredInstallPrompt).toBeNull();
    });

    it('should handle install button click when deferredPrompt becomes null', async () => {
         const promptEvent = {
            prompt: vi.fn(),
            userChoice: Promise.resolve({ outcome: 'accepted' })
        };
        gameState.deferredInstallPrompt = promptEvent as any;

        setupGameOverUI(vi.fn(), vi.fn());
        showGameOverScreen(gameState);

        const installBtn = document.getElementById('goInstallBtn');

        // Nullify BEFORE click
        gameState.deferredInstallPrompt = null;

        await installBtn?.click();

        // Should return early, prompt not called
        expect(promptEvent.prompt).not.toHaveBeenCalled();
    });

    it('should animate score in showGameOverScreen', () => {
        let frameCallback: FrameRequestCallback | null = null;
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            frameCallback = cb;
            return 1;
        });

        setupGameOverUI(vi.fn(), vi.fn());
        gameState.score = 1500;
        showGameOverScreen(gameState);

        const scoreDisplay = document.getElementById('finalScoreDisplay');

        expect(frameCallback).not.toBeNull();
        if (frameCallback) frameCallback(1000);
        if (frameCallback) frameCallback(1750);
        if (frameCallback) frameCallback(3000);

        expect(scoreDisplay?.innerHTML).toBe('1,500');
    });

    it('should handle shop button pointerdown', () => {
        setupShopUI(vi.fn());
        const shopContainer = document.getElementById('shopContainer');
        const btn = shopContainer?.querySelector('button');
        expect(btn).toBeDefined();
        btn?.dispatchEvent(new Event('pointerdown'));
    });

    it('should handle whatsapp share click', () => {
        const onShare = vi.fn();
        setupGameOverUI(vi.fn(), onShare);
        showGameOverScreen(gameState);

        const waBtn = document.getElementById('goShareWa');
        waBtn?.click();

        expect(onShare).toHaveBeenCalledWith('whatsapp');
    });

    it('should treat victory with low level as regular game over', () => {
        gameState.isVictory = true;
        gameState.currentLevel = 5; // Less than 10

        setupGameOverUI(vi.fn(), vi.fn());
        showGameOverScreen(gameState);

        const content = document.querySelector('.game-over-content');
        expect(content?.innerHTML).toContain('GAME OVER');
        expect(content?.innerHTML).not.toContain('VITÓRIA');
    });

    it('should handle missing finalScoreDisplay element', () => {
        setupGameOverUI(vi.fn(), vi.fn());

        const originalGet = document.getElementById.bind(document);
        vi.spyOn(document, 'getElementById').mockImplementation((id) => {
            if (id === 'finalScoreDisplay') return null;
            return originalGet(id);
        });

        // Should run without error and skip animation logic
        showGameOverScreen(gameState);
    });
});
