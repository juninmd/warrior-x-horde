import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as audioModule from '../src/audio';

// Setup global mocks for DOM interaction inside game.ts
beforeAll(() => {
    // Create a mock canvas
    const canvasMock = {
        getContext: vi.fn(() => ({
            canvas: { width: 480, height: 800 },
            scale: vi.fn(),
            clearRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            fillRect: vi.fn(),
            fillText: vi.fn(), // Added fillText
            strokeRect: vi.fn(), // Added strokeRect if needed
        })),
        width: 480,
        height: 800,
        style: {},
        addEventListener: vi.fn(),
        getBoundingClientRect: () => ({ left: 0, top: 0 })
    };

    // Override getElementById
    document.getElementById = vi.fn((id: string) => {
        if (id === 'gameCanvas') return canvasMock as any;
        return {
            addEventListener: vi.fn(),
            classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
            style: {},
            click: vi.fn(),
            textContent: '', // Added textContent for muteBtn
        } as any;
    });

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16) as any);
});

vi.mock('../src/renderer', () => ({
    render: vi.fn(),
    preRenderSprites: vi.fn(),
    getShareButtonBounds: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
    getWhatsAppButtonBounds: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
    addFloatingText: vi.fn(),
}));

vi.mock('../src/audio', () => ({
    initAudio: vi.fn(),
    playMusic: vi.fn(),
    stopAllMusic: vi.fn(),
    playSound: vi.fn(),
    toggleMute: vi.fn().mockReturnValue(true),
    isMusicMuted: vi.fn().mockReturnValue(false),
    audioManager: {
        gameStart: 'gameStart',
        powerUp: 'powerUp',
        gameOver: 'gameOver',
        victory: 'victory'
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

vi.mock('../src/ui-overlay', () => ({
    setupShopUI: vi.fn(),
    updateShopUI: vi.fn(),
    setupSuperCannonUI: vi.fn(),
    updateSuperCannonUI: vi.fn(),
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
}));

vi.mock('../src/collisions', () => ({
    checkCollisions: vi.fn(),
}));

describe('Game', () => {
    it('should toggle pause', async () => {
        // Dynamic import to avoid hoisting issues and ensure DOM is ready
        const gameModule = await import('../src/game');
        const { togglePause } = gameModule;
        const { gameState } = await import('../src/gameState');

        // Ensure we are started but not game over
        gameState.isStarted = true;
        gameState.isGameOver = false;
        gameState.isPaused = false;

        expect(togglePause).toBeDefined();

        togglePause();
        expect(gameState.isPaused).toBe(true);

        togglePause();
        expect(gameState.isPaused).toBe(false);
    });

    it('should start game', async () => {
        const gameModule = await import('../src/game');
        const { startGame } = gameModule;
        const { gameState } = await import('../src/gameState');

        expect(startGame).toBeDefined();

        gameState.isStarted = false;
        startGame();

        expect(gameState.isStarted).toBe(true);
        expect(audioModule.playSound).toHaveBeenCalledWith('gameStart');
    });

    it('should toggle mute UI', async () => {
        const gameModule = await import('../src/game');
        const { toggleMuteUI } = gameModule;

        expect(toggleMuteUI).toBeDefined();

        toggleMuteUI();
        expect(audioModule.toggleMute).toHaveBeenCalled();
    });

    it('should export debugSetLevel', async () => {
        const gameModule = await import('../src/game');
        expect(gameModule.debugSetLevel).toBeDefined();
    });

    it('should export triggerSuperCannon', async () => {
        const gameModule = await import('../src/game');
        expect(gameModule.triggerSuperCannon).toBeDefined();
    });
});
