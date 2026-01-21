// Mock game.ts and renderer.ts
import { vi } from 'vitest';

vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
}));

vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
}));

import { describe, it, expect } from 'vitest';
import { updateBullets, createBullet, updateShooting, activateSuperCannon, updateSuperCannon } from '../src/shooting';
import { GameState, Entities, Army, Soldier } from '../src/types';

describe('Shooting', () => {
  it('should create bullet', () => {
    const bullet = createBullet(10, 10, 0, 0, 5, false);
    expect(bullet).toBeDefined();
    expect(bullet.damage).toBe(5);
    expect(bullet.isEnemy).toBe(false);
  });

  it('should update bullets (move and remove)', () => {
      const bullet = createBullet(0, 0, 100, 100, 1, false);
      bullet.speed = -10;

      const entities: Entities = {
          bullets: [bullet],
          enemyHordes: [],
          playerArmy: {},
          boss: null,
          miniBosses: [],
          mysteryBoxes: []
      } as any;

      const gameState: GameState = { score: 0 } as any;

      updateBullets(entities, gameState, 1);

      expect(bullet.y).toBe(-10);

      // Move out of bounds
      bullet.y = -100;
      updateBullets(entities, gameState, 1);

      expect(entities.bullets.length).toBe(0);
  });

  it('should detect bullet collision with enemy', () => {
      const bullet = createBullet(100, 100, 100, 50, 1, false);
      const enemy: Soldier = { x: 100, y: 100, size: 10, isAlive: true, hp: 10 } as any;
      const horde = { isActive: true, soldiers: [enemy], count: 1, y: 0 };

      const entities: Entities = {
          bullets: [bullet],
          enemyHordes: [horde],
          playerArmy: {},
          boss: null,
          miniBosses: [],
          mysteryBoxes: []
      } as any;

      const gameState: GameState = { score: 0 } as any;

      // The issue with the failing test is that updateBullets uses SpatialHashGrid.
      // SpatialHashGrid implementation uses cell sizes.
      // And the bullet and enemy need to overlap.
      // checkBulletSoldierCollision logic: dist < (soldierRadius + bulletRadius)
      // soldierRadius=10, bulletRadius=5. dist < 15.
      // bullet at 100,100, enemy at 100,100. dist = 0.

      // BUT, updateBullets checks if horde.y < 100 to continue (skips spawn logic)?
      // "if (!horde.isActive || horde.y < 100) continue;"
      // My test horde has y: 0. So it skipped inserting into grid!
      horde.y = 200;

      updateBullets(entities, gameState, 1);

      expect(entities.bullets.length).toBe(0);
      expect(enemy.hp).toBe(9);
  });

  it('should shooting logic (updateShooting)', () => {
      const army: Army = {
          soldiers: [
              { x: 100, y: 700, size: 10, isAlive: true, type: 'normal' }
          ],
          centerX: 100,
          centerY: 700,
          lastShotTime: 0,
          fireRate: 0, // Instant
          damage: 1
      } as any;

      const entities: Entities = {
          bullets: [],
          enemyHordes: [
              { isActive: true, soldiers: [{ x: 100, y: 100, isAlive: true }], y: 100 }
          ],
          playerArmy: army,
          boss: null,
          miniBosses: [],
          mysteryBoxes: []
      } as any;

      const gameState: GameState = { isGameOver: false, isVictory: false } as any;

      updateShooting(entities, gameState);

      expect(entities.bullets.length).toBeGreaterThan(0);
  });

  it('should activate super cannon', () => {
      const gameState: GameState = {
          superCannonReady: true,
          superCannonLastUsed: 0,
          superCannonCooldown: 1000,
          superCannonActive: false
      } as any;

      activateSuperCannon(gameState);

      expect(gameState.superCannonActive).toBe(true);
      expect(gameState.superCannonReady).toBe(false);
  });

  it('should update super cannon', () => {
      const gameState: GameState = {
          superCannonActive: true,
          superCannonTimer: 100,
          superCannonReady: false,
          superCannonLastUsed: 0,
          superCannonCooldown: 1000,
          superCannonDamageMultiplier: 5,
          score: 0
      } as any;

      const entities: Entities = {
          playerArmy: { soldiers: [{ isAlive: true }], centerX: 100, centerY: 700, damage: 1 },
          enemyHordes: [
              { isActive: true, soldiers: [{ x: 100, y: 100, isAlive: true }], y: 100, count: 1 }
          ],
          boss: null
      } as any;

      updateSuperCannon(entities, gameState, 10);

      expect(gameState.superCannonTimer).toBe(90);
      expect(entities.enemyHordes[0].soldiers.length).toBe(0);
  });
});
