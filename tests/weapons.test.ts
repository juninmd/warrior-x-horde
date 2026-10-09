import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawnWeapons, updateWeapons, checkWeaponCollision, applyWeapon, createWeapon, drawWeapon } from '../src/weapons';
import { Army, Entities, GameState, Weapon } from '../src/types';

describe('Weapons', () => {
  let entities: Entities;
  let state: GameState;
  let army: Army;

  beforeEach(() => {
    army = {
        centerX: 0,
        centerY: 0,
        damage: 10,
        fireRate: 1,
        soldiers: [],
        maxHp: 100,
        count: 1
    } as unknown as Army;

    entities = {
      army: army,
      weapons: [] as Weapon[],
    } as unknown as Entities;

    state = {
      gameSpeed: 10,
      score: 0,
      totalKills: 0,
      currentLevel: 1
    } as unknown as GameState;
  });

  it('should create a weapon with valid properties', () => {
    const weapon = createWeapon(100, -10);
    expect(weapon.type).toBeDefined();
    expect(weapon.y).toBe(-10);
  });

  it('should apply weapon stats to army', () => {
    const weapon: Weapon = { type: 'rifle', damage: 5, fireRate: 400, x: 0, y: 0, width: 10, height: 10, id: 1, passed: false };
    applyWeapon(army, weapon);
    expect(army.damage).toBe(5);
    expect(army.fireRate).toBe(400);
  });

  it('should update weapon positions', () => {
    entities.weapons.push({ passed: false, y: -100, type: 'rifle', damage: 5, x: 0 } as any);
    updateWeapons(entities, state);
    expect(entities.weapons[0].y).toBe(-90); // -100 + 10
  });

  it('should detect collision correctly', () => {
    const weapon: Weapon = { type: 'rifle', damage: 5, fireRate: 400, x: 0, y: 0, width: 10, height: 10, id: 1, passed: false };
    army.centerX = 0;
    army.centerY = 0;
    expect(checkWeaponCollision(army, weapon)).toBe(true);

    // Out of bounds
    weapon.x = 200;
    expect(checkWeaponCollision(army, weapon)).toBe(false);
  });

  it('should remove passed weapon at end of array in spawnWeapons', () => {
      // Create weapons array. The pop() fallback logic in spawnWeapons handles gap filling.
      entities.weapons = [
          { id: 1, passed: false, y: 1500 } as any, // 1500 > 1000, will trigger cleanup
          { id: 2, passed: false, y: 0 } as any
      ];
      spawnWeapons(entities, 500);
      // Because we check backwards:
      // i = 1 (id:2) is kept.
      // i = 0 (id:1) triggers condition.
      // It pops id:2. Since 2 is popped and i (0) < length (1), entities.weapons[0] = id:2.
      // Final array should have 1 element (id:2).
      expect(entities.weapons.length).toBe(1);
      expect(entities.weapons[0].id).toBe(2);
  });

  it('should cover v8 ignore branch when popped item is the last remaining item', () => {
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      // When the array has 1 element that needs cleanup:
      entities.weapons = [
          { id: 1, passed: true, y: 1500 } as any
      ];
      spawnWeapons(entities, 500);
      // i = 0 triggers cleanup.
      // it pops the only element (id:1).
      // Since length is now 0, i (0) < entities.weapons.length (0) is false.
      // Result should be empty.
      expect(entities.weapons.length).toBe(0);
      mathRandomSpy.mockRestore();
  });

  it('should cover pop() fallback block strictly (line 46)', () => {
      // line 46 is inside `if (last && i < entities.weapons.length) { entities.weapons[i] = last; }`
      // To strictly ensure that happens, let's create a situation where a pop happens,
      // last is defined, and `i` is strictly less than length (already tested above but let's make it very clear)
      entities.weapons = [
          { id: 1, passed: true, y: 1500 } as any, // 1500 > 1000, will trigger cleanup, i = 0
          { id: 2, passed: false, y: 0 } as any  // i = 1
      ];
      spawnWeapons(entities, 500);
      expect(entities.weapons.length).toBe(1);
      expect(entities.weapons[0].id).toBe(2);
  });

  it('should cover when pop returns undefined', () => {
      // if entities.weapons is somehow mutated or we trigger the pop logic when it's technically empty (which is practically impossible unless manually done)
      // We can force pop to return undefined by modifying the array mid-operation or just pushing a single item
      entities.weapons = [
          { id: 1, passed: true, y: 1500 } as any
      ];
      const popSpy = vi.spyOn(entities.weapons, 'pop').mockReturnValue(undefined);
      spawnWeapons(entities, 500);
      expect(popSpy).toHaveBeenCalled();
      popSpy.mockRestore();
  });

  it('should ignore passed weapons in collision check', () => {
    const weapon: Weapon = { type: 'rifle', damage: 5, fireRate: 400, x: 0, y: 0, width: 10, height: 10, id: 1, passed: true };
    army.centerX = 0;
    army.centerY = 0;
    expect(checkWeaponCollision(army, weapon)).toBe(false);
  });

  it('should ignore passed weapons in drawing', () => {
    const weapon: Weapon = { type: 'rifle', damage: 5, fireRate: 400, x: 0, y: 0, width: 10, height: 10, id: 1, passed: true };
    const ctx = {
        roundRect: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn()
    } as unknown as CanvasRenderingContext2D;

    drawWeapon(ctx, weapon);
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it('should draw active weapons', () => {
      const weapon: Weapon = { type: 'rifle', damage: 5, fireRate: 400, x: 0, y: 0, width: 10, height: 10, id: 1, passed: false };
      const ctx = {
          roundRect: vi.fn(),
          fill: vi.fn(),
          fillText: vi.fn(),
          beginPath: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      drawWeapon(ctx, weapon);
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should cover drawing for all weapon types', () => {
      const types: Array<'rifle' | 'shotgun' | 'minigun' | 'rocket'> = ['rifle', 'shotgun', 'minigun', 'rocket'];

      const ctx = {
          roundRect: vi.fn(),
          fill: vi.fn(),
          fillText: vi.fn(),
          beginPath: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      for (const type of types) {
          const weapon: Weapon = { type, damage: 5, fireRate: 400, x: 0, y: 0, width: 10, height: 10, id: 1, passed: false };
          drawWeapon(ctx, weapon);
      }

      expect(ctx.fill).toHaveBeenCalledTimes(4);
  });

  it('should spawn new weapons occasionally', () => {
      // Force random to be < 0.01 to hit spawn branch
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.005);
      entities.weapons = [];
      spawnWeapons(entities, 500);
      expect(entities.weapons.length).toBe(1);
      randomSpy.mockRestore();
  });

  it('should place weapon on the right side sometimes', () => {
      // First random is for weapon type (e.g. 0.9 = 'rocket')
      // Second random is for side (> 0.5 = 'left')
      // Let's control the sequence: first random 0.1, second random 0.1 (side 'right')
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.1);
      const weapon = createWeapon(100, -10);
      expect(weapon.x).toBe(75); // 100 * 0.75
      randomSpy.mockRestore();
  });
});
