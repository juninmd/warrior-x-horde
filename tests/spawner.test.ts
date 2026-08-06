import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateSpawns, spawnCoins, spawnMysteryBoxes, spawnGates, spawnEnemies, checkBossSpawn, spawnMiniBoss, resetSpawnerState } from '../src/spawner';
import { GameState, Entities } from '../src/types';

vi.mock('../src/entities', async () => {
    const actual = await vi.importActual('../src/entities');
    return {
        ...actual,
        createGatePair: vi.fn(() => [{ y: 0 }]),
        createEnemyHorde: vi.fn(() => ({ y: 0, isActive: true })),
        createBoss: vi.fn((width, level) => ({ type: level >= 10 ? 'mothership' : 'beast', y: 0 })),
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
            playerArmy: { aliveCount: 1, soldiers: [{ isAlive: true }] }
        } as any;

        vi.clearAllMocks();
        resetSpawnerState(); // Important: reset lastMiniBossSpawn between tests
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Coins', () => {
        it('should NOT spawn coins', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001); // < 0.005
            spawnCoins(entities, 480, gameState, 1);
            expect(createCoin).not.toHaveBeenCalled();
            expect(entities.coins.length).toBe(0);
        });

        it('should remove passed coins', () => {
            // Prevent spawning new coins during cleanup test
            vi.spyOn(Math, 'random').mockReturnValue(1.0);

            entities.coins = [
                { passed: true, y: 100 } as any,
                { passed: false, y: 1300 } as any, // > 1200
                { passed: false, y: 100 } as any
            ];

            spawnCoins(entities, 480, gameState, 1);

            expect(entities.coins.length).toBe(1);
            expect(entities.coins[0].y).toBe(100);
            expect(entities.coins[0].passed).toBe(false);
        });
    });

    describe('Mystery Boxes', () => {
        it('should spawn mystery box', () => {
             const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001); // < 0.002
             spawnMysteryBoxes(entities, 480, gameState, 1);
             expect(createMysteryBox).toHaveBeenCalled();
             expect(entities.mysteryBoxes.length).toBe(1);
        });

        it('should remove passed boxes', () => {
            entities.mysteryBoxes = [
                { passed: true, y: 100 } as any,
                { passed: false, y: 1300 } as any,
                { passed: false, y: 100 } as any
            ];

            spawnMysteryBoxes(entities, 480, gameState, 1);

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

        it('should remove passed gates', () => {
             entities.gates = [
                { y: 1300 } as any,
                { y: 100 } as any
            ];

            spawnGates(entities, 480, gameState);

            // Check that old gate is removed. Note that spawnGates might add NEW gates too.
            // But we can check containment
            expect(entities.gates).not.toContainEqual(expect.objectContaining({ y: 1300 }));
            expect(entities.gates).toContainEqual(expect.objectContaining({ y: 100 }));
        });

        it('should consider enemy count in gate spawning', () => {
            // This tests the internal logic that counts enemies
            // We can't spy on internal function, but we can verify it doesn't crash
            // and maybe verify createGatePair arguments if possible, but createGatePair is mocked.

            entities.enemyHordes = [
                { isActive: true, count: 2, soldiers: [{ isAlive: true }, { isAlive: true }] } as any,
                { isActive: false, count: 1, soldiers: [{ isAlive: true }] } as any // Should be ignored
            ];

            spawnGates(entities, 480, gameState);

            expect(createGatePair).toHaveBeenCalled();
            // We can check arguments of the last call
            // createGatePair(width, y, level, heroCount, enemyCount)
            const args = vi.mocked(createGatePair).mock.lastCall;
            expect(args).toBeDefined();
            if (args) {
                // heroCount = 1 (setup in beforeEach)
                // enemyCount = 2 (from enemyHordes above)
                expect(args[3]).toBe(1);
                expect(args[4]).toBe(2);
            }
        });
    });

    describe('Enemies', () => {
        it('should spawn enemies', () => {
            entities.playerArmy.aliveCount = 1; // Explicitly set for new logic
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01); // High chance
            spawnEnemies(entities, 480, gameState, 1);
            expect(createEnemyHorde).toHaveBeenCalled();
            expect(entities.enemyHordes.length).toBe(1);
        });

        it('should remove passed enemies', () => {
            // Ensure no new spawn happens
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1.0);

            entities.enemyHordes = [
                { isActive: true, y: 1300, soldiers: [{ id: 1 }] } as any, // Add a mock soldier
                { isActive: true, y: 100, soldiers: [] } as any
            ];

            spawnEnemies(entities, 480, gameState, 1);

            expect(entities.enemyHordes.length).toBe(1);
            expect(entities.enemyHordes[0].y).toBe(100);
        });
    });

    describe('Bosses', () => {
        it('should spawn boss at distance (Non-Mothership)', () => {
            gameState.distanceTraveled = 950; // > 0.9 * 1000
            gameState.currentLevel = 9; // < 10

            checkBossSpawn(entities, 480, gameState);

            expect(createBoss).toHaveBeenCalled();
            expect(entities.boss).toBeDefined();
            // Non-mothership bosses should have Y overridden to -150
            if (entities.boss) {
                expect(entities.boss.y).toBe(-150);
            }
        });

        it('should spawn Mothership boss at Level 10+', () => {
            gameState.distanceTraveled = 950;
            gameState.currentLevel = 10;

            checkBossSpawn(entities, 480, gameState);

            expect(createBoss).toHaveBeenCalled();
            expect(entities.boss).toBeDefined();
            // Mothership boss logic preserves original Y (mocked as 0 for simplicity, but we check branching)
            if (entities.boss) {
                expect(entities.boss.type).toBe('mothership');
                // The code says: if (boss.type !== 'mothership') boss.y = -150;
                // So for mothership, boss.y should remain what createBoss returned (0 in mock)
                expect(entities.boss.y).toBe(0);
            }
        });

        it('should not spawn boss if already exists', () => {
            gameState.distanceTraveled = 950;
            entities.boss = {} as any;
            checkBossSpawn(entities, 480, gameState);
            expect(createBoss).not.toHaveBeenCalled();
        });
    });

    describe('MiniBosses', () => {
        it('should spawn miniboss', () => {
            // Logic: distance / interval > lastSpawn
            gameState.distanceTraveled = 300; // interval is 250 (1000 * 0.25)

            spawnMiniBoss(entities, 480, gameState);

            expect(createMiniBoss).toHaveBeenCalled();
            expect(entities.miniBosses.length).toBe(1);
        });

        it('should spawn multiple minibosses at high levels (>11)', () => {
            gameState.currentLevel = 12;
            gameState.distanceTraveled = 500;

            spawnMiniBoss(entities, 480, gameState);

            // Should spawn multiple
            expect(createMiniBoss).toHaveBeenCalled();
            expect(entities.miniBosses.length).toBeGreaterThan(0);
        });

        it('should not spawn if active mini-bosses equals maxConcurrent', () => {
            // maxConcurrent for level 1 is 5
            entities.miniBosses = [
                { isActive: true }, { isActive: true }, { isActive: true }, { isActive: true }, { isActive: true }, { isActive: false }
            ] as any;
            const initialLength = entities.miniBosses.length;
            gameState.distanceTraveled = 300;
            spawnMiniBoss(entities, 800, gameState);
            expect(entities.miniBosses.length).toBe(initialLength);
        });

        it('should spawn if active mini-bosses < maxConcurrent', () => {
            // maxConcurrent for level 1 is 5
            entities.miniBosses = [
                { isActive: true }, { isActive: true }, { isActive: true }, { isActive: true }, { isActive: false }
            ] as any;
            const initialLength = entities.miniBosses.length;
            gameState.distanceTraveled = 300;
            spawnMiniBoss(entities, 800, gameState);
            expect(entities.miniBosses.length).toBeGreaterThan(initialLength);
        });

        it('should reset the mini-boss spawn counter for a new run', () => {
            resetSpawnerState(); // deterministic start, independent of prior tests

            // First run advances the internal lastMiniBossSpawn counter
            gameState.distanceTraveled = 300; // > interval (250)
            spawnMiniBoss(entities, 480, gameState);
            expect(entities.miniBosses.length).toBe(1);

            // A new run at the same early distance WITHOUT reset spawns nothing
            entities.miniBosses = [];
            gameState.distanceTraveled = 300;
            spawnMiniBoss(entities, 480, gameState);
            expect(entities.miniBosses.length).toBe(0);

            // After resetSpawnerState, the early-run spawn works again
            resetSpawnerState();
            spawnMiniBoss(entities, 480, gameState);
            expect(entities.miniBosses.length).toBe(1);

            resetSpawnerState(); // leave module state clean for later tests
        });
    });

    describe('Update Spawns', () => {
       it('should not update if game over', () => {
           gameState.isGameOver = true;
           updateSpawns(entities, 480, gameState, 800, 1);
           expect(createGatePair).not.toHaveBeenCalled();
       });

       it('should not update if victory', () => {
           gameState.isVictory = true;
           updateSpawns(entities, 480, gameState, 800, 1);
           expect(createGatePair).not.toHaveBeenCalled();
       });

       it('should update all spawners', () => {
           // Spy on internal functions if exported?
           // No, we can just check side effects
           const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0001); // Trigger coins/boxes

           updateSpawns(entities, 480, gameState, 800, 1);

           // Check gate spawn was attempted (always runs check)
           expect(createGatePair).toHaveBeenCalled();
       });
    });
});
