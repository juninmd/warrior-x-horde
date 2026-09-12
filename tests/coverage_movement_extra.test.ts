import { describe, it, expect } from 'vitest';
import { updateMovement, updateSoldierFormation } from '../src/movement';

describe('Movement Coverage', () => {

    it('updateSoldierFormation breaks if no soldier found', () => {
        const soldier = { isAlive: true, x: 0, y: 0, targetX: 0, targetY: 0, size: 5, color: 'red', offsetX: 0, offsetY: 0, ring: 0, passedGates: [] };
        const army: any = {
            centerX: 0,
            centerY: 0,
            soldiers: [soldier, soldier],
            aliveCount: 3 // artificially high!
        };
        updateSoldierFormation(army, 1);
        expect(army.soldiers.length).toBe(2);
    });

    it('updateHordeFormation breaks if no horde item found', () => {
        const hSoldier = { x: 0, y: 0, targetX: 0, targetY: 0, isAlive: true };
        const horde: any = {
             x: 0,
             y: 0,
             soldiers: [hSoldier], // length 1
             count: 2, // artificially high
             isActive: true,
             speed: 10
        };

        const entities: any = {
            miniBosses: [],
            playerArmy: { centerX: 0, centerY: 0, soldiers: [], aliveCount: 0 },
            boss: null,
            bullets: [],
            enemyHordes: [horde],
            mysteryBoxes: [],
            gates: [],
            coins: [],
            itemsToCleanup: []
        };
        const gameState: any = { isBattling: false };
        updateMovement(entities, gameState, 800, 400, 1);
        expect(horde.soldiers.length).toBe(1);
    });

    it('updateMovement fast remove for miniBosses', () => {
        const gameState: any = { isBattling: false };
        const mb1 = { isActive: false, y: 0 };
        const mb2 = { isActive: true, y: 0 };
        const entities: any = {
            miniBosses: [mb1, mb2],
            playerArmy: { centerX: 0, centerY: 0, soldiers: [], aliveCount: 0 },
            boss: null,
            bullets: [],
            enemyHordes: [],
            mysteryBoxes: [],
            gates: [],
            coins: [],
            itemsToCleanup: []
        };
        updateMovement(entities, gameState, 800, 400, 1);
        expect(entities.miniBosses.length).toBe(1);
    });
});

    it('updateSoldierFormation breaks early when hitting maxLen', () => {
        const soldier = { isAlive: false, x: 0, y: 0, targetX: 0, targetY: 0, size: 5, color: 'red', offsetX: 0, offsetY: 0, ring: 0, passedGates: [] };
        const army: any = {
            centerX: 0,
            centerY: 0,
            soldiers: [soldier, soldier],
            aliveCount: 1
        };
        updateSoldierFormation(army, 1);
        expect(army.soldiers.length).toBe(2);
    });

    it('updateHordeFormation breaks early when hitting maxLen', () => {
        const hSoldier = { x: 0, y: 0, targetX: 0, targetY: 0, isAlive: false };
        const horde: any = {
             x: 0,
             y: 0,
             soldiers: [hSoldier, hSoldier],
             count: 1,
             isActive: true,
             speed: 10
        };

        const entities: any = {
            miniBosses: [],
            playerArmy: { centerX: 0, centerY: 0, soldiers: [], aliveCount: 0 },
            boss: null,
            bullets: [],
            enemyHordes: [horde],
            mysteryBoxes: [],
            gates: [],
            coins: [],
            itemsToCleanup: []
        };
        const gameState: any = { isBattling: false };
        updateMovement(entities, gameState, 800, 400, 1);
        expect(horde.soldiers.length).toBe(2);
    });

    it('normal boss waits and then moves', () => {
        const boss = {
            isActive: true,
            type: 'normal',
            y: 90,
            spawnTime: Date.now() - 11000,
            isMoving: false
        };
        const entities: any = {
            miniBosses: [],
            playerArmy: { centerX: 0, centerY: 0, soldiers: [], aliveCount: 0 },
            boss: boss,
            bullets: [],
            enemyHordes: [],
            mysteryBoxes: [],
            gates: [],
            coins: [],
            itemsToCleanup: []
        };
        const gameState: any = { isBattling: false, gameSpeed: 1 };

        updateMovement(entities, gameState, 800, 400, 1);
        expect(boss.y).toBe(91);

        boss.y = 100;
        updateMovement(entities, gameState, 800, 400, 1);
        expect(boss.isMoving).toBe(true);
    });

    it('mothership limits max velocity', () => {
        const boss = {
            isActive: true,
            type: 'mothership',
            x: 200,
            y: 50,
            vx: 0,
            vy: 0
        };
        const entities: any = {
            miniBosses: [],
            playerArmy: { centerX: 0, centerY: 0, soldiers: [], aliveCount: 0 },
            boss: boss,
            bullets: [],
            enemyHordes: [],
            mysteryBoxes: [],
            gates: [],
            coins: [],
            itemsToCleanup: []
        };
        const gameState: any = { isBattling: false, gameSpeed: 1 };

        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

        updateMovement(entities, gameState, 800, 400, 1);

        expect(boss.vx).toBeLessThan(0);
        expect(boss.vy).toBeLessThan(0);

        randomSpy.mockRestore();
    });

    it('mothership limits bounds and random movement', () => {
        const boss = {
            isActive: true,
            type: 'mothership',
            x: 10,
            y: 10,
            vx: -1,
            vy: -1,
            width: 100
        };
        const entities: any = {
            miniBosses: [],
            playerArmy: { centerX: 0, centerY: 0, soldiers: [], aliveCount: 0 },
            boss: boss,
            bullets: [],
            enemyHordes: [],
            mysteryBoxes: [],
            gates: [],
            coins: [],
            itemsToCleanup: []
        };
        const gameState: any = { isBattling: false, gameSpeed: 1 };

        updateMovement(entities, gameState, 800, 400, 1);

        expect(boss.x).toBeGreaterThanOrEqual(20);
        expect(boss.y).toBeGreaterThanOrEqual(20);

        boss.x = 800;
        boss.y = 100;

        updateMovement(entities, gameState, 800, 400, 1);

        expect(boss.x).toBeLessThanOrEqual(480 - 100 - 20);
        expect(boss.y).toBeLessThanOrEqual(80);
    });

    it('horde pursuit logic', () => {
        const horde = {
             x: 200,
             y: 600,
             soldiers: [],
             count: 0,
             isActive: true,
             speed: 10
        };

        const entities: any = {
            miniBosses: [],
            playerArmy: { centerX: 100, centerY: 0, soldiers: [], aliveCount: 0 },
            boss: null,
            bullets: [],
            enemyHordes: [horde],
            mysteryBoxes: [],
            gates: [],
            coins: [],
            itemsToCleanup: []
        };
        const gameState: any = { isBattling: false, gameSpeed: 1, currentLevel: 1 };

        updateMovement(entities, gameState, 800, 800, 10);

        expect(horde.x).not.toBe(200);
    });
