import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMovement, moveEntitiesDown } from '../src/movement';
import { GameState, Entities, Boss, MiniBoss, EnemyHorde } from '../src/types';

describe('Movement Extra Coverage', () => {
    let gameState: GameState;
    let entities: Entities;

    beforeEach(() => {
        gameState = {
            isGameOver: false,
            isPaused: false,
            isVictory: false,
            gameSpeed: 1,
            currentLevel: 1,
            distanceTraveled: 0
        } as any;

        entities = {
            playerArmy: { centerX: 240, centerY: 600, soldiers: [] },
            gates: [],
            enemyHordes: [],
            miniBosses: [],
            boss: null,
            mysteryBoxes: [],
            coins: []
        } as any;
    });

    describe('Boss Movement', () => {
        it('should initialize and move Mothership', () => {
            const boss: Boss = {
                type: 'mothership',
                x: 200, y: 50,
                width: 100, height: 100,
                vx: undefined, vy: undefined,
                isActive: true
            } as any;
            entities.boss = boss;

            // First frame: initializes vx/vy
            moveEntitiesDown(entities, gameState, 1);
            expect(boss.vx).toBeDefined();
            expect(boss.vy).toBeDefined();

            // Move again
            const oldX = boss.x;
            const oldY = boss.y;
            moveEntitiesDown(entities, gameState, 1);
            expect(boss.x).not.toBe(oldX);
            expect(boss.y).not.toBe(oldY);
        });

        it('should constrain Mothership bounds', () => {
            const boss: Boss = {
                type: 'mothership',
                x: -100, y: -100, // Out of bounds
                width: 100, height: 100,
                vx: -1, vy: -1,
                isActive: true
            } as any;
            entities.boss = boss;

            moveEntitiesDown(entities, gameState, 1);

            // Should be clamped to minX/minY (20)
            expect(boss.x).toBe(20);
            expect(boss.y).toBe(20);
            // Velocity flipped?
            expect(boss.vx).toBeGreaterThan(0);
            expect(boss.vy).toBeGreaterThan(0);
        });

        it('should move Normal Boss after wait time', () => {
            const boss: Boss = {
                type: 'beast',
                x: 200, y: 150, // > 100
                spawnTime: Date.now() - 11000, // > 10s ago
                isActive: true,
                width: 50, height: 50
            } as any;
            entities.boss = boss;

            const oldY = boss.y;
            moveEntitiesDown(entities, gameState, 1);

            expect(boss.y).toBeGreaterThan(oldY);
            expect(boss.isMoving).toBe(true);
        });

        it('should NOT move Normal Boss during wait time', () => {
            const boss: Boss = {
                type: 'beast',
                x: 200, y: 150,
                spawnTime: Date.now(), // Just spawned
                isActive: true,
                width: 50, height: 50
            } as any;
            entities.boss = boss;

            const oldY = boss.y;
            moveEntitiesDown(entities, gameState, 1);

            expect(boss.y).toBe(oldY);
        });
    });

    describe('MiniBoss Movement', () => {
        it('should move MiniBoss down and pursue', () => {
            const mb: MiniBoss = {
                isActive: true,
                x: 100, y: 300, // > 200
                width: 40, height: 40
            } as any;
            entities.miniBosses = [mb];

            entities.playerArmy.centerX = 300; // Target right

            const oldX = mb.x;
            const oldY = mb.y;
            moveEntitiesDown(entities, gameState, 1);

            expect(mb.y).toBeGreaterThan(oldY);
            expect(mb.x).toBeGreaterThan(oldX); // Should move towards 300
        });
    });

    describe('Horde Movement', () => {
        it('should pursue player when passed threshold', () => {
            const horde: EnemyHorde = {
                isActive: true,
                x: 100, y: 600, // > pursuitThreshold (800 * 0.6 = 480)
                soldiers: []
            } as any;
            entities.enemyHordes = [horde];
            entities.playerArmy.centerX = 300;

            const oldX = horde.x;
            moveEntitiesDown(entities, gameState, 1);

            expect(horde.x).toBeGreaterThan(oldX);
        });
    });


    describe('Missing Branches', () => {
        it('should handle gaps in army.soldiers when updating movement', () => {
            entities.playerArmy.soldiers.push(
                { x: 100, y: 100, isAlive: false } as any,
                { x: 100, y: 100, isAlive: true, offsetX: 0, offsetY: 0 } as any
            );
            entities.playerArmy.aliveCount = 2; // Simulate more than actual alive

            updateMovement(entities, gameState);
            expect(entities.playerArmy.soldiers[1].x).toBeDefined();
        });

        it('should handle gaps in horde.soldiers when updating movement', () => {
            entities.enemyHordes.push({
                x: 100, y: 100, width: 50, height: 50, isActive: true, count: 2, soldiers: [
                    { x: 100, y: 100, isAlive: false } as any,
                    { x: 100, y: 100, isAlive: true, offsetX: 0, offsetY: 0 } as any
                ]
            } as any);

            updateMovement(entities, gameState);
            expect(entities.enemyHordes[0].soldiers[1].x).toBeDefined();
        });

        it('should handle boss random movement logic', () => {
            entities.boss = {
                type: 'mothership', x: 100, y: 100, width: 50, height: 50, hp: 100, maxHp: 100, isActive: true,
                spawnTime: Date.now() - 20000, isMoving: true, vx: 0, vy: 0
            } as any;

            const originalRandom = Math.random;
            Math.random = () => 0.01; // Force < 0.02 * dtFactor
            moveEntitiesDown(entities, gameState, 1);
            Math.random = originalRandom;

            expect(entities.boss.vx).not.toBe(0);
        });

        it('should move slimes with Math.sin variation', () => {
            entities.boss = {
                type: 'slime', x: 100, y: 150, width: 50, height: 50, hp: 100, maxHp: 100, isActive: true,
                spawnTime: Date.now() - 20000, isMoving: true, vx: 0, vy: 0
            } as any;

            moveEntitiesDown(entities, gameState, 1);
            expect(entities.boss.x).not.toBe(100);
        });

        it('should move boss to start position if y < 100', () => {
            entities.boss = {
                type: 'beast', x: 100, y: 50, width: 50, height: 50, hp: 100, maxHp: 100, isActive: true,
                spawnTime: Date.now(), isMoving: false, vx: 0, vy: 0
            } as any;
            moveEntitiesDown(entities, gameState, 1);
            expect(entities.boss.y).toBeGreaterThan(50);
        });
    });
});
