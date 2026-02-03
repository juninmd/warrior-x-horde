import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import { GameState, Entities, Army, EnemyHorde, Bullet } from '../src/types';
import * as renderer from '../src/renderer';
import * as audio from '../src/audio';
import * as input from '../src/input';

// Mocks
vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
    render: vi.fn(),
    updateFloatingTexts: vi.fn(),
    shareOnX: vi.fn(),
    shareOnWhatsApp: vi.fn(),
}));

vi.mock('../src/audio', () => ({
    playSound: vi.fn(),
    initAudio: vi.fn(),
    isMusicMuted: vi.fn(() => false),
    toggleMute: vi.fn(),
    playMusic: vi.fn(),
    stopAllMusic: vi.fn(),
    audioManager: {
        powerUp: {} as any,
        nerf: {} as any,
        gameMusic: {} as any,
        bossMusic: {} as any,
        gameOver: {} as any,
        gameStart: {} as any,
        superCannon: {} as any,
        victory: {} as any,
    }
}));

vi.mock('../src/input', () => ({
    vibrate: vi.fn(),
    setInputScale: vi.fn(),
    setupInput: vi.fn(),
    getMouseX: vi.fn(() => 0),
    initializeMousePosition: vi.fn(),
    setGameStateRef: vi.fn(),
    triggerHaptic: vi.fn(),
}));

