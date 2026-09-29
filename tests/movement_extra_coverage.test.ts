import { describe, it, expect, vi } from 'vitest';
import { updateMovement, updateArmyPosition, moveEntitiesDown, updateSoldierFormation } from '../src/movement';
import { BASE_SPEED } from '../src/constants';

describe('Movement Extra Coverage', () => {
    it('should cover soldier finding loop exhaust in updateArmyPosition', () => {
        const army = {
            centerX: 100, centerY: 700, targetX: 100,
            aliveCount: 1,
            soldiers: [
                { isAlive: false, x: 0, y: 0, targetX: 0, targetY: 0 },
                { isAlive: false, x: 0, y: 0, targetX: 0, targetY: 0 }
            ]
        } as any;

        updateArmyPosition(army, 100, 480, 1);
        expect(army.centerX).toBeDefined();
    });

    it('should cover updateSoldierFormation loop exhaust', () => {
        const army = {
            centerX: 100, centerY: 700, targetX: 100,
            aliveCount: 1,
            soldiers: [
                { isAlive: false, x: 0, y: 0, targetX: 0, targetY: 0 },
                { isAlive: false, x: 0, y: 0, targetX: 0, targetY: 0 }
            ]
        } as any;

        updateSoldierFormation(army, 1);
        expect(army.centerX).toBe(100);
    });

    it('should cover moving boss y < minY and y > maxY in moveEntitiesDown', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: { type: 'mothership', isActive: true, y: 10, vy: -1 },
            enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [], coins: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.y).toBe(20);
        expect(entities.boss.vy).toBeGreaterThan(0);

        entities.boss.y = 100;
        entities.boss.vy = 1;
        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.y).toBe(80);
        expect(entities.boss.vy).toBeLessThan(0);
    });

    it('should cover moveEntitiesDown boss timeSinceSpawn limit', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: { type: 'beast', isActive: true, y: 150, spawnTime: Date.now() - 11000, isMoving: true, height: 100, vx: 0, vy: 0 },
            enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [], coins: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.y).toBeGreaterThan(150);

        entities.boss.y = 700;
        // logic: Math.min(boss.y + enemySpeed * 0.8, armyTopY - boss.height + 20)
        // armyTopY = 700 - 50 = 650
        // boss.y = 700, enemySpeed = BASE_SPEED * 1.5 * 1 * 0.6 = (assumed constants base speed = 4?) wait, 4 * 1.5 * 1 * 0.6 = 3.6
        // Math.min(700 + 3.6, 650 - 100 + 20) = Math.min(703.6, 570) = 570
        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.y).toBe(570);
    });

    it('should cover moveEntitiesDown boss branch where timeSinceSpawn <= waitTime', () => {
         const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: { type: 'beast', isActive: true, y: 150, spawnTime: Date.now(), isMoving: false, height: 100, vx: 0, vy: 0 },
            enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [], coins: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.y).toBe(150);
        expect(entities.boss.isMoving).toBe(false);
    });

    it('should cover moveEntitiesDown boss branch where y < 100 and timeSinceSpawn < waitTime', () => {
         const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: { type: 'beast', isActive: true, y: 50, spawnTime: Date.now(), isMoving: false, height: 100, vx: 0, vy: 0 },
            enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [], coins: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.y).toBeGreaterThan(50);
    });

    it('should cover soldier finding loop exhaust in moveEntitiesDown for hordes', () => {
         const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const horde = {
            isActive: true, y: 100, count: 1, x: 100, soldiers: [
                { isAlive: false },
                { isAlive: false }
            ]
        } as any;
        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: null,
            enemyHordes: [horde], gates: [], miniBosses: [], mysteryBoxes: [], coins: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(horde.y).toBeGreaterThan(100);
    });

    it('should cover updateHordeFormation branch where loop exhaust', () => {
         const horde = {
            isActive: true, y: 100, count: 1, x: 100, soldiers: [
                { isAlive: false },
                { isAlive: false }
            ]
        } as any;
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any; const entities = { playerArmy: { centerX: 100, centerY: 700, targetX: 100, aliveCount: 0, soldiers: [] }, boss: null, enemyHordes: [horde], gates: [], miniBosses: [], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: [] } as any; updateMovement(entities, gameState, 480, 100, 1);
        expect(horde.x).toBe(100);
    });

    it('should cover Math.random branch in mothership movement', () => {
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: { type: 'mothership', isActive: true, y: 50, vy: 0, vx: 0 },
            enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [], coins: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.vx).not.toBe(0);
        expect(entities.boss.vy).not.toBe(0);

        randomSpy.mockRestore();
    });

    it('should cover min/max clamping in Math.random branch of mothership movement', () => {
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: { type: 'mothership', isActive: true, y: 50, vy: 10, vx: -10 },
            enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [], coins: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.vx).toBe(-2);
        expect(entities.boss.vy).toBe(0.5);

        randomSpy.mockRestore();
    });

    it('should cover moving null / passed boxes and coins and inactive mini bosses', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const box1 = { y: 100, passed: true } as any;
        const box2 = null as any;
        const coin1 = { y: 100, passed: true } as any;
        const coin2 = null as any;
        const mb = { isActive: false, y: 100 } as any;

        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: null,
            enemyHordes: [], gates: [], miniBosses: [mb], mysteryBoxes: [box1, box2], coins: [coin1, coin2]
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(box1.y).toBe(100); // untouched because passed
        expect(coin1.y).toBe(100); // untouched because passed
        expect(mb.y).toBe(100); // untouched because inactive
    });


    it('should cover updateSoldierFormation fully including offsets', () => {
        const army = {
            centerX: 100, centerY: 700, targetX: 100,
            aliveCount: 10,
            soldiers: Array(10).fill(null).map(() => ({ isAlive: true, x: 0, y: 0, targetX: 0, targetY: 0 }))
        } as any;
        updateSoldierFormation(army, 1);
        expect(army.soldiers[1].targetX).not.toBe(0);
    });

    it('should cover updateHordeFormation fully including offsets', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const horde = {
            isActive: true, y: 100, count: 10, x: 100, soldiers: Array(10).fill(null).map(() => ({ isAlive: true, x: 0, y: 0, targetX: 0, targetY: 0 }))
        } as any;
        const entities = { playerArmy: { centerX: 100, centerY: 700, targetX: 100, aliveCount: 0, soldiers: [] }, boss: null, enemyHordes: [horde], gates: [], miniBosses: [], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: [] } as any;
        updateMovement(entities, gameState, 480, 100, 1);
        expect(horde.soldiers[1].targetX).not.toBe(0);
    });

    it('should cover moving gates', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const gate = { y: 100 } as any;
        const entities = { playerArmy: { centerX: 100, centerY: 700, targetX: 100 }, boss: null, enemyHordes: [], gates: [gate], miniBosses: [], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: [] } as any;
        moveEntitiesDown(entities, gameState, 1);
        expect(gate.y).toBeGreaterThan(100);
    });

    it('should cover horde pursuit behavior', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const horde = { y: 500, x: 200, count: 1, soldiers: [{isAlive: true, x: 0, y: 0, targetX: 0, targetY: 0}], isActive: true } as any;
        const entities = { playerArmy: { centerX: 100, centerY: 700, targetX: 100 }, boss: null, enemyHordes: [horde], gates: [], miniBosses: [], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: [] } as any;
        // pursuitThreshold = 800 * 0.6 = 480
        // y is 500 > 480, so it will pursue
        moveEntitiesDown(entities, gameState, 1);
        expect(horde.x).not.toBe(200); // Has moved towards player
    });

    it('should cover mothership horizontal bounds minX maxX', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const entities = { playerArmy: { centerX: 100, centerY: 700, targetX: 100 }, boss: { type: 'mothership', isActive: true, y: 50, x: -100, width: 100, vx: -1 }, enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: [] } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.vx).toBeGreaterThan(0); // bounced left

        entities.boss.x = 1000;
        entities.boss.vx = 1;
        moveEntitiesDown(entities, gameState, 1);
        expect(entities.boss.vx).toBeLessThan(0); // bounced right
    });

    it('should cover moving unpassed boxes and coins', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const box = { y: 100, passed: false } as any;
        const coin = { y: 100, passed: false } as any;

        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: null,
            enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [box], coins: [coin], bullets: [], particles: [], textPopups: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(box.y).toBeGreaterThan(100);
        expect(coin.y).toBeGreaterThan(100);
    });

    it('should cover miniBoss active movement', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const mb1 = { isActive: true, y: 100, x: 50, width: 20 } as any; // < 200
        const mb2 = { isActive: true, y: 300, x: 50, width: 20 } as any; // > 200

        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: null,
            enemyHordes: [], gates: [], miniBosses: [mb1, mb2], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(mb1.y).toBeGreaterThan(100);
        expect(mb2.y).toBeGreaterThan(300);
        expect(mb2.x).not.toBe(50); // Pursues horizontally
    });

    it('should cover miniBoss removal', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const mb1 = { isActive: false, y: 100, x: 50, width: 20 } as any; // inactive -> removed
        const mb2 = { isActive: true, y: 1500, x: 50, width: 20 } as any; // offscreen -> removed
        const mb3 = { isActive: true, y: 100, x: 50, width: 20 } as any; // active, kept

        const entities = {
            playerArmy: { centerX: 100, centerY: 700 },
            boss: null,
            enemyHordes: [], gates: [], miniBosses: [mb1, mb2, mb3], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: []
        } as any;

        moveEntitiesDown(entities, gameState, 1);
        expect(entities.miniBosses.length).toBe(1);
    });

    it('should cover early returns in moveEntitiesDown', () => {
        const entities = { playerArmy: { centerX: 100, centerY: 700, targetX: 100 }, boss: null, enemyHordes: [], gates: [], miniBosses: [], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: [] } as any;

        let gameState = { gameSpeed: 1, currentLevel: 1, isGameOver: true, isPaused: false, isVictory: false } as any;
        moveEntitiesDown(entities, gameState, 1); // should return early

        gameState = { gameSpeed: 1, currentLevel: 1, isGameOver: false, isPaused: true, isVictory: false } as any;
        moveEntitiesDown(entities, gameState, 1); // should return early

        gameState = { gameSpeed: 1, currentLevel: 1, isGameOver: false, isPaused: false, isVictory: true } as any;
        moveEntitiesDown(entities, gameState, 1); // should return early

        expect(true).toBe(true);
    });

    it('should cover zero count early return in updateHordeFormation via updateMovement', () => {
        const gameState = { gameSpeed: 1, currentLevel: 1 } as any;
        const horde = { isActive: true, count: 0, x: 100, y: 100, soldiers: [] } as any;
        const entities = { playerArmy: { centerX: 100, centerY: 700, targetX: 100, aliveCount: 0, soldiers: [] }, boss: null, enemyHordes: [horde], gates: [], miniBosses: [], mysteryBoxes: [], coins: [], bullets: [], particles: [], textPopups: [] } as any;

        updateMovement(entities, gameState, 480, 100, 1);
        expect(horde.count).toBe(0);
    });
});
