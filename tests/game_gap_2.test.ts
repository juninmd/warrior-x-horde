
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState } from '../src/types';
import * as audio from '../src/audio';

// Mocks
vi.mock('../src/renderer', () => ({
    render: vi.fn(),
    addFloatingText: vi.fn(),
    updateFloatingTexts: vi.fn(),
    shareOnX: vi.fn(),
    shareOnWhatsApp: vi.fn(),
}));

vi.mock('../src/input', () => ({
    setupInput: vi.fn(),
    getMouseX: vi.fn(() => 240),
    initializeMousePosition: vi.fn(),
    setGameStateRef: vi.fn(),
    setInputScale: vi.fn(),
    vibrate: vi.fn(),
    triggerHaptic: vi.fn(),
}));

vi.mock('../src/audio', () => ({
    initAudio: vi.fn(),
    playMusic: vi.fn(),
    playSound: vi.fn(),
    stopAllMusic: vi.fn(),
    audioManager: { powerUp: 'up', nerf: 'nerf', victory: 'win', gameOver: 'loss', superCannon: 'boom' },
    toggleMute: vi.fn(),
    isMusicMuted: vi.fn(() => false),
}));

vi.mock('../src/shooting', () => ({
    updateShooting: vi.fn(),
    updateBullets: vi.fn(),
    updateSuperCannon: vi.fn(),
    activateSuperCannon: vi.fn(),
}));

vi.mock('../src/spawner', () => ({
    updateSpawns: vi.fn(),
}));

vi.mock('../src/collisions', () => ({
    checkCollisions: vi.fn(),
}));

vi.mock('../src/movement', () => ({
    updateMovement: vi.fn(),
}));

let shopCallback: any;
vi.mock('../src/ui-overlay', () => ({
    setupShopUI: vi.fn((cb) => { shopCallback = cb; }),
    updateShopUI: vi.fn(),
    setupSuperCannonUI: vi.fn(),
    updateSuperCannonUI: vi.fn(),
    setupGameOverUI: vi.fn(),
    showGameOverScreen: vi.fn(),
    startCountdown: vi.fn((cb) => cb()),
  updateStartScreenLeaderboard: vi.fn(), createPauseModal: vi.fn(),
  setupStartScreenInstallBtn: vi.fn(),
}));

describe('Game Gap Coverage 2', () => {
    let gameState: any;

    beforeEach(async () => {
        vi.resetModules();
        // Polyfill requestAnimationFrame for tests
        vi.stubGlobal('requestAnimationFrame', vi.fn());

        document.body.innerHTML = '<canvas id="gameCanvas"></canvas><div id="startScreen"></div>';

        // Load game
        await import('../src/game');
        const gameStateModule = await import('../src/gameState');
        gameState = gameStateModule.gameState;
        gameStateModule.resetGameState();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should handle "recharge_super" shop action when already ready', () => {
        // Setup state
        gameState.coins = 1000;
        gameState.superCannonReady = true;
        gameState.superCannonActive = false;
        gameState.superCannonLastUsed = 0; // cooldown not active

        expect(shopCallback).toBeDefined();

        // Attempt buy
        shopCallback('recharge_super', 200);

        // Should NOT deduct coins
        expect(gameState.coins).toBe(1000);
    });

    it('should update newRecordReached if score is higher', async () => {
        // Importing game.ts exposes `_testing.gameLoop`.
        const game = await import('../src/game');
        gameState.isStarted = true;
        gameState.isGameOver = false; // In-game check
        gameState.score = 200;
        gameState.highScore = 100;

        // Run one frame
        game._testing.gameLoop(100);

        expect(gameState.newRecordReached).toBe(true);
    });

    it('should handle leaderboard save error', async () => {
         const game = await import('../src/game');
         gameState.isStarted = true;
         gameState.isGameOver = true; // Trigger game over logic

         // Mock localStorage to throw ONLY for leaderboard
         // Use window.localStorage instead of Storage.prototype for JSDOM reliability
         const setItemSpy = vi.spyOn(window.localStorage, 'setItem').mockImplementation((key, value) => {
             if (key === 'crowdLeaderboard') {
                 throw new Error('QuotaExceeded');
             }
         });
         const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         // Run loop to hit game over block
         game._testing.gameLoop(100);

         // Should have caught error
         expect(consoleSpy).toHaveBeenCalledWith('Erro ao salvar leaderboard', expect.any(Error));

         setItemSpy.mockRestore();
         consoleSpy.mockRestore();
    });

    it('should unpause on canvas click if paused', async () => {
         const game = await import('../src/game');
         gameState.isStarted = true;
         gameState.isPaused = true;

         const canvas = document.getElementById('gameCanvas');
         canvas?.click();

         // Should toggle pause (start countdown -> effectively unpaused process initiated)
         // togglePause sets isPaused=false inside callback of countdown
         // But wait, togglePause implementation:
         /*
          if (gameState.isPaused) {
            startCountdown(() => { gameState.isPaused = false; ... });
          }
         */
         // And setupGameOverUI mock runs callback immediately: `startCountdown: vi.fn((cb) => cb())`

         expect(gameState.isPaused).toBe(false);
    });

    it('should request Wake Lock when visibility becomes visible', async () => {
         const game = await import('../src/game');
         gameState.isStarted = true;
         gameState.isPaused = false;

         // Mock navigator.wakeLock
         const requestMock = vi.fn().mockResolvedValue('lock');
         Object.defineProperty(navigator, 'wakeLock', {
             value: { request: requestMock },
             configurable: true
         });

         // Hidden -> Visible
         Object.defineProperty(document, 'hidden', { value: false, configurable: true });
         document.dispatchEvent(new Event('visibilitychange'));

         expect(requestMock).toHaveBeenCalled();
    });

    it('should capture beforeinstallprompt', () => {
         const event = new Event('beforeinstallprompt');
         Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

         window.dispatchEvent(event);

         expect(gameState.deferredInstallPrompt).toBe(event);
         expect((event as any).preventDefault).toHaveBeenCalled();
    });

    it('should decay visual timers and reset killstreak', async () => {
        const game = await import('../src/game');
        gameState.isStarted = true;
        gameState.isGameOver = false;

        gameState.damageFlash = 1.0;
        gameState.whiteFlash = 1.0;
        gameState.nukeTimer = 10;
        gameState.killStreakTimer = 1; // Low value to force reset

        game._testing.gameLoop(100); // delta will be at least 16ms

        expect(gameState.damageFlash).toBeLessThan(1.0);
        expect(gameState.whiteFlash).toBeLessThan(1.0);
        expect(gameState.nukeTimer).toBeLessThan(10);
        expect(gameState.killStreakTimer).toBeLessThan(1);
        // It likely went <= 0
        if (gameState.killStreakTimer <= 0) {
            expect(gameState.killStreak).toBe(0);
        }
    });

    it('should save high score on game over', async () => {
        const game = await import('../src/game');
        gameState.isStarted = true;
        gameState.isGameOver = true; // Trigger Game Over block
        gameState.score = 999999;
        gameState.highScore = 10;

        // Spy on saveGameProgress? No, just check state change
        // We need mocks from top of file to work.
        // localStorage mock logic is in `should handle leaderboard save error`.
        // We need normal localStorage behavior here.
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

        game._testing.gameLoop(100);

        expect(gameState.highScore).toBe(999999);
        setItemSpy.mockRestore();
    });
});
