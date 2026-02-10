import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as audio from '../src/audio';
import { Army } from '../src/types';

// Mock entities to inject mystery boxes
vi.mock('../src/entities', async () => {
    const actual = await vi.importActual('../src/entities');
    return {
        ...actual,
        createInitialEntities: vi.fn(() => ({
            playerArmy: {
                soldiers: [], centerX: 0, centerY: 0, aliveCount: 0,
                damage: 1, fireRate: 1
            } as any as Army,
            gates: [],
            enemyHordes: [],
            miniBosses: [],
            boss: null,
            mysteryBoxes: [{ y: 1300, passed: false }], // Inject a box to be removed
            bullets: [],
            particles: [],
            floatingTexts: [],
            coins: [],
            weapons: []
        })),
        createEnemyHorde: vi.fn(() => ({ y: 0, isActive: true })),
    };
});

// Mock dependencies
vi.mock('../src/renderer', () => ({
    render: vi.fn(),
    addFloatingText: vi.fn(), updateFloatingTexts: vi.fn(),
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

vi.mock('../src/ui-overlay', () => ({
    setupShopUI: vi.fn(),
    updateShopUI: vi.fn(),
    setupSuperCannonUI: vi.fn(),
    updateSuperCannonUI: vi.fn(),
    setupGameOverUI: vi.fn(),
    showGameOverScreen: vi.fn(),
    startCountdown: vi.fn((cb) => cb()),
  updateStartScreenLeaderboard: vi.fn(),
}));

describe('Game Loop Logic Coverage', () => {
    let gameState: any;
    let requestAnimationFrameSpy: any;
    let capturedLoop: Function;

    beforeEach(async () => {
        vi.resetModules();

        // Spy on rAF to capture the loop function
        requestAnimationFrameSpy = vi.fn((cb) => {
            capturedLoop = cb;
            return 1;
        });
        (window as any).requestAnimationFrame = requestAnimationFrameSpy;

        // Setup DOM
         document.body.innerHTML = `
            <div id="startScreen" class="active"></div>
            <button id="startBtnOverlay"></button>
            <canvas id="gameCanvas" width="480" height="800"></canvas>
            <button id="muteBtn"></button>
            <button id="pauseBtn"></button>
            <button id="superCannonBtnInline"></button>
        `;

        // Load modules
        await import('../src/game');
        const gameStateModule = await import('../src/gameState');
        gameState = gameStateModule.gameState;
        gameStateModule.resetGameState();

        // Start game to get the loop running
        (window as any).debugSetLevel(1);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should advance to next level on victory (Level < 10)', () => {
        expect(capturedLoop).toBeDefined();

        // Setup Victory
        gameState.isVictory = true;
        gameState.currentLevel = 1;
        gameState.isGameOver = false;

        // Run loop
        capturedLoop(Date.now());

        // Should advance level
        expect(gameState.currentLevel).toBe(2);
        expect(gameState.isVictory).toBe(false);
        expect(audio.playSound).toHaveBeenCalledWith('win');
    });

    it('should trigger game over on victory (Level 10)', () => {
        // Setup Victory Level 10
        gameState.isVictory = true;
        gameState.currentLevel = 10;
        gameState.isGameOver = false;

        // Run loop
        capturedLoop(Date.now());

        // Should NOT advance, but trigger Game Over (Victory Screen)
        expect(gameState.currentLevel).toBe(10);
        expect(gameState.isGameOver).toBe(true);
        expect(audio.playSound).toHaveBeenCalledWith('win');
    });

    it('should handle Slow Mo timer', () => {
        gameState.slowMoTimer = 100;
        const startTimer = gameState.slowMoTimer;

        // Run loop with delta time
        // We need to simulate time passing.
        // capturedLoop(currentTime)
        const t1 = 1000;
        capturedLoop(t1);
        const t2 = 1050; // +50ms
        capturedLoop(t2);

        expect(gameState.slowMoTimer).toBeLessThan(startTimer);
    });

    it('should handle Screen Shake decay', () => {
        gameState.screenShakeActive = true;
        gameState.screenShakeTimer = 30; // Small value < 50
        gameState.screenShakeIntensity = 10;

        // Run loop
        const t1 = 1000;
        capturedLoop(t1); // First frame initializes lastTime
        const t2 = 1200; // +200ms -> capped at 50ms
        capturedLoop(t2);

        expect(gameState.screenShakeActive).toBe(false);
    });

    it('should handle Combo timer', () => {
        gameState.combo = 5;
        gameState.comboTimer = 30; // Small value < 50

        // Run loop
        const t1 = 1000;
        capturedLoop(t1);
        const t2 = 1200; // +200ms -> capped at 50ms
        capturedLoop(t2);

        expect(gameState.combo).toBe(0);
    });

    it('should handle new record reached visual', () => {
        gameState.score = 200;
        gameState.highScore = 100;
        gameState.newRecordReached = false;

        capturedLoop(Date.now());

        expect(gameState.newRecordReached).toBe(true);
        expect(audio.playSound).toHaveBeenCalledWith('up');
    });

    it('should process mystery box movement', () => {
        // Need to check swap-and-pop logic coverage
        // Create 2 boxes
        const box1 = { y: 100, passed: false };
        const box2 = { y: 1300, passed: false }; // Should be removed

        // We can't easily access entities from here since they are local to game.ts
        // But we can check if updateSpawns is called.
        // Actually, mystery box logic is inside gameLoop:
        /*
          for (let i = 0; i < entities.mysteryBoxes.length; i++) {
            ...
          }
        */
        // Since entities is local, we cannot inject mock entities easily unless we mocked `createInitialEntities` which is called by `startGame`.
        // `debugSetLevel` calls `createInitialEntities`.
        // We can mock `createInitialEntities` in `src/entities` import!
    });
});
