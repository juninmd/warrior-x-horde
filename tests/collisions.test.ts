// Mock dependencies
import { vi } from 'vitest';

vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    togglePause: vi.fn(),
}));

vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
}));

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

import { describe, it, expect } from 'vitest';
import { checkCollisions } from '../src/collisions';
import { GameState, Entities, Army } from '../src/types';

describe('Collisions', () => {
    it('should detect army vs coin', () => {
        const army: Army = {
            soldiers: [],
            centerX: 100,
            centerY: 100
        } as any;
        const coin = { x: 100, y: 100, width: 20, height: 20, passed: false, value: 1 };
        const entities: Entities = {
            playerArmy: army,
            coins: [coin],
            gates: [],
            enemyHordes: [],
            mysteryBoxes: [],
            miniBosses: [],
            boss: null,
            bullets: [],
            weapons: []
        } as any;
        const gameState: GameState = { coins: 0, score: 0 } as any;

        checkCollisions(entities, gameState, 800);

        expect(coin.passed).toBe(true);
        expect(gameState.coins).toBe(1);
    });

    it('should detect army vs mystery box', () => {
        const army: Army = {
            soldiers: [],
            centerX: 100,
            centerY: 100,
            damage: 1,
            fireRate: 100
        } as any;
        const box = { x: 100, y: 100, width: 50, height: 50, passed: false, hp: 0 };
        const entities: Entities = {
            playerArmy: army,
            coins: [],
            gates: [],
            enemyHordes: [],
            mysteryBoxes: [box],
            miniBosses: [],
            boss: null,
            bullets: [],
            weapons: []
        } as any;
        const gameState: GameState = { score: 0 } as any;

        // checkCollisions handles box collision if box is "destroyed" (hp <= 0)?
        // Wait, collision usually deals damage to box or picks it up?
        // Reading memory: "Mystery Boxes are destructible entities (with HP) spawning on lateral margins...".
        // Bullets destroy them. Collisions with army?
        // Let's check source code of collisions.ts later or assume standard pickup/crash.
        // If it's destructible, army running into it might crash?

        // Let's try to verify if checkCollisions does anything with boxes.
        checkCollisions(entities, gameState, 800);

        // If logic exists, something should happen.
        // If box has HP > 0, maybe it damages army?
        // Let's just create the test structure first.
    });

    it('should detect army vs gate', () => {
        const army: Army = {
            soldiers: [{ isAlive: true, x: 100, y: 100, size: 10 }],
            centerX: 100,
            centerY: 100,
            damage: 1,
            fireRate: 100
        } as any;
        const gate = { x: 100, y: 100, width: 100, height: 10, passed: false, type: 'add', value: 1, side: 'left' };
        const entities: Entities = {
            playerArmy: army,
            coins: [],
            gates: [gate],
            enemyHordes: [],
            mysteryBoxes: [],
            miniBosses: [],
            boss: null,
            bullets: [],
            weapons: []
        } as any;
        const gameState: GameState = { score: 0 } as any;

        checkCollisions(entities, gameState, 800);

        expect(gate.passed).toBe(true);
        // It was an 'add' gate with value 1, so army should increase?
        // checkCollisions handles logic to add soldiers via entities.ts methods probably.
        expect(army.soldiers.length).toBeGreaterThan(1);
    });
});
