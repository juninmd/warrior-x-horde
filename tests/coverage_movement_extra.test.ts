import { describe, it, expect } from 'vitest';
import { updateMovement } from '../src/movement';

describe('Movement Coverage', () => {

    it('updateMovement fast remove for miniBosses', () => {
        const gameState = { isBattling: false };
        const mb1 = { isActive: false, y: 0 };
        const mb2 = { isActive: true, y: 0 };
        const entities = {
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
        updateMovement(entities as any, gameState as any, 800, 400, 1);
        expect(entities.miniBosses.length).toBe(1);
    });
});
