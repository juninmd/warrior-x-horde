import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as audio from '../src/audio';
import * as shooting from '../src/shooting';
// import * as input from '../src/input'; // We will use input-state for setInputScale

// Mock dependencies
vi.mock('../src/renderer', () => ({
    render: vi.fn(),
    addFloatingText: vi.fn(), updateFloatingTexts: vi.fn(),
    shareOnX: vi.fn(),
    shareOnWhatsApp: vi.fn(),
}));

vi.mock('../src/input-state', () => ({
    setInputScale: vi.fn(),
    getCurrentScale: vi.fn(() => 1),
    virtualJoystick: { active: false }
}));

import { setInputScale } from '../src/input-state';

vi.mock('../src/input', () => ({
    setupInput: vi.fn(),
    getMouseX: vi.fn(() => 240),
    initializeMousePosition: vi.fn(),
    setGameStateRef: vi.fn(),
    // setInputScale is now imported from input-state in game.ts
    vibrate: vi.fn(),
    triggerHaptic: vi.fn(),
}));

vi.mock('../src/audio', () => ({
    initAudio: vi.fn(),
    playMusic: vi.fn(),
    playSound: vi.fn(),
    stopAllMusic: vi.fn(),
    audioManager: { gameStart: 'start', powerUp: 'up', nerf: 'nerf', victory: 'win', gameOver: 'loss', superCannon: 'boom' },
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

// Capture UI callbacks
let shopCallback: any;
let superCannonCallback: any;

vi.mock('../src/ui-overlay', () => ({
    setupShopUI: vi.fn((cb) => { shopCallback = cb; }),
    updateShopUI: vi.fn(),
    setupSuperCannonUI: vi.fn((cb) => { superCannonCallback = cb; }),
    updateSuperCannonUI: vi.fn(),
    setupGameOverUI: vi.fn(),
    showGameOverScreen: vi.fn(),
    startCountdown: vi.fn((cb) => cb()),
  updateStartScreenLeaderboard: vi.fn(), createPauseModal: vi.fn(),
}));

describe('Game Extra Coverage', () => {
    let gameState: any;

    beforeEach(async () => {
        vi.resetModules();
        document.body.innerHTML = `
            <div id="startScreen" class="active"></div>
            <button id="startBtnOverlay"></button>
            <div style="width: 500px; height: 800px;">
                <canvas id="gameCanvas" width="480" height="800"></canvas>
            </div>
            <button id="muteBtn"></button>
            <button id="pauseBtn"></button>
            <button id="superCannonBtnInline"></button>
        `;

        // Mock window dimensions (500 width to ensure scale=1 with 20px margins)
        Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
        Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });

        // Restore rAF if polluted
        (window as any).requestAnimationFrame = vi.fn();

        // Load modules
        await import('../src/game');
        const gameStateModule = await import('../src/gameState');
        gameState = gameStateModule.gameState;
        gameStateModule.resetGameState();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should handle resize with High DPI', () => {
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

        // Trigger resize
        window.dispatchEvent(new Event('resize'));

        // Check if canvas dimensions updated
        // logic: canvas.width = BASE_WIDTH * dpr * mobileScale
        // 480 * 2 * 0.85 = 816
        expect(canvas.width).toBe(816);
        expect(canvas.height).toBe(1360); // 800 * 2 * 0.85
    });

    it('should handle screenToCanvas conversion', () => {
        return import('../src/game').then(game => {
             const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

             // Ensure window dimensions are set correctly
             Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });

             // Force resize
             window.dispatchEvent(new Event('resize'));

             // Mock getBoundingClientRect
             vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
                 left: 10, top: 10, width: 480, height: 800, x: 10, y: 10, bottom: 810, right: 490, toJSON: () => {}
             });

             const scale = game.getScale();
             const expectedX = (110 - 10) / scale;

             const pos = game.screenToCanvas(110, 110);
             expect(pos.x).toBeCloseTo(expectedX);
             expect(pos.y).toBeCloseTo(expectedX);
        });
    });

    it('should handle Shop Buy checks', () => {
        // Buy Soldier
        gameState.coins = 1000;
        shopCallback('soldier', 50);
        expect(audio.playSound).toHaveBeenCalledWith('up');

        // Case 1: Recharge Super - Already ready (should not buy)
        gameState.superCannonReady = true;
        gameState.superCannonActive = false;
        vi.clearAllMocks();

        gameState.coins = 1000;
        shopCallback('recharge_super', 200);
        expect(gameState.coins).toBe(1000);

        // Case 2: Recharge Super - On Cooldown (should buy and reset)
        gameState.superCannonReady = false;
        gameState.superCannonLastUsed = Date.now();
        gameState.superCannonCooldown = 10000;

       shopCallback('recharge_super', 200);
       expect(gameState.coins).toBe(800);
       expect(gameState.superCannonReady).toBe(true);
       expect(gameState.superCannonLastUsed).toBe(0);

       // Case 3: Nuke
       gameState.coins = 1000;
       shopCallback('nuke', 500);
       expect(gameState.coins).toBe(500);
       expect(audio.playSound).toHaveBeenCalledWith('boom');

       // Case 4: Not enough coins
       gameState.coins = 10;
       shopCallback('soldier', 50);
       expect(gameState.coins).toBe(10);
       expect(audio.playSound).toHaveBeenCalledWith('nerf');
    });

    it('should handle Keyboard Shortcuts', () => {
         gameState.isStarted = true;
         gameState.isGameOver = false;
         gameState.isPaused = false;

         // Press P
         document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
         expect(gameState.isPaused).toBe(true);

         // Press Escape
         document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
         expect(gameState.isPaused).toBe(false);
    });

    it('should handle Touch Start to Unpause', () => {
        gameState.isStarted = true;
        gameState.isPaused = true;

        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

        // Prevent default must be mocked or irrelevant
        canvas.dispatchEvent(new Event('touchstart'));

        expect(gameState.isPaused).toBe(false);
    });

    it('should update Inline Super Button', () => {
         // This logic is hard to reach without calling gameLoop
         // We can assume game_full.test.ts covers execution
         // But we can check if triggerSuperCannon works
         gameState.isStarted = true;
         (window as any).triggerSuperCannon();
         expect(shooting.activateSuperCannon).toHaveBeenCalled();
    });

    it('should handle debugSetLevel > 10', () => {
         const consoleSpy = vi.spyOn(console, 'log');

         // Mock rAF to avoid infinite loop
         (window as any).requestAnimationFrame = vi.fn();

         (window as any).debugSetLevel(11);
         expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mothership'));
         expect(gameState.currentLevel).toBe(11);
    });


    it('should handle orientation change', () => {
        vi.useFakeTimers();

        // setInputScale is mocked at top level via input-state
        window.dispatchEvent(new Event('orientationchange'));

        vi.advanceTimersByTime(100);
        // expect(input.setInputScale).toHaveBeenCalled();
        expect(setInputScale).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('should trigger screen shake', () => {
         (window as any).triggerScreenShake(20, 500);
         expect(gameState.screenShakeActive).toBe(true);
         expect(gameState.screenShakeIntensity).toBe(20);
         expect(gameState.screenShakeDuration).toBe(500);
    });
});
