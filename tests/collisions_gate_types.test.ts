
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

describe('Collisions Gate Types', () => {
    let gameState: GameState;
    let army: Army;
    let entities: Entities;

    beforeEach(() => {
        gameState = {
            score: 0,
            coins: 0,
            isGameOver: false,
            isVictory: false,
            isPaused: false,
            isBattling: false,
            currentLevel: 1,
            distanceTraveled: 0,
            levelDistance: 1000,
            baseGameSpeed: 2,
            gameSpeed: 2,
            isStarted: true
        } as GameState;

        army = {
            soldiers: [createSoldier(100, 100, '#000', 1)],
            centerX: 100,
            centerY: 100,
            targetX: 100,
            color: '#000',
            isPlayer: true,
            fireRate: 500,
            lastShotTime: 0,
            damage: 1,
            aliveCount: 1
        };

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

    it('should apply fire rate gate effect', () => {
        const gate: Gate = {
            id: 1,
            x: 50,
            y: 90,
            width: 100,
            height: 50,
            type: 'firerate',
            value: 0.8, // 20% faster
            color: '#F00',
            side: 'left',
            passed: false
        };
        entities.gates.push(gate);
        checkCollisions(entities, gameState);
        expect(gate.passed).toBe(true);
        expect(army.fireRate).toBe(400); // 500 * 0.8
    });

    it('should apply damage gate effect', () => {
        const gate: Gate = {
            id: 2,
            x: 50,
            y: 90,
            width: 100,
            height: 50,
            type: 'damage',
            value: 2, // 2x damage
            color: '#F00',
            side: 'left',
            passed: false
        };
        entities.gates.push(gate);
        checkCollisions(entities, gameState);
        expect(gate.passed).toBe(true);
        expect(army.damage).toBe(2);
    });

    it('should apply super warrior gate effect', () => {
        const gate: Gate = {
            id: 3,
            x: 50,
            y: 90,
            width: 100,
            height: 50,
            type: 'superwarrior',
            value: 2, // 2 supers
            color: '#F00',
            side: 'left',
            passed: false
        };
        entities.gates.push(gate);
        checkCollisions(entities, gameState);
        expect(gate.passed).toBe(true);
        expect(army.soldiers.length).toBe(3);
        const supers = army.soldiers.filter(s => s.isSuper);
        expect(supers.length).toBe(2);
    });

    it('should apply divide gate effect', () => {
        // Need more soldiers to divide
        army.soldiers.push(createSoldier(100, 100, '#000', 1));
        army.soldiers.push(createSoldier(100, 100, '#000', 1));
        army.soldiers.push(createSoldier(100, 100, '#000', 1));
        army.aliveCount = 4;

        const gate: Gate = {
            id: 4,
            x: 50,
            y: 90,
            width: 100,
            height: 50,
            type: 'divide',
            value: 2, // Divide by 2
            color: '#F00',
            side: 'left',
            passed: false
        };
        entities.gates.push(gate);
        checkCollisions(entities, gameState);
        expect(gate.passed).toBe(true);
        // 4 / 2 = 2 removed. Remaining = 2.
        const alive = army.soldiers.filter(s => s.isAlive).length;
        expect(alive).toBe(2);
    });
});
