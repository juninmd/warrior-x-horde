// Mock game.ts and renderer.ts
import { vi } from 'vitest';

vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    triggerHitStop: vi.fn(),
}));

vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(), updateFloatingTexts: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { updateBullets, createBullet, updateShooting, activateSuperCannon, updateSuperCannon } from '../src/shooting';
import { GameState, Entities, Army, Soldier, EnemyHorde, Boss, MiniBoss } from '../src/types';

describe('Shooting', () => {
  let gameState: GameState;
  let entities: Entities;

  beforeEach(() => {
      gameState = {
          score: 0,
          coins: 0,
          isGameOver: false,
          isVictory: false,
          superCannonReady: true,
          superCannonLastUsed: 0,
          superCannonCooldown: 1000,
          superCannonActive: false,
          superCannonTimer: 0,
          superCannonDuration: 100,
          superCannonDamageMultiplier: 1
      } as any;

      entities = {
          bullets: [],
          enemyHordes: [],
          playerArmy: {
              soldiers: [],
              centerX: 100,
              centerY: 700,
              lastShotTime: 0,
              fireRate: 0, // Instant
              damage: 1,
              aliveCount: 0
          } as any,
          boss: null,
          miniBosses: [],
          mysteryBoxes: [],
          weapons: [],
          gates: [],
          coins: []
      };
  });

  describe('Bullet Creation', () => {
      it('should create bullet', () => {
        const bullet = createBullet(10, 10, 0, 0, 5, false);
        expect(bullet).toBeDefined();
        expect(bullet.damage).toBe(5);
        expect(bullet.isEnemy).toBe(false);
      });
  });

  describe('updateShooting', () => {
      it('should prioritize special soldiers (Bucket Sort Logic)', () => {
          const laser = { x: 100, y: 700, size: 10, isAlive: true, type: 'laser' };
          const normal = { x: 100, y: 720, size: 10, isAlive: true, type: 'normal' };

          entities.playerArmy.soldiers = [normal, laser] as any;
          entities.playerArmy.aliveCount = 2;

          // Enemy to shoot at
          entities.enemyHordes = [{ isActive: true, soldiers: [{ x: 100, y: 100, isAlive: true }], y: 100 }] as any;

          updateShooting(entities, gameState);

          expect(entities.bullets.length).toBe(1);
          expect(entities.bullets[0].damage).toBe(3);
      });

      it('should respect fire rate', () => {
          entities.playerArmy.fireRate = 1000;
          entities.playerArmy.lastShotTime = Date.now();

          // Soldier
          entities.playerArmy.soldiers = [{ x: 100, y: 700, size: 10, isAlive: true, type: 'normal' }] as any;
          entities.playerArmy.aliveCount = 1;
          entities.enemyHordes = [{ isActive: true, soldiers: [{ x: 100, y: 100, isAlive: true }], y: 100 }] as any;

          updateShooting(entities, gameState);
          expect(entities.bullets.length).toBe(0);
      });
  });

  describe('findNearestTarget', () => {
      it('should target nearest enemy', () => {
          entities.playerArmy.soldiers = [{ x: 100, y: 700, isAlive: true, type: 'normal' }] as any;
          entities.playerArmy.aliveCount = 1;

          const farEnemy = { x: 100, y: 100, isAlive: true };
          const nearEnemy = { x: 100, y: 600, isAlive: true };

          entities.enemyHordes = [
              { isActive: true, soldiers: [farEnemy], y: 100 },
              { isActive: true, soldiers: [nearEnemy], y: 600 }
          ] as any;

          updateShooting(entities, gameState);

          const bullet = entities.bullets[0];
          expect(bullet.targetY).toBe(600);
      });

      it('should target boss', () => {
          entities.playerArmy.soldiers = [{ x: 100, y: 700, isAlive: true, type: 'normal' }] as any;
          entities.playerArmy.aliveCount = 1;
          entities.boss = { isActive: true, x: 80, y: 600, width: 40, height: 40 } as any;

          updateShooting(entities, gameState);
          const bullet = entities.bullets[0];
          expect(bullet.targetY).toBe(620); // Center of boss
      });

       it('should target miniboss', () => {
          entities.playerArmy.soldiers = [{ x: 100, y: 700, isAlive: true, type: 'normal' }] as any;
          entities.playerArmy.aliveCount = 1;
          entities.miniBosses = [{ isActive: true, x: 80, y: 600, width: 40, height: 40 }] as any;

          updateShooting(entities, gameState);
          const bullet = entities.bullets[0];
          expect(bullet.targetY).toBe(620);
      });
  });

  describe('updateBullets', () => {
      it('should move and remove bullets out of bounds', () => {
          const bullet = createBullet(0, 0, 100, 100, 1, false);
          bullet.speed = -10;
          entities.bullets = [bullet];

          updateBullets(entities, gameState, 1);
          expect(bullet.y).toBe(-10);

          bullet.y = -100;
          updateBullets(entities, gameState, 1);
          expect(entities.bullets.length).toBe(0);
      });

      it('should detect bullet collision with horde soldier (shared HP)', () => {
          const bullet = createBullet(100, 100, 100, 50, 1, false);
          const enemy = { x: 100, y: 100, size: 10, isAlive: true, hp: 10 };
          const horde = { isActive: true, soldiers: [enemy], count: 1, y: 100, hp: 10, maxHp: 10 };

          entities.bullets = [bullet];
          entities.enemyHordes = [horde] as any;

          updateBullets(entities, gameState, 1);

          expect(entities.bullets.length).toBe(0); // Hit
          expect(horde.hp).toBe(9);
      });

      it('should kill multiple soldiers if damage exceeds HP', () => {
          const bullet = createBullet(100, 100, 100, 50, 20, false); // 20 damage
          // 2 soldiers, 10 hp each.
          const s1 = { x: 100, y: 100, size: 10, isAlive: true, hp: 10 };
          const s2 = { x: 110, y: 100, size: 10, isAlive: true, hp: 10 };

          const horde = { isActive: true, soldiers: [s1, s2], count: 2, y: 100, hp: 20, maxHp: 20 };
          entities.bullets = [bullet];
          entities.enemyHordes = [horde] as any;

          updateBullets(entities, gameState, 1);

          expect(horde.hp).toBe(0);
          expect(horde.isActive).toBe(false);
      });

      it('should damage boss (normal)', () => {
          // Bullet at 105. Moves -12 -> 93. Boss Y 90, H 20 (90-110). Hit.
          const bullet = createBullet(100, 105, 100, 50, 5, false);
          bullet.speed = -12; // Ensure speed is set (though createBullet does it)
          const boss = { isActive: true, x: 90, y: 90, width: 20, height: 20, hp: 100, type: 'beast' };

          entities.bullets = [bullet];
          entities.boss = boss as any;

          updateBullets(entities, gameState, 1);

          expect(entities.bullets.length).toBe(0);
          expect(boss.hp).toBe(95);
      });

      it('should damage boss (mothership - circular hitbox)', () => {
          // Bullet 105 -> 93. Mothership Y 100. Center. Hit.
          const bullet = createBullet(100, 105, 100, 50, 5, false);
          bullet.speed = -12;
          const boss = { isActive: true, x: 100, y: 100, width: 140, height: 140, hp: 100, type: 'mothership' };

          entities.bullets = [bullet];
          entities.boss = boss as any;

          updateBullets(entities, gameState, 1);
          expect(entities.bullets.length).toBe(0);
          expect(boss.hp).toBe(95);
      });

      it('should damage miniboss', () => {
          // Bullet 105 -> 93. Mb Y 90, H 20. Hit.
          const bullet = createBullet(100, 105, 100, 50, 5, false);
          bullet.speed = -12;
          const mb = { isActive: true, x: 90, y: 90, width: 20, height: 20, hp: 10 };

          entities.bullets = [bullet];
          entities.miniBosses = [mb] as any;

          updateBullets(entities, gameState, 1);
          expect(mb.hp).toBe(5);
      });
  });

  describe('Super Cannon', () => {
      it('should activate', () => {
          activateSuperCannon(gameState);
          expect(gameState.superCannonActive).toBe(true);
          expect(gameState.superCannonReady).toBe(false);
      });

      it('should damage enemies in beam', () => {
          gameState.superCannonActive = true;
          gameState.superCannonTimer = 100;
          entities.playerArmy.centerX = 100;
          entities.playerArmy.centerY = 700;
          entities.playerArmy.soldiers = [{ isAlive: true }] as any; // Must have soldiers

          const horde = {
              isActive: true,
              soldiers: [{ x: 100, y: 100, isAlive: true }],
              y: 100,
              count: 1
          };
          entities.enemyHordes = [horde] as any;

          updateSuperCannon(entities, gameState, 10);

          expect(horde.soldiers.length).toBe(0);
          expect(horde.isActive).toBe(false);
      });

      it('should damage boss in beam', () => {
          gameState.superCannonActive = true;
          gameState.superCannonTimer = 100;
          entities.playerArmy.centerX = 100;
          entities.playerArmy.centerY = 700;
          entities.playerArmy.soldiers = [{ isAlive: true }] as any; // Must have soldiers

          const boss = { isActive: true, x: 80, y: 100, width: 40, hp: 100 }; // Center x=100
          entities.boss = boss as any;

          updateSuperCannon(entities, gameState, 10);

          expect(boss.hp).toBeLessThan(100);
      });
  });
});
