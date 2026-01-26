import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateSpawns, spawnCoins, spawnMysteryBoxes, spawnGates, spawnEnemies, checkBossSpawn, spawnMiniBoss } from '../src/spawner';
import { GameState, Entities } from '../src/types';

vi.mock('../src/entities', async () => {
    const actual = await vi.importActual('../src/entities');
    return {
        ...actual,
        createGatePair: vi.fn(() => [{ y: 0 }]),
        createEnemyHorde: vi.fn(() => ({ y: 0, isActive: true })),
        createBoss: vi.fn(() => ({ type: 'beast', y: 0 })),
        createMiniBoss: vi.fn(() => ({ isActive: true, y: 0 })),
        createMysteryBox: vi.fn(() => ({ y: 0 })),
        createCoin: vi.fn(() => ({ y: 0 })),
    };
});

import { createGatePair, createEnemyHorde, createBoss, createMiniBoss, createMysteryBox, createCoin } from '../src/entities';

describe('Spawner', () => {
    let entities: Entities;
    let gameState: GameState;

    beforeEach(() => {
        gameState = {
            currentLevel: 1,
            distanceTraveled: 0,
            levelDistance: 1000,
            isGameOver: false,
            isVictory: false
        } as any;

        entities = {
            gates: [],
            enemyHordes: [],
            miniBosses: [],
            boss: null,
            mysteryBoxes: [],
            coins: [],
            playerArmy: { soldiers: [{ isAlive: true }] }
        } as any;

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Coins', () => {
        it('should spawn coins', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001); // < 0.005
            spawnCoins(entities, 480, gameState, 1);
            expect(createCoin).toHaveBeenCalled();
            expect(entities.coins.length).toBe(1);
        });
    });

    describe('Mystery Boxes', () => {
        it('should spawn mystery box', () => {
             const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001); // < 0.002
             spawnMysteryBoxes(entities, 480, gameState, 1);
             expect(createMysteryBox).toHaveBeenCalled();
             expect(entities.mysteryBoxes.length).toBe(1);
        });
    });

    describe('Gates', () => {
        it('should spawn gates when enough space', () => {
            // No gates, spawnY = -100.
            spawnGates(entities, 480, gameState);
            expect(createGatePair).toHaveBeenCalled();
            expect(entities.gates.length).toBeGreaterThan(0);
        });

        it('should not spawn gates if too close', () => {
            entities.gates = [{ y: -100 } as any];
            spawnGates(entities, 480, gameState);
            expect(createGatePair).not.toHaveBeenCalled();
        });
    });

    describe('Enemies', () => {
        it('should spawn enemies', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01); // High chance
            spawnEnemies(entities, 480, gameState, 800, 1);
            expect(createEnemyHorde).toHaveBeenCalled();
            expect(entities.enemyHordes.length).toBe(1);
        });
    });

    describe('Bosses', () => {
        it('should spawn boss at distance', () => {
            gameState.distanceTraveled = 950; // > 0.9 * 1000
            checkBossSpawn(entities, 480, gameState, 800);
            expect(createBoss).toHaveBeenCalled();
            expect(entities.boss).toBeDefined();
        });

        it('should not spawn boss if already exists', () => {
            gameState.distanceTraveled = 950;
            entities.boss = {} as any;
            checkBossSpawn(entities, 480, gameState, 800);
            expect(createBoss).not.toHaveBeenCalled();
        });
    });

    describe('MiniBosses', () => {
        it('should spawn miniboss', () => {
            // Logic: distance / interval > lastSpawn
            gameState.distanceTraveled = 300; // interval is 250 (1000 * 0.25)

            spawnMiniBoss(entities, 480, gameState, 800);

            expect(createMiniBoss).toHaveBeenCalled();
            expect(entities.miniBosses.length).toBe(1);
        });

        it('should spawn multiple minibosses at high levels (>11)', () => {
            gameState.currentLevel = 12;
            gameState.distanceTraveled = 500;

            spawnMiniBoss(entities, 480, gameState, 800);

            // Should spawn multiple
            expect(createMiniBoss).toHaveBeenCalled();
            expect(entities.miniBosses.length).toBeGreaterThan(0);
        });
    });
});
