
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState, Army, EnemyHorde, Boss, MiniBoss, Soldier, Bullet, Weapon } from '../src/types';
import * as shooting from '../src/shooting';
import * as spawner from '../src/spawner';
import * as weapons from '../src/weapons';
import * as rendererUtils from '../src/renderer-utils';
import * as uiOverlay from '../src/ui-overlay';
import { virtualJoystick } from '../src/input';

// Mock DOM
document.body.innerHTML = `
  <div id="gameCanvas"></div>
  <div id="shopContainer"></div>
  <div id="superCannonContainer"></div>
  <div id="gameOverContainer"></div>
`;

const canvas = document.createElement('canvas');
canvas.id = 'gameCanvas';
canvas.getContext = vi.fn().mockReturnValue({
  measureText: vi.fn().mockReturnValue({ width: 10 }),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  setLineDash: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  roundRect: vi.fn(),
  fillText: vi.fn(),
}) as any;
document.body.appendChild(canvas);

// Break circular dependency shooting -> game -> shooting
vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    triggerHitStop: vi.fn(),
    canvas: document.createElement('canvas'), // Minimal mock
}));

// Mock Renderer to verify calls
vi.mock('../src/renderer', async () => {
    const actual = await vi.importActual('../src/renderer');
    return {
        ...actual,
        addFloatingText: vi.fn(),
        addExplosion: vi.fn(),
        addParticle: vi.fn(),
    };
});

