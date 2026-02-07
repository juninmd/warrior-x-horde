import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('../src/renderer', () => ({
    render: vi.fn(), addFloatingText: vi.fn(), addParticle: vi.fn(), updateFloatingTexts: vi.fn(),
}));
vi.mock('../src/audio', () => ({
    initAudio: vi.fn(), playMusic: vi.fn(), playSound: vi.fn(), stopAllMusic: vi.fn(), isMusicMuted: vi.fn(), audioManager: {},
}));
vi.mock('../src/ui-overlay', () => ({
    setupShopUI: vi.fn(), setupSuperCannonUI: vi.fn(), updateSuperCannonUI: vi.fn(), updateShopUI: vi.fn(), setupGameOverUI: vi.fn(), showGameOverScreen: vi.fn(), startCountdown: vi.fn(), updateStartScreenLeaderboard: vi.fn(),
}));
vi.mock('../src/ui-settings', () => ({
    setupSettingsUI: vi.fn(), toggleSettingsMenu: vi.fn(),
}));
vi.mock('../src/input', () => ({
    setupInput: vi.fn(), initializeMousePosition: vi.fn(), setGameStateRef: vi.fn(), setInputScale: vi.fn(), triggerHaptic: vi.fn(), getMouseX: vi.fn(),
}));
vi.mock('../src/movement', () => ({ updateMovement: vi.fn() }));
vi.mock('../src/shooting', () => ({ updateShooting: vi.fn(), updateBullets: vi.fn(), updateSuperCannon: vi.fn(), activateSuperCannon: vi.fn() }));
vi.mock('../src/spawner', () => ({ updateSpawns: vi.fn() }));
vi.mock('../src/collisions', () => ({ checkCollisions: vi.fn() }));

describe('Security Fix - Production Mode', () => {
    beforeEach(() => {
        vi.resetModules();
        delete (window as any).debugSetLevel;
        delete (window as any).togglePause;
        delete (window as any).triggerScreenShake;
    });

    it('debugSetLevel should NOT be exposed in production', async () => {
        if (import.meta.env.DEV) {
            // In DEV mode, it SHOULD be exposed.
            await import('../src/game');
            expect((window as any).debugSetLevel).toBeDefined();
        } else {
            // In PROD mode, it should NOT be exposed.
            await import('../src/game');
            expect((window as any).debugSetLevel).toBeUndefined();
        }
    });

    it('triggerScreenShake should NOT be exposed in production', async () => {
        if (import.meta.env.DEV) {
             await import('../src/game');
             expect((window as any).triggerScreenShake).toBeDefined();
        } else {
             await import('../src/game');
             expect((window as any).triggerScreenShake).toBeUndefined();
        }
    });

    it('togglePause SHOULD be exposed in production', async () => {
        await import('../src/game');
        expect((window as any).togglePause).toBeDefined();
    });
});
