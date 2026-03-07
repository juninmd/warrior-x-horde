import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createBoss, createSoldier } from '../src/entities';
import { updateShooting, createBullet } from '../src/shooting';
import { checkCollisions } from '../src/collisions';
import { virtualJoystick, setupInput } from '../src/input';
import { GameState, Entities, EnemyHorde, Soldier } from '../src/types';
import * as renderer from '../src/renderer';
import * as audio from '../src/audio';

// Mocks
vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
    render: vi.fn(),
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

vi.mock('../src/input', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        vibrate: vi.fn(),
    };
});

describe('Final Coverage Fixes', () => {
    let gameState: GameState;
    let entities: Entities;

    beforeEach(() => {
        vi.useFakeTimers();
        gameState = {
            score: 0,
            coins: 0,
            combo: 0,
            maxCombo: 0,
            comboTimer: 0,
            damageFlash: 0,
            isBattling: false,
            currentLevel: 1,
            highScore: 100,
            isVictory: false,
            isGameOver: false,
            isStarted: true,
            isPaused: false,
            gameSpeed: 1,
            superCannonReady: false,
            superCannonLastUsed: 0,
            superCannonCooldown: 1000,
        } as any;

        entities = {
            playerArmy: {
                soldiers: [],
                centerX: 100,
                centerY: 700,
                aliveCount: 0,
                radius: 20,
                lastShotTime: 0,
                fireRate: 100,
                damage: 1,
            } as any,
            enemyHordes: [],
            gates: [],
            bullets: [],
            miniBosses: [],
            mysteryBoxes: [],
            coins: [],
            boss: null
        } as any;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should create all boss types (Levels 1-10)', () => {
        const types = new Set<string>();
        for (let i = 1; i <= 10; i++) {
            const boss = createBoss(480, i);
            types.add(boss.type);
            if (i === 10) {
                expect(boss.type).toBe('mothership');
            } else {
                expect(boss.type).not.toBe('mothership');
            }
        }
        // Ensure variety
        expect(types.size).toBeGreaterThan(5);
    });

    it('should handle shooting targeting edge cases (Behind, Too Far)', () => {
        const shooter = createSoldier(100, 700, '#FFF');
        entities.playerArmy.soldiers = [shooter];
        entities.playerArmy.aliveCount = 1;
        entities.playerArmy.lastShotTime = Date.now() - 1000;

        // Horde 1: Behind shooter (y > shooter.y) - Should be ignored
        const hordeBehind: EnemyHorde = {
            id: 1, x: 100, y: 800, width: 50, height: 50,
            soldiers: [{ isAlive: true } as any], count: 1, isActive: true,
            maxHp: 10, hp: 10, type: 'normal'
        };

        // Horde 2: Too far (dist > 750) - Should be ignored
        const hordeFar: EnemyHorde = {
            id: 2, x: 100, y: -100, width: 50, height: 50, // dy = 800 > 750
            soldiers: [{ isAlive: true } as any], count: 1, isActive: true,
            maxHp: 10, hp: 10, type: 'normal'
        };

        entities.enemyHordes = [hordeBehind, hordeFar];

        updateShooting(entities, gameState);

        // Should NOT shoot
        expect(entities.bullets.length).toBe(0);
    });

    it('should handle shooting bucket sort with mixed army', () => {
        // Add one of each type
        const types: Soldier['type'][] = ['normal', 'bazooka', 'rambo', 'laser'];
        entities.playerArmy.soldiers = types.map((t, i) => {
            const s = createSoldier(100 + i * 10, 700, '#FFF', 1, t);
            if (t === 'normal' && i === 0) s.isSuper = true; // Make one super
            return s;
        });
        entities.playerArmy.aliveCount = entities.playerArmy.soldiers.length;
        entities.playerArmy.lastShotTime = Date.now() - 1000;

        // Valid target
        entities.enemyHordes = [{
            id: 1, x: 100, y: 500, width: 50, height: 50,
            soldiers: [{ isAlive: true } as any], count: 1, isActive: true,
            maxHp: 10, hp: 10, type: 'normal'
        }];

        updateShooting(entities, gameState);

        expect(entities.bullets.length).toBeGreaterThan(0);
        // Verify bullet properties if possible, but mainly coverage of the loop
    });

    it('should handle horde clear combo calculation in collisions', () => {
        const horde: EnemyHorde = {
            id: 1, x: 100, y: 700, width: 50, height: 50,
            soldiers: [], // Empty
            count: 0, isActive: true, maxHp: 10, hp: 0, type: 'normal'
        };
        entities.enemyHordes = [horde];
        entities.playerArmy.soldiers = [createSoldier(100, 700, '#FFF')];
        entities.playerArmy.aliveCount = 1;
        entities.playerArmy.centerX = 100; // Overlap

        // Trigger collision
        checkCollisions(entities, gameState);

        expect(horde.isActive).toBe(false);
        // This hits the `if (horde.soldiers.length <= 0)` block
    });

    it('should cover virtual joystick delta calculation', () => {
        virtualJoystick.active = false;
        // Covered via ignore?

        virtualJoystick.start(100, 100);
        expect(virtualJoystick.active).toBe(true);

        virtualJoystick.move(101, 101); // Small move < deadZone (2)
        expect(virtualJoystick.getDeltaX()).toBe(0);

        virtualJoystick.move(120, 100); // > deadZone
        expect(virtualJoystick.getDeltaX()).toBe(20);

        virtualJoystick.end();
        expect(virtualJoystick.active).toBe(false);
    });
});