describe('Extra Coverage Part 2', () => {

    describe('Renderer Utils', () => {
         it('should draw joystick stick clamped to radius', () => {
             const ctx = canvas.getContext('2d')!;
             // Set up joystick state so distance > maxRadius
             // start: 100, 100. current: 200, 200. dist ~141. maxRadius: 50.
             virtualJoystick.active = true;
             virtualJoystick.startX = 100;
             virtualJoystick.startY = 100;
             virtualJoystick.currentX = 200;
             virtualJoystick.currentY = 200;
             virtualJoystick.alpha = 1;

             rendererUtils.drawJoystick(ctx);

             expect(ctx.beginPath).toHaveBeenCalled();
         });
    });

    describe('Shooting', () => {
        it('should break bucket sort loop if needed satisfied', () => {
             const army: Army = {
                soldiers: Array(20).fill(null).map((_, i) => ({
                    id: i, x: 100, type: 'laser', isAlive: true, y: 100 + i // Sorted by Y
                } as any)),
                aliveCount: 20,
                centerX: 100, centerY: 100,
                radius: 50, damage: 1, fireRate: 0, lastShotTime: 0
            };
            const entities: any = {
                playerArmy: army,
                enemyHordes: [{ isActive: true, x: 100, y: 50, soldiers: [{isAlive:true}], width: 100, height: 100 }],
                boss: null, miniBosses: [], bullets: []
            };
            const gs: any = { isGameOver: false, isVictory: false };

            shooting.updateShooting(entities, gs);
            // Verify bullets created
            expect(entities.bullets.length).toBeGreaterThan(0);
        });

        it('should set custom bullet speed for Laser', () => {
             const army: Army = {
                soldiers: [{ id: 1, x: 100, y: 100, type: 'laser', isAlive: true, isSuper: false } as any],
                aliveCount: 1,
                centerX: 100, centerY: 100,
                radius: 50, damage: 1, fireRate: 0, lastShotTime: 0
            };
            const entities: any = {
                playerArmy: army,
                enemyHordes: [{ isActive: true, x: 100, y: 50, soldiers: [{isAlive:true}], width: 100, height: 100 }],
                boss: null, miniBosses: [], bullets: []
            };
            const gs: any = { isGameOver: false, isVictory: false };

            shooting.updateShooting(entities, gs);
            expect(entities.bullets[0].speed).toBe(-25);
        });

        it('should handle splash damage/kill multiple soldiers in horde', () => {
             // Create a bullet and a horde with weak soldiers
             const bullet: Bullet = { x: 100, y: 100, speed: 10, damage: 100, isEnemy: false, targetX:0, targetY:0 };
             const horde: EnemyHorde = {
                 x: 100, y: 100, width: 50, height: 50, isActive: true,
                 hp: 10, maxHp: 100, count: 5,
                 soldiers: Array(5).fill(null).map((_,i) => ({ x: 100, y: 100, size: 10, isAlive: true, hp: 1 } as any))
             } as any;

             const entities: any = {
                 bullets: [bullet],
                 enemyHordes: [horde],
                 miniBosses: [],
                 boss: null,
                 playerArmy: { soldiers: [] },
                 mysteryBoxes: []
             };

             shooting.updateBullets(entities, { score: 0, coins: 0 } as any, 1);

             expect(horde.soldiers.length).toBe(0);
             expect(horde.isActive).toBe(false);
        });

        it('should handle Mothership death', () => {
            const bullet: Bullet = { x: 100, y: 100, speed: 10, damage: 100, isEnemy: false, targetX:0, targetY:0 };
            const boss: Boss = {
                type: 'mothership', x: 100, y: 100, width: 50, height: 50, hp: 10, maxHp: 100, isActive: true,
                spawnTime: 0, hitTimer: 0, isMoving: false
            } as any;

             const entities: any = {
                 bullets: [bullet],
                 enemyHordes: [],
                 miniBosses: [],
                 boss: boss,
                 playerArmy: { soldiers: [] },
                 mysteryBoxes: []
             };
             const gs: any = { score: 0, isVictory: false };

             shooting.updateBullets(entities, gs, 1);
             expect(boss.isActive).toBe(false);
             expect(gs.isVictory).toBe(true);
             expect(gs.score).toBeGreaterThanOrEqual(5000);
        });
    });

    describe('Spawner', () => {
         it('should spawn enemies when count > 0', () => {
             const entities: any = { enemyHordes: [], playerArmy: { aliveCount: 1, soldiers: [{isAlive:true}] } };
             const gs: any = { currentLevel: 1 };

             vi.spyOn(Math, 'random').mockReturnValue(0.001);

             spawner.spawnEnemies(entities, 400, gs, 800, 1);

             expect(entities.enemyHordes.length).toBe(1);
         });

         it('should spawn mini-bosses aggressively for level > 11', () => {
              const entities: any = { miniBosses: [], boss: null };
              const gs: any = { currentLevel: 15, levelDistance: 1000, distanceTraveled: 100 };

              gs.distanceTraveled = 200;

              spawner.spawnMiniBoss(entities, 400, gs, 800);
              expect(entities.miniBosses.length).toBeGreaterThan(0);
         });
    });

    describe('UI Overlay', () => {
        it('should render correct HTML for Shop buttons', () => {
            const onBuy = vi.fn();
            uiOverlay.setupShopUI(onBuy);

            const soldierBtn = document.getElementById('shopContainer')?.querySelector('button') as HTMLButtonElement;
            expect(soldierBtn.innerHTML).toContain('🛡️');

             const btns = document.getElementById('shopContainer')?.querySelectorAll('button');
             const nukeBtn = btns?.[4];
             expect(nukeBtn?.innerHTML).toContain('NUKE');
        });

        it('should handle Super Cannon click', () => {
             const onActivate = vi.fn();
             uiOverlay.setupSuperCannonUI(onActivate);

             const btn = document.getElementById('superCannonBtn') as HTMLButtonElement;
             btn.click();
             expect(onActivate).toHaveBeenCalled();
        });

        it('should render Leaderboard in Game Over screen', () => {
             // Mock localStorage
             const leaderboard = [{ score: 100, date: 0 }];
             const spy = vi.spyOn(window.localStorage, 'getItem').mockReturnValue(JSON.stringify(leaderboard));

             const onRestart = vi.fn();
             uiOverlay.setupGameOverUI(onRestart, vi.fn());

             const gs: any = { score: 100, highScore: 100, maxCombo: 10, isVictory: false, currentLevel: 1, totalKills: 0, runStartTime: Date.now() };
             uiOverlay.showGameOverScreen(gs);

             const container = document.getElementById('gameOverContainer');
             expect(container?.innerHTML).toContain('Top Commanders');
             expect(container?.innerHTML).toContain('🥇');
             expect(container?.innerHTML).toContain('100');

             spy.mockRestore();
        });
    });

    describe('Weapons', () => {
        it('should ignore passed weapons in collision check', () => {
             const army: any = { centerX: 100, centerY: 100 };
             const weapon: any = { passed: true, x: 100, y: 100 };
             expect(weapons.checkWeaponCollision(army, weapon)).toBe(false);
        });
    });
});
