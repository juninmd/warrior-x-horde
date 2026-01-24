
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateShooting, updateBullets, activateSuperCannon, updateSuperCannon, createBullet } from '../src/shooting';
import { createPlayerArmy, createEnemyHorde, createSoldier, createBoss, createMiniBoss } from '../src/entities';
import { GameState, Entities } from '../src/types';
import { resetGameState, gameState } from '../src/gameState';
import * as renderer from '../src/renderer';
import * as pool from '../src/pool';
import { fastRemove } from '../src/utils';

// Mock dependencies
vi.mock('../src/renderer', () => ({
  render: vi.fn(),
  addFloatingText: vi.fn(),
  addExplosion: vi.fn(),
  addParticle: vi.fn(),
  getShareButtonBounds: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
  getWhatsAppButtonBounds: vi.fn(() => ({ x: 0, y: 0, width: 0, height: 0 })),
  shareOnX: vi.fn(),
  shareOnWhatsApp: vi.fn(),
  drawJoystick: vi.fn(), // If needed
}));

vi.mock('../src/pool', () => {
    return {
        ObjectPool: class {
            get() { return {}; }
            release() {}
        }
    }
});

// Mock fastRemove manually since it's a utility
vi.mock('../src/utils', async () => {
    const actual = await vi.importActual('../src/utils') as any;
    return {
        ...actual,
        // we can use actual fastRemove
    };
});


