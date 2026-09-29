import { describe, it, expect, vi } from 'vitest';
import { createWeapon, applyWeapon, updateWeapons, checkWeaponCollision, spawnWeapons } from '../src/weapons';
import { Army, GameState, Entities } from '../src/types';

describe('Weapons', () => {
  it('should create a weapon with valid properties', () => {
    const weapon = createWeapon(500, 100);
    expect(weapon.x).toBeDefined();
    expect(weapon.y).toBe(100);
    expect(['rifle', 'shotgun', 'minigun', 'rocket']).toContain(weapon.type);
    expect(weapon.damage).toBeGreaterThan(0);
    expect(weapon.fireRate).toBeGreaterThan(0);
  });

  it('should remove passed or out-of-bounds weapons via swap and pop', () => {
      const entities: Entities = {
          weapons: [
              createWeapon(500, -100),
              createWeapon(500, 1500),
              createWeapon(500, 100),
              createWeapon(500, 200)
          ],
      } as any;
      entities.weapons[3].passed = true;

      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1);

      spawnWeapons(entities, 500);

      randomSpy.mockRestore();

      expect(entities.weapons.length).toBe(2);
      expect(entities.weapons.some(w => w.passed)).toBe(false);
      expect(entities.weapons.some(w => w.y >= 1000)).toBe(false);
  });

  it('should apply weapon stats to army', () => {
      const army: Army = {
          damage: 1,
          fireRate: 1000,
      } as any;

      const weapon = createWeapon(500, 100);
      applyWeapon(army, weapon);

      expect(army.damage).toBe(weapon.damage);
      expect(army.fireRate).toBe(weapon.fireRate);
  });

  it('should update weapon positions', () => {
      const entities: Entities = {
          weapons: [createWeapon(500, 100)],
      } as any;

      const gameState: GameState = {
          gameSpeed: 5,
      } as any;

      updateWeapons(entities, gameState);

      expect(entities.weapons[0].y).toBe(105);
  });

  it('should detect collision correctly', () => {
      const army: Army = {
          centerX: 100,
          centerY: 100,
      } as any;

      // Weapon inside army bounds (roughly +/- 50 around center)
      const hitWeapon = createWeapon(500, 100);
      hitWeapon.x = 100;
      hitWeapon.y = 100;

      expect(checkWeaponCollision(army, hitWeapon)).toBe(true);

      // Weapon outside
      const missWeapon = createWeapon(500, 100);
      missWeapon.x = 300;
      missWeapon.y = 300;

      expect(checkWeaponCollision(army, missWeapon)).toBe(false);
  });


  it('should remove passed weapon at end of array', async () => {
      const { spawnWeapons } = await import('../src/weapons');
      const entities = { weapons: [] } as any;
      entities.weapons.push({ passed: true, y: 100 } as any);
      spawnWeapons(entities, 500);
      expect(entities.weapons.length).toBe(0);
  });
});
