import { describe, it, expect, vi } from 'vitest';
import { createWeapon, applyWeapon, updateWeapons, checkWeaponCollision } from '../src/weapons';
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
});
