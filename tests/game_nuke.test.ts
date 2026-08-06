import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import * as audioModule from '../src/audio';
import { GameState } from '../src/types';

// Setup global mocks
beforeAll(() => {
    const canvasMock = {
        getContext: vi.fn(() => ({
            canvas: { width: 480, height: 800 },
            scale: vi.fn(),
            clearRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            fillRect: vi.fn(),
            fillText: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            roundRect: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            measureText: vi.fn(() => ({ width: 0 })),
            createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            drawImage: vi.fn(),
        })),
        width: 480,
        height: 800,
        style: {},
        addEventListener: vi.fn(),
        getBoundingClientRect: () => ({ left: 0, top: 0 })
    };

    const elements: any = {};
    document.getElementById = vi.fn((id: string) => {
        if (id === 'gameCanvas') return canvasMock as any;
        if (!elements[id]) {
            elements[id] = {
                addEventListener: vi.fn(),
                classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
                style: {},
                click: vi.fn(),
                textContent: '',
            };
        }
        return elements[id] as any;
    });

    global.requestAnimationFrame = vi.fn((cb) => 1) as any;
});

// Mock dependencies
vi.mock('../src/renderer', () => ({
    render: vi.fn(),
    preRenderSprites: vi.fn(),
    addFloatingText: vi.fn(),
    updateFloatingTexts: vi.fn(),
    shareOnX: vi.fn(),
    shareOnWhatsApp: vi.fn(),
}));

vi.mock('../src/audio', () => ({
    initAudio: vi.fn(),
    playMusic: vi.fn(),
    stopAllMusic: vi.fn(),
    playSound: vi.fn(),
    toggleMute: vi.fn(),
    isMusicMuted: vi.fn(),
    audioManager: {
        gameStart: 'gameStart',
        powerUp: 'powerUp',
        gameOver: 'gameOver',
        victory: 'victory',
        superCannon: 'superCannon'
    }
}));

vi.mock('../src/input', () => ({
    setupInput: vi.fn(),
    setInputScale: vi.fn(),
    setGameStateRef: vi.fn(),
    initializeMousePosition: vi.fn(),
    vibrate: vi.fn(),
    getMouseX: vi.fn().mockReturnValue(240),
}));

// We need to capture the buy callback
let capturedBuyCallback: any = null;

vi.mock('../src/ui-overlay', () => ({
    setupShopUI: vi.fn((cb) => { capturedBuyCallback = cb; }),
    updateShopUI: vi.fn(),
    setupSuperCannonUI: vi.fn(),
    updateSuperCannonUI: vi.fn(),
    setupGameOverUI: vi.fn(),
    showGameOverScreen: vi.fn(),
    startCountdown: vi.fn((cb) => cb()),
  updateStartScreenLeaderboard: vi.fn(), createPauseModal: vi.fn(),
}));

vi.mock('../src/shooting', () => ({
    updateShooting: vi.fn(),
    updateBullets: vi.fn(),
    updateSuperCannon: vi.fn(),
    activateSuperCannon: vi.fn(),
}));

vi.mock('../src/movement', () => ({
    updateMovement: vi.fn(),
}));

vi.mock('../src/spawner', () => ({
    updateSpawns: vi.fn(),
    resetSpawnerState: vi.fn(),
}));

vi.mock('../src/collisions', () => ({
    checkCollisions: vi.fn(),
}));

describe('Nuke Logic', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should handle NUKE purchase correctly', async () => {
        // Load game module to trigger setupShopUI and capture callback
        const gameModule = await import('../src/game');
        const { gameState } = await import('../src/gameState');
        const entitiesModule = await import('../src/entities');

        // Reset state
        gameState.coins = 10000;
        gameState.nukeTimer = 0;
        gameState.hitStop = 0;

        // Verify callback was captured
        expect(capturedBuyCallback).toBeDefined();

        // Setup Entities Mock via private access or indirect influence?
        // Game module creates entities internally. We can't easily access the internal 'entities' variable directly
        // unless exported. But 'game.ts' exports 'triggerScreenShake' etc.
        // Wait, 'entities' is module-scoped in 'game.ts'.
        // However, 'handleBuy' operates on that internal 'entities' variable.
        // To test side effects on 'entities', we rely on checking observable outcomes or mocks.

        // Since 'entities' is not exported, checking bullet clearing or boss damage directly is hard
        // without exposing 'entities' or mocking 'entities.ts' creators if 'game.ts' calls them.

        // Actually, 'createInitialEntities' is imported by 'game.ts'.
        // But 'game.ts' calls it and stores the result locally.

        // Strategy: Verify the Side Effects we CAN verify:
        // 1. gameState.nukeTimer set
        // 2. gameState.hitStop set
        // 3. playSound called
        // 4. coins deducted

        capturedBuyCallback('nuke', 500);

        expect(gameState.coins).toBe(9500);
        expect(gameState.nukeTimer).toBe(60);
        expect(gameState.hitStop).toBe(10);
        expect(audioModule.playSound).toHaveBeenCalledWith('superCannon');
    });
});