describe('Shooting - Full Coverage', () => {
  let entities: Entities;
  const BASE_WIDTH = 480;
  const BASE_HEIGHT = 800;

  beforeEach(() => {
    resetGameState();
    gameState.isStarted = true;
    entities = {
      playerArmy: createPlayerArmy(BASE_WIDTH, BASE_HEIGHT),
      enemyHordes: [],
      gates: [],
      mysteryBoxes: [],
      bullets: [],
      particles: [],
      floatingTexts: [],
      miniBosses: [],
      boss: null,
      coins: []
    };
    entities.playerArmy.centerX = 100;
    entities.playerArmy.centerY = 600;
    entities.playerArmy.soldiers = [createSoldier(100, 600, '#FFF', 1)];
  });

  describe('updateShooting', () => {
      it('should create bullets when enemies are nearby', () => {
          // Add horde nearby
          const horde = createEnemyHorde(200, 400, 10, 1); // x=100, y=400
          entities.enemyHordes.push(horde);

          // Force update time to allow shooting
          entities.playerArmy.lastShotTime = 0;
          entities.playerArmy.fireRate = 100; // Fast fire

          // Mock pool to return a valid bullet object structure
          // Override the mock implementation for this test
          const mockBullet = { x: 0, y: 0 };
          vi.spyOn(pool.ObjectPool.prototype, 'get').mockReturnValue(mockBullet as any);

          updateShooting(entities, gameState);

          expect(entities.bullets.length).toBeGreaterThan(0);
          expect(entities.bullets[0].targetY).toBeLessThan(entities.playerArmy.centerY);
      });

      it('should prioritize special units (Bucket Sort logic)', () => {
          entities.playerArmy.soldiers = [];
          // Add enough soldiers to ensure multiple shooters (shootersCount = ceil(total/5))
          // Need at least 15 soldiers to get 3 shooters? No, need 5 soldiers for 1 shooter.
          // Wait, logic is min(ceil(alive/5), 30).
          // If I want 3 shooters, I need 11 soldiers (ceil(11/5) = 3).

          // Add fillers
          for(let i=0; i<20; i++) {
             entities.playerArmy.soldiers.push(createSoldier(100, 600, '#FFF', 1, 'normal'));
          }

          // Add types in mixed order (these will be prioritized over the 20 normals)
          const laser = createSoldier(100, 600, '#0FF', 1, 'laser');
          const bazooka = createSoldier(100, 600, '#F00', 1, 'bazooka');
          const rambo = createSoldier(100, 600, '#0F0', 1, 'rambo');

          // Add them to army
          entities.playerArmy.soldiers.push(laser, bazooka, rambo);
          entities.playerArmy.aliveCount = entities.playerArmy.soldiers.length;

          const horde = createEnemyHorde(200, 400, 10, 1);
          entities.enemyHordes.push(horde);
          entities.playerArmy.lastShotTime = 0;

          // We spy on createBullet to see damage/speed arguments
          // But createBullet is exported from the module we are testing.
          // In unit tests, spying on internal function calls is hard unless we mock the module itself or split it.
          // Instead, check the created bullets properties.

          // Mock pool again
          vi.spyOn(pool.ObjectPool.prototype, 'get').mockImplementation(() => ({}) as any);

          updateShooting(entities, gameState);

          // We expect multiple bullets. Check damages.
          // Laser: x3, Bazooka: x5, Rambo: x1.5, Normal: x1
          // Base damage 3
          const damages = entities.bullets.map(b => b.damage);
          expect(damages).toContain(3 * 3); // Laser
          expect(damages).toContain(3 * 5); // Bazooka
          expect(damages).toContain(3 * 1.5); // Rambo
      });

      it('should handle different muzzle flashes', () => {
          entities.playerArmy.soldiers = [createSoldier(100, 600, '#FFF', 1, 'bazooka')];
          entities.enemyHordes.push(createEnemyHorde(200, 400, 10, 1));
          entities.playerArmy.lastShotTime = 0;

          updateShooting(entities, gameState);

          expect(renderer.addParticle).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'spark', '#F39C12', 2);
      });
  });

  describe('updateBullets', () => {
      it('should move bullets and remove if out of bounds', () => {
          const bullet = { x: 100, y: 100, speed: -10, isEnemy: false, damage: 1, targetX: 100, targetY: 0 };
          entities.bullets.push(bullet as any);

          updateBullets(entities, gameState, 1);

          expect(bullet.y).toBe(90); // 100 - 10

          // Move out of bounds
          bullet.y = -60;
          updateBullets(entities, gameState, 1);
          expect(entities.bullets.length).toBe(0);
      });

      it('should detect collision with Horde Soldier', () => {
          // Setup Bullet
          const bullet = { x: 100, y: 300, speed: -10, isEnemy: false, damage: 10, targetX: 100, targetY: 0 };
          entities.bullets.push(bullet as any);

          // Setup Horde with Soldier at same spot
          const horde = createEnemyHorde(200, 300, 1, 1); // x=100
          // Force soldier position exactly
          horde.soldiers[0].x = 100;
          horde.soldiers[0].y = 300;
          entities.enemyHordes.push(horde);

          // Mock enemyGrid behavior effectively?
          // updateBullets populates the grid.
          // We need to ensure spatial hash grid works or mock it.
          // Since we are testing updateBullets integration with grid, we let it run.
          // But 'spatial.ts' is real.

          updateBullets(entities, gameState, 1);

          expect(horde.soldiers.length).toBe(0); // Should die
          expect(entities.bullets.length).toBe(0); // Bullet removed
          expect(renderer.addFloatingText).toHaveBeenCalled();
      });

      it('should detect collision with MiniBoss', () => {
          const bullet = { x: 100, y: 300, speed: -10, isEnemy: false, damage: 10, targetX: 100, targetY: 0 };
          entities.bullets.push(bullet as any);

          const mb = createMiniBoss(200, 300, 1);
          mb.x = 80; // Width 80, so x covers 80 to 160
          mb.y = 280; // Height 80, covers 280 to 360
          entities.miniBosses.push(mb);

          updateBullets(entities, gameState, 1);

          expect(mb.hp).toBeLessThan(mb.maxHp);
          expect(entities.bullets.length).toBe(0);
      });

      it('should detect collision with Boss', () => {
          const bullet = { x: 100, y: 100, speed: -10, isEnemy: false, damage: 10, targetX: 100, targetY: 0 };
          entities.bullets.push(bullet as any);

          const boss = createBoss(200, 1);
          boss.x = 50; // Width 100 => 50 to 150
          boss.y = 50; // Height 100 => 50 to 150
          entities.boss = boss;

          updateBullets(entities, gameState, 1);

          expect(boss.hp).toBeLessThan(boss.maxHp);
          expect(entities.bullets.length).toBe(0);
      });

      it('should handle Boss Death (Victory)', () => {
          const bullet = { x: 100, y: 100, speed: -10, isEnemy: false, damage: 10000, targetX: 100, targetY: 0 };
          entities.bullets.push(bullet as any);
          const boss = createBoss(200, 10); // Mothership
          boss.x = 100; boss.y = 100; boss.hp = 1;
          entities.boss = boss;

          updateBullets(entities, gameState, 1);

          expect(boss.isActive).toBe(false);
          expect(gameState.isVictory).toBe(true);
      });
  });

  describe('Super Cannon', () => {
      it('should activate super cannon', () => {
          gameState.superCannonReady = true;
          gameState.superCannonLastUsed = 0;
          gameState.superCannonCooldown = 1000;

          activateSuperCannon(gameState);

          expect(gameState.superCannonActive).toBe(true);
          expect(gameState.superCannonReady).toBe(false);
      });

      it('should apply super cannon damage', () => {
          gameState.superCannonActive = true;
          gameState.superCannonTimer = 5000;
          entities.playerArmy.centerX = 100;

          // Enemy in beam
          const horde = createEnemyHorde(200, 100, 5, 1); // x=100

          // Clear soldiers and add manually to avoid random placement in beam
          horde.soldiers = [];

          // One IN beam
          const s1 = createSoldier(100, 50, '#F00', 1);
          // One OUT of beam (beam width 40 => 80 to 120)
          const s2 = createSoldier(150, 50, '#F00', 1);

          horde.soldiers.push(s1, s2);
          entities.enemyHordes.push(horde);

          updateSuperCannon(entities, gameState, 16);

          // S1 removed, S2 remains
          expect(horde.soldiers.length).toBe(1);
          expect(horde.soldiers[0].x).toBe(150);
      });

      it('should reset super cannon when timer ends', () => {
          gameState.superCannonActive = true;
          gameState.superCannonTimer = 10;
          updateSuperCannon(entities, gameState, 20);
          expect(gameState.superCannonActive).toBe(false);
      });
  });
});
