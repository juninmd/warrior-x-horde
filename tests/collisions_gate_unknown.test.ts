
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import { createSoldier } from '../src/entities';
import { GameState, Entities, Army, Gate } from '../src/types';

// Mock dependencies
vi.mock('../src/audio');
vi.mock('../src/renderer');
vi.mock('../src/input');
vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
}));

describe('Collisions Unknown Gate', () => {
    let gameState: GameState;
    let army: Army;
    let entities: Entities;

    beforeEach(() => {
        gameState = {
            currentLevel: 1,
            score: 0,
            isStarted: true
        } as GameState;

        army = {
            soldiers: [createSoldier(100, 100, '#000', 1)],
            centerX: 100,
            centerY: 100,
            targetX: 100,
            color: '#000',
            isPlayer: true,
            aliveCount: 1
        } as Army;

        entities = {
            playerArmy: army,
            enemyHordes: [],
            gates: [],
            miniBosses: [],
            mysteryBoxes: [],
            coins: [],
            bullets: [],
            boss: null,
            weapons: []
        };
    });

    it('should ignore unknown gate type', () => {
        const gate: Gate = {
            id: 1,
            x: 50,
            y: 90,
            width: 100,
            height: 50,
            // @ts-ignore
            type: 'unknown_type',
            value: 1,
            color: '#F00',
            side: 'left',
            passed: false
        };
        entities.gates.push(gate);

        // Should not crash
        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true); // Logic sets passed=true at end
        expect(army.soldiers.length).toBe(1); // No effect
    });
});
