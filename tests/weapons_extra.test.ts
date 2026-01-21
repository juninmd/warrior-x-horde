import { describe, it, expect, vi } from 'vitest';
import { createWeapon, spawnWeapons, drawWeapon } from '../src/weapons';
import { Entities, GameState } from '../src/types';

describe('Weapons - Additional', () => {
    it('should spawn weapons correctly', () => {
        const entities: Entities = { weapons: [] } as any;
        const gameState: GameState = {} as any;

        // Mock Math.random to ensure spawn
        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.005); // < 0.01

        spawnWeapons(entities, 500, gameState);

        expect(entities.weapons.length).toBe(1);

        randomSpy.mockRestore();
    });

    it('should remove passed weapons', () => {
        const entities: Entities = {
            weapons: [
                { passed: true, y: 100 },
                { passed: false, y: 1500 }, // Off screen > 1000
                { passed: false, y: 500 } // Keep this
            ]
        } as any;

        vi.spyOn(Math, 'random').mockReturnValue(0.9);

        spawnWeapons(entities, 500, {} as any);

        expect(entities.weapons.length).toBe(1);
        expect(entities.weapons[0].y).toBe(500);

        vi.restoreAllMocks();
    });

    it('should draw weapon', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const weapon = createWeapon(500, 100);

        drawWeapon(ctx, weapon);

        expect(ctx.fill).toHaveBeenCalled();
        expect(ctx.fillText).toHaveBeenCalled();
    });

    it('should not draw passed weapon', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const weapon = createWeapon(500, 100);
        weapon.passed = true;

        drawWeapon(ctx, weapon);

        expect(ctx.fill).not.toHaveBeenCalled();
    });
});
