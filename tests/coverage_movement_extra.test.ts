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
