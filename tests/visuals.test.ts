import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../src/renderer';
import { checkCollisions } from '../src/collisions';
import { QualityManager } from '../src/quality';
import { Entities, GameState, Trail, Army } from '../src/types';
import * as utils from '../src/utils';

describe('Visual Effects', () => {
    let ctx: any;
    let entities: Entities;
    let gameState: GameState;

    beforeEach(() => {
        ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            fillRect: vi.fn(),
            setTransform: vi.fn(),
            clearRect: vi.fn(),
            createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            setLineDash: vi.fn(),
            drawImage: vi.fn(),
            arc: vi.fn(),
            ellipse: vi.fn(),
            strokeText: vi.fn(),
            fillText: vi.fn(),
            roundRect: vi.fn(),
            canvas: { width: 480, height: 800 }
        };

        const trail: Trail = {
            points: [
                { x: 10, y: 10, width: 10, alpha: 1 },
                { x: 20, y: 20, width: 10, alpha: 1 }
            ],
            color: '#FFF',
            width: 10,
            maxLength: 10
        };

        const army: Army = {
            centerX: 100, centerY: 100,
            trail: trail,
            soldiers: [],
            aliveCount: 0,
            targetX: 0, color: '#000', isPlayer: true, fireRate: 0, lastShotTime: 0, damage: 0
        };

        entities = {
            playerArmy: army,
            enemyHordes: [],
            gates: [],
            weapons: [],
            mysteryBoxes: [],
            coins: [],
            bullets: [],
            boss: null,
            miniBosses: []
        };

        gameState = {
            score: 0, currentLevel: 1, isGameOver: false, isVictory: false, isStarted: true,
            isPaused: false, highScore: 0, highScoreDistance: 0, coins: 0,
            gameSpeed: 0, baseGameSpeed: 0, distanceTraveled: 0, levelDistance: 0,
            isBattling: false, battleTimer: 0, screenShakeActive: false, screenShakeIntensity: 0,
            screenShakeDuration: 0, screenShakeTimer: 0, lastFrameTime: 0,
            superCannonActive: false, superCannonTimer: 0, superCannonDuration: 0,
            superCannonCooldown: 0, superCannonLastUsed: 0, superCannonReady: false,
            superCannonDamageMultiplier: 0, combo: 0, comboTimer: 0, maxCombo: 0,
            bossActive: false, bossAtmosphereIntensity: 0, newRecordReached: false,
            damageFlash: 0, lowArmyTriggered: false, hitStop: 0, slowMoTimer: 0,
            isDying: false, nukeTimer: 0, killStreak: 0, killStreakTimer: 0,
            totalKills: 0, runStartTime: 0, nearMissCount: 0, whiteFlash: 0,
            warpEffectTimer: 0, comboTier: 0, deferredInstallPrompt: null
        };

        QualityManager.getInstance().setQuality('high');
    });

    it('should render trail when enabled', () => {
        render(ctx, entities, gameState);
        expect(ctx.beginPath).toHaveBeenCalled();
        expect(ctx.moveTo).toHaveBeenCalledWith(10, 10);
        expect(ctx.lineTo).toHaveBeenCalledWith(20, 20);
        expect(ctx.stroke).toHaveBeenCalled();
    });

    it('should not render trail when disabled', () => {
        QualityManager.getInstance().settings.enableTrails = false;
        render(ctx, entities, gameState);
        expect(ctx.moveTo).not.toHaveBeenCalledWith(10, 10);
    });

    it('should render vignette when enabled', () => {
        render(ctx, entities, gameState);
        expect(ctx.createRadialGradient).toHaveBeenCalled();
    });

    it('should not render vignette when disabled', () => {
        QualityManager.getInstance().settings.enablePostProcessing = false;
        render(ctx, entities, gameState);
        expect(ctx.createRadialGradient).not.toHaveBeenCalled();
    });

    it('should trigger dodge when passing negative gate without collision', () => {
        const gate = {
            id: 1, x: 0, y: 850, width: 100, height: 50,
            type: 'subtract', value: 10, color: '#F00',
            side: 'left', passed: false
        };
        entities.gates = [gate as any];
        // Army far away
        entities.playerArmy.centerX = 300;
        entities.playerArmy.soldiers = [{ x: 300, y: 700, isAlive: true, size: 10 } as any];

        // Mock getArmyBounds to avoid complex calculations
        vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 290, right: 310, top: 690, bottom: 710 });

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(gameState.score).toBe(50);
        expect(gameState.nearMissCount).toBe(1);
    });

    it('should not trigger dodge for positive gates', () => {
        const gate = {
            id: 2, x: 0, y: 850, width: 100, height: 50,
            type: 'add', value: 10, color: '#0F0',
            side: 'left', passed: false
        };
        entities.gates = [gate as any];
        entities.playerArmy.centerX = 300;
        entities.playerArmy.soldiers = [{ x: 300, y: 700, isAlive: true, size: 10 } as any];

        vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 290, right: 310, top: 690, bottom: 710 });

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(gameState.nearMissCount).toBe(0);
    });

    it('should trigger dodge for divide gate', () => {
        const gate = {
            id: 3, x: 0, y: 850, width: 100, height: 50,
            type: 'divide', value: 2, color: '#F00',
            side: 'left', passed: false
        };
        entities.gates = [gate as any];
        entities.playerArmy.centerX = 300;
        entities.playerArmy.soldiers = [{ x: 300, y: 700, isAlive: true, size: 10 } as any];

        vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 290, right: 310, top: 690, bottom: 710 });

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(gameState.nearMissCount).toBe(1);
    });
});
