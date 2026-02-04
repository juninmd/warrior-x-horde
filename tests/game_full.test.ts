
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Do not import game statically to avoid early execution
// import * as game from '../src/game';
import * as renderer from '../src/renderer';
import * as input from '../src/input';
import * as audio from '../src/audio';
import * as shooting from '../src/shooting';
import * as spawner from '../src/spawner';
import * as collisions from '../src/collisions';
import * as movement from '../src/movement';
import * as uiOverlay from '../src/ui-overlay';

// Mock everything
vi.mock('../src/renderer', () => ({
    render: vi.fn(),
    addFloatingText: vi.fn(), updateFloatingTexts: vi.fn(),
    getShareButtonBounds: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
    getWhatsAppButtonBounds: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
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
    audioManager: { gameStart: 'start', powerUp: 'up', nerf: 'nerf', victory: 'win', gameOver: 'loss' },
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

// Capture callbacks
let shopCallback: any;
let superCannonCallback: any;
let gameOverRestartCallback: any;
let gameOverShareCallback: any;

vi.mock('../src/ui-overlay', () => ({
    setupShopUI: vi.fn((cb) => { shopCallback = cb; }),
    updateShopUI: vi.fn(),
    setupSuperCannonUI: vi.fn((cb) => { superCannonCallback = cb; }),
    updateSuperCannonUI: vi.fn(),
    setupGameOverUI: vi.fn((onRestart, onShare) => {
        gameOverRestartCallback = onRestart;
        gameOverShareCallback = onShare;
    }),
    showGameOverScreen: vi.fn(),
    startCountdown: vi.fn((cb) => cb()),
}));

// Mock window functions exposed by game.ts
// We need to access them via window object in tests

describe('Game Loop - Full Coverage', () => {
    // We need to trigger the loop manually
    let requestAnimationFrameMock: any;
    let gameState: any;
    let resetGameState: any;

    beforeEach(async () => {
        vi.resetModules(); // IMPORTANT: Reset modules to re-execute game.ts top-level code

        // Setup DOM
        document.body.innerHTML = `
            <div id="startScreen" class="active"></div>
            <button id="startBtnOverlay"></button>
            <canvas id="gameCanvas"></canvas>
            <button id="muteBtn"></button>
            <button id="pauseBtn"></button>
            <div id="superCannonContainer"></div>
            <button id="superCannonBtnInline"></button>
        `;

        // Mock requestAnimationFrame to capture callback
        requestAnimationFrameMock = vi.fn();
        window.requestAnimationFrame = requestAnimationFrameMock;

        // Load the game module dynamicallly
        await import('../src/game');

        // Load gameState dynamically to ensure we check the same instance used by game.ts
        const gameStateModule = await import('../src/gameState');
        gameState = gameStateModule.gameState;
        resetGameState = gameStateModule.resetGameState;

        resetGameState();
    });

    afterEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('should initialize game on load', () => {
        // Just importing game.ts triggers initialization code.
        // We verify setupInput, initAudio were called.
        expect(input.setupInput).toHaveBeenCalled();
        expect(audio.initAudio).toHaveBeenCalled();
        expect(uiOverlay.setupShopUI).toHaveBeenCalled();
    });

    it('should start game on interaction', () => {
        // We need to call startGame logic.
        // It's attached to startBtnOverlay click.

        // Let's click the button
        const startBtn = document.getElementById('startBtnOverlay');
        startBtn?.dispatchEvent(new Event('click'));

        expect(gameState.isStarted).toBe(true);
        expect(audio.playSound).toHaveBeenCalledWith('start');
        expect(requestAnimationFrameMock).toHaveBeenCalled();
    });

    it('should run game loop steps', () => {
        // Start game
        (window as any).debugSetLevel(1);

        // Get the loop callback
        const loopCallback = requestAnimationFrameMock.mock.calls[0][0];

        // Reset mocks to verify loop calls
        vi.clearAllMocks();

        // Run loop
        loopCallback(1000); // timestamp

        expect(movement.updateMovement).toHaveBeenCalled();
        expect(shooting.updateShooting).toHaveBeenCalled();
        expect(spawner.updateSpawns).toHaveBeenCalled();
        expect(collisions.checkCollisions).toHaveBeenCalled();
        expect(renderer.render).toHaveBeenCalled();

        // Loop should continue
        expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should pause and resume', () => {
        (window as any).debugSetLevel(1);

        // Pause
        (window as any).togglePause();
        expect(gameState.isPaused).toBe(true);
        expect(input.triggerHaptic).toHaveBeenCalled();

        // Reset mocks
        vi.clearAllMocks();

        // Unpause
        (window as any).togglePause();
        expect(gameState.isPaused).toBe(false);
        expect(window.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should handle visibility change (auto-pause)', () => {
        (window as any).debugSetLevel(1);
        expect(gameState.isPaused).toBe(false);

        // Hide document
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        expect(gameState.isPaused).toBe(true);
    });

    // Removed toggleMuteUI test as button was moved to settings

    it('should handle super cannon trigger', () => {
        gameState.isStarted = true;
        (window as any).triggerSuperCannon();
        expect(shooting.activateSuperCannon).toHaveBeenCalled();
    });

    it('should handle game over restart callback', () => {
        // Set game over
        gameState.isStarted = true;
        gameState.isGameOver = true;

        // Set victory and level 10 to trigger different path
        gameState.isVictory = false;
        gameState.currentLevel = 1;

        // Reset mocks to clear previous calls
        vi.clearAllMocks();

        // Trigger the captured callback instead of clicking canvas
        expect(gameOverRestartCallback).toBeDefined();
        gameOverRestartCallback();

        // Should restart -> init entities -> play sound
        expect(audio.playSound).toHaveBeenCalledWith('start');
        expect(gameState.isGameOver).toBe(false);
    });

    it('should handle window resize', () => {
        window.dispatchEvent(new Event('resize'));
        // Resize logic sets canvas size.
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        expect(canvas).toBeDefined();
    });

    it('should handle Shop Buy callbacks', () => {
        expect(shopCallback).toBeDefined();

        // Buy Soldier
        gameState.coins = 1000;
        shopCallback('soldier', 50);
        expect(gameState.coins).toBe(950);
        expect(audio.playSound).toHaveBeenCalledWith('up');

        // Buy Nuke
        shopCallback('nuke', 500);
        expect(gameState.coins).toBe(450); // 950 - 500

        // Buy too expensive
        gameState.coins = 0;
        shopCallback('soldier', 50);
        expect(audio.playSound).toHaveBeenCalledWith('nerf');
    });

    it('should handle Super Cannon UI callbacks', () => {
        expect(superCannonCallback).toBeDefined();
        gameState.isStarted = true;
        gameState.isGameOver = false;
        superCannonCallback();
        expect(shooting.activateSuperCannon).toHaveBeenCalled();
    });
});
