// Mock dependencies
import { vi } from 'vitest';

vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    togglePause: vi.fn(),
    triggerHitStop: vi.fn(),
}));

vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
}));

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
}));

vi.mock('../src/audio', () => ({
    playSound: vi.fn(),
    audioManager: {
        powerUp: {},
        nerf: {},
        gameMusic: {},
        bossMusic: {}
    }
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import { GameState, Entities, Army, Gate, Soldier, MysteryBox, EnemyHorde, MiniBoss, Boss } from '../src/types';

describe('Collisions', () => {
    let entities: Entities;
    let gameState: GameState;
    let army: Army;

    beforeEach(() => {
        army = {
            soldiers: [
                { x: 100, y: 100, size: 10, isAlive: true, hp: 1, type: 'normal' }
            ],
            centerX: 100,
            centerY: 100,
            aliveCount: 1,
            damage: 1,
            fireRate: 100
        } as any;

        gameState = {
            coins: 0,
            score: 0,
            combo: 0,
            maxCombo: 0,
            comboTimer: 0,
            damageFlash: 0,
            isBattling: false,
            currentLevel: 1,
            highScore: 0
        } as any;

        entities = {
            playerArmy: army,
            coins: [],
            gates: [],
            enemyHordes: [],
            mysteryBoxes: [],
            miniBosses: [],
            boss: null,
            bullets: [],
            weapons: []
        } as any;

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Coins', () => {
        it('should detect army vs coin', () => {
            const coin = { x: 100, y: 100, width: 20, height: 20, passed: false, value: 1 };
            entities.coins = [coin];

            checkCollisions(entities, gameState);

            expect(coin.passed).toBe(true);
            expect(gameState.coins).toBe(1);
        });
    });

    describe('Gates', () => {
        const testGate = (type: Gate['type'], value: number, expectedSoldiers?: number, expectedProp?: string, expectedVal?: any) => {
            const gate: Gate = {
                id: 1, x: 50, y: 100, width: 100, height: 10, passed: false,
                type, value, side: 'left', color: '#fff'
            };
            entities.gates = [gate];

            checkCollisions(entities, gameState);

            expect(gate.passed).toBe(true);
            if (expectedSoldiers !== undefined) {
                expect(army.soldiers.length).toBe(expectedSoldiers);
            }
            if (expectedProp) {
                // @ts-ignore
                expect(army[expectedProp]).toBe(expectedVal);
            }
        };

        it('should handle add gate', () => {
            testGate('add', 5, 6);
        });

        it('should handle multiply gate', () => {
            testGate('multiply', 5, 5);
        });

        it('should handle subtract gate', () => {
            army.soldiers = Array(10).fill(null).map(() => ({ x: 100, y: 100, size: 10, isAlive: true }));
            army.aliveCount = 10;
            testGate('subtract', 5, 5);
        });

        it('should handle divide gate', () => {
            army.soldiers = Array(10).fill(null).map(() => ({ x: 100, y: 100, size: 10, isAlive: true }));
            army.aliveCount = 10;
            testGate('divide', 2, 5);
        });

        it('should handle firerate gate', () => {
             army.fireRate = 100;
             testGate('firerate', 0.9, 1, 'fireRate', 90);
        });

        it('should handle damage gate', () => {
             army.damage = 1;
             testGate('damage', 2, 1, 'damage', 2);
        });

        it('should handle superwarrior gate', () => {
             testGate('superwarrior', 1, 2);
             expect(army.soldiers.some(s => s.isSuper)).toBe(true);
        });

        it('should mark sibling gate as passed', () => {
            const gate1: Gate = { id: 1, x: 50, y: 100, width: 100, height: 10, passed: false, type: 'add', value: 1, side: 'left', color: '#fff' };
            const gate2: Gate = { id: 2, x: 200, y: 100, width: 100, height: 10, passed: false, type: 'subtract', value: 1, side: 'right', color: '#fff' };
            entities.gates = [gate1, gate2];

            checkCollisions(entities, gameState);

            expect(gate1.passed).toBe(true);
            expect(gate2.passed).toBe(true);
        });
    });

    describe('Mystery Boxes', () => {
        const testBox = (rollIndex: number, checkFn: () => void) => {
            const randomSpy = vi.spyOn(Math, 'random');
            // Return effect index, then return generic value for particles
            randomSpy.mockReturnValueOnce(rollIndex / 10 + 0.05).mockReturnValue(0.5);

            const box: MysteryBox = {
                id: 1, x: 50, y: 80, width: 100, height: 50, passed: false, hp: 0, maxHp: 1, hitTimer: 0
            };
            entities.mysteryBoxes = [box];

            checkCollisions(entities, gameState);

            expect(box.passed).toBe(true);
            checkFn();

            box.passed = false;
        };

        it('should handle reinforcements', () => {
            testBox(0, () => expect(army.soldiers.length).toBeGreaterThan(1));
        });

        it('should handle nuke', () => {
            const horde = { isActive: true, y: 400, x: 100, width: 20, height: 20, soldiers: [] } as any;
            entities.enemyHordes = [horde];
            testBox(1, () => expect(horde.isActive).toBe(false));
        });

        it('should handle double', () => {
            testBox(2, () => expect(army.soldiers.length).toBeGreaterThan(1));
        });

        it('should handle invincible (hero squad)', () => {
            testBox(3, () => expect(army.soldiers.some(s => s.isSuper)).toBe(true));
        });

        it('should handle bazooka', () => {
            testBox(4, () => expect(army.soldiers.some(s => s.type === 'bazooka')).toBe(true));
        });

        it('should handle rambo', () => {
            testBox(5, () => expect(army.soldiers.some(s => s.type === 'rambo')).toBe(true));
        });

        it('should handle laser', () => {
            testBox(6, () => expect(army.soldiers.some(s => s.type === 'laser')).toBe(true));
        });

        it('should handle divide (bad)', () => {
            army.soldiers = Array(10).fill(null).map(() => ({ x: 100, y: 100, size: 10, isAlive: true }));
            army.aliveCount = 10;
            testBox(7, () => expect(army.soldiers.length).toBe(5));
        });

        it('should handle subtract (bad)', () => {
            army.soldiers = Array(20).fill(null).map(() => ({ x: 100, y: 100, size: 10, isAlive: true }));
            army.aliveCount = 20;
            testBox(8, () => expect(army.soldiers.length).toBe(5)); // 20 - 15 = 5
        });

        it('should handle slow (bad)', () => {
             army.fireRate = 100;
             testBox(9, () => expect(army.fireRate).toBe(150));
        });

        it('should destroy box with bullet', () => {
             const box: MysteryBox = {
                id: 1, x: 200, y: 200, width: 50, height: 50, passed: false, hp: 2, maxHp: 2, hitTimer: 0
            };
            entities.mysteryBoxes = [box];

            const bullet = { x: 225, y: 225, isEnemy: false, damage: 2 } as any;
            entities.bullets = [bullet];

            checkCollisions(entities, gameState);

            expect(box.passed).toBe(true);
            expect(bullet.y).toBe(-1000);
        });
    });

    describe('Enemy Hordes', () => {
        it('should battle horde', () => {
            const enemy = { x: 100, y: 100, size: 10, isAlive: true } as Soldier;
            const horde: EnemyHorde = {
                id: 1, x: 100, y: 100, width: 20, height: 20, soldiers: [enemy],
                count: 1, isActive: true, hp: 1, maxHp: 1, speed: 0, color: '#000'
            };
            entities.enemyHordes = [horde];

            checkCollisions(entities, gameState);

            // Using .length because dead soldiers are removed
            expect(army.soldiers.length).toBe(0);
            expect(horde.soldiers.length).toBe(0);
            expect(horde.isActive).toBe(false);
            expect(gameState.combo).toBe(1);
        });

        it('should increase combo and milestone text', () => {
             const horde: EnemyHorde = {
                id: 1, x: 100, y: 100, width: 20, height: 20, soldiers: [],
                count: 0, isActive: true, hp: 0, maxHp: 1, speed: 0, color: '#000'
            };
            entities.enemyHordes = [horde];

            gameState.combo = 4;
            checkCollisions(entities, gameState);
            expect(gameState.combo).toBe(5);
        });
    });

    describe('Bosses', () => {
        it('should battle boss', () => {
            const boss: Boss = {
                x: 80, y: 80, width: 40, height: 40, hp: 10, maxHp: 10,
                isActive: true, color: '#000', spawnTime: 0, isMoving: false,
                type: 'beast', hitTimer: 0
            };

            entities.boss = boss;

            checkCollisions(entities, gameState);

            expect(army.soldiers.length).toBe(0);
            expect(boss.hp).toBe(5);
        });

        it('should defeat boss', () => {
            const boss: Boss = {
                x: 80, y: 80, width: 40, height: 40, hp: 5, maxHp: 10,
                isActive: true, color: '#000', spawnTime: 0, isMoving: false,
                type: 'beast', hitTimer: 0
            };
            entities.boss = boss;

            checkCollisions(entities, gameState);

            expect(boss.isActive).toBe(false);
            expect(gameState.isVictory).toBe(true);
        });
    });

    describe('MiniBosses', () => {
        it('should battle miniboss', () => {
            const mb: MiniBoss = {
                id: 1, x: 80, y: 80, width: 40, height: 40, hp: 10, maxHp: 10,
                isActive: true, color: '#000', type: 'normal', hitTimer: 0
            };
            entities.miniBosses = [mb];

            checkCollisions(entities, gameState);

            expect(army.soldiers.length).toBe(0);
            expect(mb.hp).toBeLessThan(10);
        });
    });

    describe('Game Over', () => {
        it('should trigger game over if army dead', () => {
            army.soldiers[0].isAlive = false;
            army.aliveCount = 0;

            checkCollisions(entities, gameState);

            expect(gameState.isGameOver).toBe(true);
        });

        it('should update highscore', () => {
            army.soldiers[0].isAlive = false;
            army.aliveCount = 0;
            gameState.score = 100;
            gameState.highScore = 50;

            checkCollisions(entities, gameState);

            expect(gameState.highScore).toBe(100);
            expect(localStorage.getItem('crowdHighScore')).toBe('100');
        });
    });
});