describe('Collisions Coverage', () => {
    let gameState: GameState;
    let entities: Entities;

    beforeEach(() => {
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
        } as any;

        entities = {
            playerArmy: {
                soldiers: [{ x: 100, y: 700, isAlive: true, size: 5, type: 'normal' }],
                centerX: 100,
                centerY: 700,
                aliveCount: 1,
                radius: 20
            } as any,
            enemyHordes: [],
            gates: [],
            bullets: [],
            miniBosses: [],
            mysteryBoxes: [],
            coins: [],
            boss: null
        } as any;

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should process battle where enemy count is 0 (Horde Cleared)', () => {
        const horde: EnemyHorde = {
            id: 1,
            x: 100,
            y: 700,
            width: 50,
            height: 50,
            soldiers: [],
            count: 0,
            isActive: true,
            maxHp: 100,
            hp: 0,
            type: 'normal'
        };
        entities.enemyHordes = [horde];

        checkCollisions(entities, gameState);

        expect(horde.isActive).toBe(false);
        expect(gameState.combo).toBe(1);
        // It should show score gain text, not VICTORY (VICTORY is for combat kill)
        expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('+'), expect.any(Number), expect.any(Number), expect.any(String));
    });

    it('should handle bullet hitting mystery box', () => {
         const box = {
             x: 100, y: 100, width: 40, height: 40,
             type: 'reinforcements',
             passed: false,
             hp: 10
         };
         entities.mysteryBoxes = [box] as any;

         const bullet: Bullet = {
             x: 110, y: 110,
             targetX: 110, targetY: 110,
             speed: -10,
             damage: 10,
             isEnemy: false
         };
         entities.bullets = [bullet];

         checkCollisions(entities, gameState);

         expect(box.hp).toBe(0);
         expect(box.passed).toBe(true); // Should be destroyed
         expect(renderer.addFloatingText).toHaveBeenCalledWith('DESTROYED!', expect.any(Number), expect.any(Number), expect.any(String));
         expect(bullet.y).toBe(-1000); // Bullet moved off screen
    });

    it('should handle bullet missing mystery box', () => {
        const box = {
            x: 100, y: 100, width: 40, height: 40,
            type: 'reinforcements',
            passed: false,
            hp: 10
        };
        entities.mysteryBoxes = [box] as any;

        const bullet: Bullet = {
            x: 200, y: 200, // Far away
            targetX: 200, targetY: 200,
            speed: -10,
            damage: 10,
            isEnemy: false
        };
        entities.bullets = [bullet];

        checkCollisions(entities, gameState);

        expect(box.hp).toBe(10);
        expect(box.passed).toBe(false);
    });

    it('should handle boss collision with player army causing damage', () => {
        const boss = {
            isActive: true,
            x: 80, y: 680,
            width: 40, height: 40,
            hp: 100,
            type: 'normal'
        };
        entities.boss = boss as any;

        // Ensure collision
        entities.playerArmy.soldiers = [
            { x: 100, y: 700, isAlive: true, size: 5, type: 'normal' },
            { x: 100, y: 700, isAlive: true, size: 5, type: 'normal' }
        ] as any;
        entities.playerArmy.aliveCount = 2;
        // Mock getArmyBounds to return rect colliding with boss
        // Since we can't easily mock utils here (it's imported by collisions),
        // we ensure coordinates overlap.
        // Boss at 80,680 40x40 -> 80-120, 680-720.
        // Army at 100, 700. Bounds should overlap.

        checkCollisions(entities, gameState);

        expect(boss.hp).toBeLessThan(100);
        expect(gameState.isBattling).toBe(true);
        expect(gameState.damageFlash).toBeGreaterThan(0);
    });

    it('should handle boss death by collision', () => {
        const boss = {
            isActive: true,
            x: 80, y: 680,
            width: 40, height: 40,
            hp: 1, // Will die on contact
            type: 'normal'
        };
        entities.boss = boss as any;

        checkCollisions(entities, gameState);

        expect(boss.isActive).toBe(false);
        expect(gameState.isVictory).toBe(true);
        expect(renderer.addFloatingText).toHaveBeenCalledWith('BOSS DEFEATED!', expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
    });

    it('should handle gate effects (Subtract)', () => {
        const gate = {
            id: 1, x: 50, y: 680, width: 100, height: 50,
            type: 'subtract', value: 5, passed: false
        };
        entities.gates = [gate] as any;
        // Soldiers need positions to trigger collision
        entities.playerArmy.soldiers = Array(10).fill(null).map(() => ({
            isAlive: true, x: 100, y: 700, size: 5, type: 'normal'
        })) as any;
        entities.playerArmy.aliveCount = 10;
        entities.playerArmy.centerX = 100; // Army center must overlap gate X (50 to 150)

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(renderer.addFloatingText).toHaveBeenCalledWith('-5', expect.any(Number), expect.any(Number), expect.any(String));
        expect(entities.playerArmy.aliveCount).toBeLessThan(10);
    });

    it('should handle gate effects (Divide)', () => {
        const gate = {
            id: 1, x: 50, y: 680, width: 100, height: 50,
            type: 'divide', value: 2, passed: false
        };
        entities.gates = [gate] as any;
        entities.playerArmy.soldiers = Array(10).fill(null).map(() => ({
            isAlive: true, x: 100, y: 700, size: 5, type: 'normal'
        })) as any;
        entities.playerArmy.aliveCount = 10;
        entities.playerArmy.centerX = 100;

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(renderer.addFloatingText).toHaveBeenCalledWith('÷2', expect.any(Number), expect.any(Number), expect.any(String));
        // Should remove roughly half
    });

    it('should handle combo milestones in horde clear', () => {
         const horde: EnemyHorde = {
             id: 1, x: 100, y: 700, width: 50, height: 50,
             soldiers: [], count: 0, isActive: true, maxHp: 100, hp: 0,
             type: 'normal'
         };
         entities.enemyHordes = [horde];

         // Simulate combo 5
         gameState.combo = 4; // Will become 5

         checkCollisions(entities, gameState);

         expect(gameState.combo).toBe(5);
         expect(renderer.addFloatingText).toHaveBeenCalledWith('GREAT!', expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
    });

    it('should process mini-boss battle', () => {
        const miniBoss = {
            isActive: true,
            x: 80, y: 680,
            width: 40, height: 40,
            hp: 100
        };
        entities.miniBosses = [miniBoss] as any;

        checkCollisions(entities, gameState);

        expect(gameState.isBattling).toBe(true);
        expect(miniBoss.hp).toBeLessThan(100);
    });

    it('should handle player death', () => {
         entities.playerArmy.soldiers = [];
         entities.playerArmy.aliveCount = 0;

         checkCollisions(entities, gameState);

         expect(gameState.isGameOver).toBe(true);
         expect(input.triggerHaptic).toHaveBeenCalledWith('failure');
         // Check High Score update
         if (gameState.score > gameState.highScore) {
             // ... logic check
         }
    });

});
