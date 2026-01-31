// tests/shooting_coverage.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateBullets, updateSuperCannon } from '../src/shooting';
import { GameState, Entities, Bullet } from '../src/types';

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

describe('Shooting Coverage', () => {
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
                fireRate: 0,
                damage: 1,
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

    it('should recharge Super Cannon after cooldown', () => {
        gameState.superCannonReady = false;
        gameState.superCannonLastUsed = Date.now() - 2000; // 2s ago
        gameState.superCannonCooldown = 1000; // 1s cooldown

        updateSuperCannon(entities, gameState, 16);

        expect(gameState.superCannonReady).toBe(true);
    });

    it('should kill Boss with Super Cannon', () => {
        gameState.superCannonActive = true;
        gameState.superCannonTimer = 100;
        entities.playerArmy.centerX = 100;
        entities.playerArmy.soldiers = [{ isAlive: true }] as any;

        // Boss in beam (x=100 +/- 20)
        const boss = {
            isActive: true,
            x: 80,
            y: 100,
            width: 40,
            height: 40,
            hp: 0.1, // Low HP to die instantly
            type: 'beast'
        };
        entities.boss = boss as any;

        updateSuperCannon(entities, gameState, 16);

        expect(boss.isActive).toBe(false);
        expect(gameState.isVictory).toBe(true);
    });

    it('should kill MiniBoss with bullets and trigger effects', () => {
        const bullet: Bullet = {
            x: 100, y: 100,
            targetX: 100, targetY: 100,
            speed: 0,
            damage: 20,
            isEnemy: false
        };
        entities.bullets = [bullet];

        const miniBoss = {
            isActive: true,
            x: 80, y: 80,
            width: 40, height: 40,
            hp: 10, // Die to 20 dmg
            hitTimer: 0
        };
        entities.miniBosses = [miniBoss] as any;

        updateBullets(entities, gameState, 1);

        expect(miniBoss.isActive).toBe(false);
        expect(gameState.score).toBeGreaterThan(0);

        // Run timers to trigger the explosion loop
        vi.advanceTimersByTime(200);
    });

    it('should kill Normal Boss with bullets and trigger effects', () => {
        const bullet: Bullet = {
            x: 100, y: 100,
            targetX: 100, targetY: 100,
            speed: 0,
            damage: 20,
            isEnemy: false
        };
        entities.bullets = [bullet];

        const boss = {
            isActive: true,
            x: 80, y: 80,
            width: 40, height: 40,
            hp: 10, // Die to 20 dmg
            hitTimer: 0,
            type: 'beast'
        };
        entities.boss = boss as any;

        updateBullets(entities, gameState, 1);

        expect(boss.isActive).toBe(false);
        expect(gameState.isVictory).toBe(true);

        // Run timers to trigger the explosion loop
        vi.advanceTimersByTime(1000);
    });
});
