// Mock dependencies
import { vi } from 'vitest';

vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    togglePause: vi.fn(),
    canvas: { width: 480, height: 800 }
}));

vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
}));

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

// Mock Audio to avoid issues
vi.mock('../src/audio', () => ({
    playSound: vi.fn(),
    audioManager: {
        powerUp: 'mock',
        nerf: 'mock'
    }
}));

import { describe, it, expect } from 'vitest';
import { checkCollisions } from '../src/collisions';
import { GameState, Entities, Army } from '../src/types';

describe('Collisions - Advanced', () => {

    it('should detect army vs enemy horde', () => {
        const army: Army = {
            soldiers: [{ isAlive: true, x: 100, y: 100, size: 10, hp: 10, type: 'normal' }],
            centerX: 100,
            centerY: 100,
            damage: 1,
            fireRate: 100
        } as any;

        // Horde uses Center X/Y based on source code interpretation
        // Horde X: 100, Width: 20 => Left: 90, Right: 110
        // Army X: 100, Center => Bounds ~ 90-110
        const enemy = { isAlive: true, x: 100, y: 100, size: 10, hp: 10 };
        const horde = { isActive: true, soldiers: [enemy], y: 100, x: 100, width: 20, height: 20, count: 1 };

        const entities: Entities = {
            playerArmy: army,
            coins: [],
            gates: [],
            enemyHordes: [horde],
            mysteryBoxes: [],
            miniBosses: [],
            boss: null,
            bullets: [],
            weapons: []
        } as any;
        const gameState: GameState = { score: 0, isBattling: false } as any;

        checkCollisions(entities, gameState);

        expect(gameState.isBattling).toBe(true);
    });

    it('should detect army vs boss', () => {
        const army: Army = {
            soldiers: [{ isAlive: true, x: 100, y: 100, size: 10, hp: 10, type: 'normal' }],
            centerX: 100,
            centerY: 100
        } as any;

        // Boss uses Top-Left X/Y based on source code interpretation
        const boss = {
            isActive: true,
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            hp: 100,
            type: 'beast'
        };
        // Boss Rect: 50-150. Army at 100 is inside.

        const entities: Entities = {
            playerArmy: army,
            coins: [],
            gates: [],
            enemyHordes: [],
            mysteryBoxes: [],
            miniBosses: [],
            boss: boss,
            bullets: [],
            weapons: []
        } as any;
        const gameState: GameState = { score: 0, isBattling: false } as any;

        checkCollisions(entities, gameState);

        expect(gameState.isBattling).toBe(true);
    });

    it('should detect army vs mini-boss', () => {
        const army: Army = {
            soldiers: [{ isAlive: true, x: 100, y: 100, size: 10, hp: 10, type: 'normal' }],
            centerX: 100,
            centerY: 100
        } as any;

        // MiniBoss uses Top-Left X/Y
        const miniBoss = {
            isActive: true,
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            hp: 100,
            type: 'normal'
        };

        const entities: Entities = {
            playerArmy: army,
            coins: [],
            gates: [],
            enemyHordes: [],
            mysteryBoxes: [],
            miniBosses: [miniBoss],
            boss: null,
            bullets: [],
            weapons: []
        } as any;
        const gameState: GameState = { score: 0, isBattling: false } as any;

        checkCollisions(entities, gameState);

        expect(gameState.isBattling).toBe(true);
    });

    it('should handle game over condition', () => {
        const army: Army = {
            soldiers: [],
            centerX: 100,
            centerY: 100
        } as any;

        const entities: Entities = {
            playerArmy: army,
            coins: [],
            gates: [],
            enemyHordes: [],
            mysteryBoxes: [],
            miniBosses: [],
            boss: null,
            bullets: [],
            weapons: []
        } as any;
        const gameState: GameState = { isGameOver: false } as any;

        checkCollisions(entities, gameState);

        expect(gameState.isGameOver).toBe(true);
    });
});
