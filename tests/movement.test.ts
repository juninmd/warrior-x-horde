import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateMovement, updateArmyPosition, moveEntitiesDown } from '../src/movement';
import { GameState, Entities, Army } from '../src/types';

describe('Movement', () => {
    let entities: Entities;
    let gameState: GameState;

    beforeEach(() => {
        gameState = {
            isGameOver: false,
            isPaused: false,
            isVictory: false,
            currentLevel: 1,
            gameSpeed: 1,
            distanceTraveled: 0,
            levelDistance: 1000
        } as any;

        entities = {
            playerArmy: { centerX: 100, centerY: 700, targetX: 100, soldiers: [] } as any,
            enemyHordes: [],
            gates: [],
            miniBosses: [],
            boss: null,
            mysteryBoxes: [],
            coins: []
        } as any;

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Army Movement', () => {
        it('should update army position towards target', () => {
            entities.playerArmy.centerX = 100;
            updateArmyPosition(entities.playerArmy, 200, 480, 1);
            // Moves 10% of diff: 100 + (200-100)*0.1 = 110
            expect(entities.playerArmy.centerX).toBeCloseTo(110);
        });

        it('should clamp target position', () => {
            updateArmyPosition(entities.playerArmy, -100, 480, 1);
            expect(entities.playerArmy.targetX).toBe(50); // Min X

            updateArmyPosition(entities.playerArmy, 600, 480, 1);
            expect(entities.playerArmy.targetX).toBe(430); // Max X (480 - 50)
        });

        it('should update soldier formation', () => {
            // Add soldiers
            const s1 = { x: 100, y: 700, targetX: 100, targetY: 700, isAlive: true, size: 10 };
            const s2 = { x: 100, y: 700, targetX: 100, targetY: 700, isAlive: true, size: 10 };
            entities.playerArmy.soldiers = [s1, s2] as any;
            entities.playerArmy.centerX = 100;
            entities.playerArmy.centerY = 700;

            updateArmyPosition(entities.playerArmy, 100, 480, 1);

            // They should move towards formation points
            // S1 (index 0, ring 0) -> Center
            // S2 (index 1, ring 1) -> Offset

            // Check targets updated
            expect(s2.targetX).not.toBe(100); // Should be offset
            expect(s2.targetY).not.toBe(700);
        });
    });

    describe('World Movement', () => {
        it('should move gates down', () => {
            const gate = { y: 100 } as any;
            entities.gates = [gate];

            moveEntitiesDown(entities, gameState, 1);

            expect(gate.y).toBeGreaterThan(100);
        });

        it('should move enemies down and chase', () => {
            const s1 = { x: 200, y: 600, targetX: 200, targetY: 600, isAlive: true };
            const horde = { y: 600, isActive: true, x: 200, soldiers: [s1] } as any; // > pursuitThreshold (0.6 * 800 = 480)
            entities.enemyHordes = [horde];
            entities.playerArmy.centerX = 100;

            moveEntitiesDown(entities, gameState, 1);

            expect(horde.y).toBeGreaterThan(600);
            expect(horde.x).toBeLessThan(200); // Moving towards 100

            // Check formation update on horde
            expect(s1.targetX).toBeDefined();
        });

        it('should move boss (mothership - random)', () => {
            const randomSpy = vi.spyOn(Math, 'random');
            randomSpy.mockReturnValue(0.9); // (0.9 - 0.5) * 2 = 0.8 vx

            const boss = {
                type: 'mothership', isActive: true, x: 100, y: 50, width: 100,
                vx: undefined, vy: undefined
            } as any;
            entities.boss = boss;

            moveEntitiesDown(entities, gameState, 1);

            // Should have initialized velocity
            expect(boss.vx).toBeCloseTo(0.8);
        });

        it('should move boss (normal - wait then chase)', () => {
             const boss = {
                type: 'beast', isActive: true, x: 100, y: 100, width: 100, height: 100,
                spawnTime: Date.now() - 11000, // 11s ago (>10s wait)
                isMoving: false
            } as any;
            entities.boss = boss;
            entities.playerArmy.centerY = 700;
            entities.playerArmy.centerX = 200;

            moveEntitiesDown(entities, gameState, 1);

            expect(boss.isMoving).toBe(true);
            expect(boss.y).toBeGreaterThan(100);
            expect(boss.x).toBeGreaterThan(100); // Towards 200
        });

        it('should move boss (normal - waiting)', () => {
             const boss = {
                type: 'beast', isActive: true, x: 100, y: 100,
                spawnTime: Date.now(),
                isMoving: false
            } as any;
            entities.boss = boss;

            moveEntitiesDown(entities, gameState, 1);

            expect(boss.isMoving).toBe(false);
            expect(boss.y).toBe(100);
        });

        it('should move mystery boxes and coins', () => {
            const box = { y: 100, passed: false } as any;
            const coin = { y: 100, passed: false } as any;
            entities.mysteryBoxes = [box];
            entities.coins = [coin];

            moveEntitiesDown(entities, gameState, 1);

            expect(box.y).toBeGreaterThan(100);
            expect(coin.y).toBeGreaterThan(100);
        });
    });
});
