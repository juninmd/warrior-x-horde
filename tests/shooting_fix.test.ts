import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBullet, updateShooting } from '../src/shooting';
import { GameState, Entities, Soldier, EnemyHorde, Boss, MiniBoss } from '../src/types';
import * as renderer from '../src/renderer';

vi.mock('../src/renderer', () => ({
    addParticle: vi.fn(),
    render: vi.fn(),
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    shareOnX: vi.fn(),
    shareOnWhatsApp: vi.fn(),
    updateFloatingTexts: vi.fn(),
}));

vi.mock('../src/audio', () => ({
    playSound: vi.fn(),
    initAudio: vi.fn(),
    playMusic: vi.fn(),
    stopAllMusic: vi.fn(),
    toggleMute: vi.fn(),
    isMusicMuted: vi.fn(() => false),
    audioManager: {
        powerUp: {} as any,
        nerf: {} as any,
        gameMusic: {} as any,
        bossMusic: {} as any,
        gameStart: {} as any,
        gameOver: {} as any,
        superCannon: {} as any,
        victory: {} as any,
    },
}));

vi.mock('../src/input', () => ({
    setupInput: vi.fn(),
    initializeMousePosition: vi.fn(),
    getMouseX: vi.fn(() => 0),
    setGameStateRef: vi.fn(),
    setInputScale: vi.fn(),
    vibrate: vi.fn(),
}));

