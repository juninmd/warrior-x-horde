import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateShooting, updateBullets } from '../src/shooting';
import { GameState, Entities, Bullet, Soldier, EnemyHorde, MiniBoss, Boss } from '../src/types';
import * as renderer from '../src/renderer';

// Mocks
vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
}));

vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    triggerHitStop: vi.fn(),
}));

describe('Shooting Advanced Coverage', () => {
    let gameState: GameState;
    let entities: Entities;

    beforeEach(() => {
        gameState = {
            score: 0,
            coins: 0,
            isGameOver: false,
            isVictory: false,
            superCannonReady: false,
            superCannonLastUsed: 0,
            superCannonCooldown: 1000,
            superCannonActive: false,
            superCannonTimer: 0,
            superCannonDuration: 100,
            superCannonDamageMultiplier: 1,
            gameSpeed: 1
        } as any;

        entities = {
            bullets: [],
            enemyHordes: [],
            playerArmy: {
                soldiers: [],
                centerX: 100,
                centerY: 700,
                lastShotTime: 0,
                fireRate: 100, // Make it ready to shoot if diff is > 100
                damage: 10,
                aliveCount: 1
            } as any,
            boss: null,
            miniBosses: [],
            mysteryBoxes: [],
            weapons: [],
            gates: [],
            coins: []
        };

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should find nearest target (Horde) and shoot', () => {
        const soldier: Soldier = { id: 1, x: 100, y: 700, isAlive: true, type: 'normal', isSuper: false } as any;
        entities.playerArmy.soldiers = [soldier];
        entities.playerArmy.aliveCount = 1;
        entities.playerArmy.lastShotTime = Date.now() - 200; // Ready to shoot

        const horde: EnemyHorde = {
            id: 1, x: 100, y: 500, width: 100, height: 100,
            soldiers: [{ isAlive: true } as any],
            count: 1, isActive: true, maxHp: 100, hp: 100, type: 'normal'
        };
        entities.enemyHordes = [horde];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBeGreaterThan(0);
        const bullet = entities.bullets[0];
        expect(bullet.targetY).toBeLessThan(700);
        // It should add muzzle flash
        expect(renderer.addParticle).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'spark', expect.any(String), expect.any(Number));
    });

    it('should handle different weapon types (Bazooka)', () => {
        const soldier: Soldier = { id: 1, x: 100, y: 700, isAlive: true, type: 'bazooka', isSuper: false } as any;
        entities.playerArmy.soldiers = [soldier];
        entities.playerArmy.aliveCount = 1;
        entities.playerArmy.lastShotTime = Date.now() - 200;

        // Target
        entities.enemyHordes = [{
            isActive: true, x: 100, y: 500, width: 100, height: 100,
            soldiers: [{ isAlive: true } as any], count: 1
        } as any];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBeGreaterThan(0);
        const bullet = entities.bullets[0];
        expect(bullet.damage).toBe(entities.playerArmy.damage * 5); // Bazooka 5x
        expect(renderer.addParticle).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'spark', '#F39C12', 2);
    });

    it('should handle different weapon types (Laser)', () => {
        const soldier: Soldier = { id: 1, x: 100, y: 700, isAlive: true, type: 'laser', isSuper: false } as any;
        entities.playerArmy.soldiers = [soldier];
        entities.playerArmy.aliveCount = 1;
        entities.playerArmy.lastShotTime = Date.now() - 200;

        entities.enemyHordes = [{
            isActive: true, x: 100, y: 500, width: 100, height: 100,
            soldiers: [{ isAlive: true } as any], count: 1
        } as any];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBeGreaterThan(0);
        const bullet = entities.bullets[0];
        expect(bullet.damage).toBe(entities.playerArmy.damage * 3); // Laser 3x
        expect(bullet.speed).toBe(-25);
    });

    it('should hit mothership boss (circular hitbox)', () => {
        const boss: Boss = {
            isActive: true, x: 100, y: 100, width: 140, height: 140,
            hp: 1000, type: 'mothership', hitTimer: 0
        };
        entities.boss = boss;

        const bullet: Bullet = {
            x: 100, y: 100, // Center hit
            targetX: 100, targetY: 0,
            speed: 0, damage: 10, isEnemy: false
        };
        entities.bullets = [bullet];

        updateBullets(entities, gameState, 1);

        expect(boss.hp).toBe(990);
        expect(renderer.addExplosion).toHaveBeenCalledWith(100, 100, '#00FF88');
        expect(entities.bullets.length).toBe(0); // Bullet removed
    });

    it('should overkill horde soldiers', () => {
        const horde: EnemyHorde = {
            id: 1, x: 100, y: 500, width: 100, height: 100,
            soldiers: [
                { isAlive: true, x: 100, y: 500, size: 5, hp: 10 },
                { isAlive: true, x: 105, y: 500, size: 5, hp: 10 },
                { isAlive: true, x: 110, y: 500, size: 5, hp: 10 }
            ] as any,
            count: 3, isActive: true, maxHp: 30, hp: 5, // HP 5 < avg HP 10. Should kill multiple?
            type: 'normal'
        };
        // Set HP very low to force multiple kills logic?
        // Logic: targetAliveCount = ceil(hp / safeAvgHp).
        // if hp=5, avg=10 -> target=1. current=3. toKill=2.

        entities.enemyHordes = [horde];

        const bullet: Bullet = {
            x: 100, y: 500,
            targetX: 100, targetY: 0,
            speed: 0, damage: 50, isEnemy: false // High damage to trigger logic
        };
        entities.bullets = [bullet];

        updateBullets(entities, gameState, 1);

        expect(horde.soldiers.filter(s => s.isAlive).length).toBeLessThan(3);
    });

    it('should kill MiniBoss with critical hit', () => {
        const miniBoss: MiniBoss = {
            isActive: true, x: 100, y: 100, width: 40, height: 40,
            hp: 1, hitTimer: 0
        };
        entities.miniBosses = [miniBoss];

        const bullet: Bullet = {
            x: 110, y: 110,
            targetX: 110, targetY: 110,
            speed: 0, damage: 100, isEnemy: false // Critical damage
        };
        entities.bullets = [bullet];

        updateBullets(entities, gameState, 1);

        expect(miniBoss.isActive).toBe(false);
        // Should trigger explosions
        expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringMatching(/^\d+$/), expect.any(Number), expect.any(Number), '#FFF', 0.8);
    });
});