describe('Shooting Fix Coverage', () => {
    let gameState: GameState;
    let entities: Entities;

    beforeEach(() => {
        gameState = {
            isGameOver: false,
            isVictory: false,
        } as any;
        entities = {
            bullets: [],
            enemyHordes: [],
            miniBosses: [],
            boss: null,
            playerArmy: {
                soldiers: [],
                centerX: 100,
                centerY: 700,
                lastShotTime: 0,
                fireRate: 100,
                damage: 1,
                aliveCount: 1
            } as any
        } as any;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should create bullet with isEnemy=true', () => {
        const bullet = createBullet(0, 0, 0, 0, 1, true);
        expect(bullet.isEnemy).toBe(true);
        expect(bullet.speed).toBeGreaterThan(0); // 3
    });

    it('should skip hordes that are inactive or empty in findNearestTarget', () => {
        const shooter = { x: 100, y: 700 } as any;
        // Horde 1: Inactive
        const h1: EnemyHorde = { isActive: false, soldiers: [{ isAlive: true }], x: 100, y: 500 } as any;
        // Horde 2: Empty
        const h2: EnemyHorde = { isActive: true, soldiers: [], x: 100, y: 500 } as any;

        entities.enemyHordes = [h1, h2];
        entities.playerArmy.soldiers = [{ ...shooter, isAlive: true, type: 'normal' }];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBe(0);
    });

    it('should find nearest target correctly (branch coverage for dist check - True case)', () => {
        const shooter = { x: 100, y: 700 } as any;
        // H1 Far (checked first), H2 Near (checked second) -> updates nearest
        const h1: EnemyHorde = { isActive: true, soldiers: [{ isAlive: true }], x: 100, y: 200, width: 50, height: 50 } as any;
        const h2: EnemyHorde = { isActive: true, soldiers: [{ isAlive: true }], x: 100, y: 500, width: 50, height: 50 } as any;

        entities.enemyHordes = [h1, h2];
        entities.playerArmy.soldiers = [{ ...shooter, isAlive: true, type: 'normal' }];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBe(1);
        expect(entities.bullets[0].targetY).toBeGreaterThan(300);
    });

    it('should find nearest target correctly (branch coverage for dist check - False case)', () => {
        const shooter = { x: 100, y: 700 } as any;
        // H1 Near (checked first), H2 Far (checked second) -> H2 dist < H1 dist is False
        const h1: EnemyHorde = { isActive: true, soldiers: [{ isAlive: true }], x: 100, y: 500, width: 50, height: 50 } as any;
        const h2: EnemyHorde = { isActive: true, soldiers: [{ isAlive: true }], x: 100, y: 200, width: 50, height: 50 } as any;

        entities.enemyHordes = [h1, h2];
        entities.playerArmy.soldiers = [{ ...shooter, isAlive: true, type: 'normal' }];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBe(1);
        // Should target H1 (y ~ 500)
        expect(entities.bullets[0].targetY).toBeGreaterThan(300);
    });

    it('should find nearest miniboss correctly (branch coverage)', () => {
        const shooter = { x: 100, y: 700 } as any;
        const mb1: MiniBoss = { isActive: true, x: 100, y: 200, width: 50, height: 50 } as any;
        const mb2: MiniBoss = { isActive: true, x: 100, y: 500, width: 50, height: 50 } as any;

        entities.miniBosses = [mb1, mb2];
        entities.playerArmy.soldiers = [{ ...shooter, isAlive: true, type: 'normal' }];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBe(1);
        expect(entities.bullets[0].targetY).toBeGreaterThan(400);
    });

    it('should find nearest miniboss correctly (False branch)', () => {
        const shooter = { x: 100, y: 700 } as any;
        // MB1 Near, MB2 Far
        const mb1: MiniBoss = { isActive: true, x: 100, y: 500, width: 50, height: 50 } as any;
        const mb2: MiniBoss = { isActive: true, x: 100, y: 200, width: 50, height: 50 } as any;

        entities.miniBosses = [mb1, mb2];
        entities.playerArmy.soldiers = [{ ...shooter, isAlive: true, type: 'normal' }];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBe(1);
        expect(entities.bullets[0].targetY).toBeGreaterThan(400);
    });

    it('should ignore MiniBoss behind shooter', () => {
        const shooter = { x: 100, y: 700 } as any;
        const mb: MiniBoss = { isActive: true, x: 100, y: 800, width: 50, height: 50 } as any; // Behind

        entities.miniBosses = [mb];
        entities.playerArmy.soldiers = [{ ...shooter, isAlive: true, type: 'normal' }];

        updateShooting(entities, gameState);
        expect(entities.bullets.length).toBe(0);
    });

    it('should ignore Boss behind shooter', () => {
        const shooter = { x: 100, y: 700 } as any;
        const boss: Boss = { isActive: true, x: 100, y: 800, width: 50, height: 50 } as any; // Behind

        entities.boss = boss;
        entities.playerArmy.soldiers = [{ ...shooter, isAlive: true, type: 'normal' }];

        updateShooting(entities, gameState);
        expect(entities.bullets.length).toBe(0);
    });

    it('should handle bucket sort flow with missing types', () => {
        // Only normal soldiers
        entities.playerArmy.soldiers = [
            { type: 'normal', isAlive: true, x: 100, y: 700 } as any
        ];
        entities.playerArmy.aliveCount = 1;
        entities.enemyHordes = [{ isActive: true, soldiers: [{ isAlive: true }], x: 100, y: 500, width: 50, height: 50 } as any];

        updateShooting(entities, gameState);
        expect(entities.bullets.length).toBeGreaterThan(0);
        // Hits "if (bucket.length === 0) continue" for lasers, bazookas, etc.
    });

    it('should handle bucket sort where shootersCount is satisfied early', () => {
        // Need shootersCount to be small. 1 soldier = 1 shooter.
        // We add 2 types. 1st type (Laser) satisfies count. 2nd type (Normal) skipped.
        const laser = { type: 'laser', isAlive: true, x: 100, y: 700 } as any;
        const normal = { type: 'normal', isAlive: true, x: 100, y: 700 } as any;
        entities.playerArmy.soldiers = [laser, normal];
        entities.playerArmy.aliveCount = 2; // Shooters count = ceil(2/5) = 1.

        entities.enemyHordes = [{ isActive: true, soldiers: [{ isAlive: true }], x: 100, y: 500, width: 50, height: 50 } as any];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBe(1);
        expect(entities.bullets[0].damage).toBeGreaterThan(1); // Laser has high damage
        // "if (needed <= 0) break" should be hit
    });
});
