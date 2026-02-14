import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QualityManager } from '../src/quality';
import { addParticle, _testing } from '../src/renderer';
import { checkCollisions } from '../src/collisions';
import * as renderer from '../src/renderer';
import { GameState, Entities } from '../src/types';

// Mock game.ts to prevent side-effects from execution
vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
    triggerHitStop: vi.fn(),
    togglePause: vi.fn(),
    debugSetLevel: vi.fn(),
    toggleFullscreen: vi.fn(),
    triggerSuperCannon: vi.fn(),
    toggleSettingsMenu: vi.fn(),
    startGame: vi.fn(),
}));

describe('Gameplay Polish', () => {

  describe('Adaptive Particles', () => {
    beforeEach(() => {
        QualityManager.resetInstance();
        if (_testing && _testing.getParticles) {
            _testing.getParticles().length = 0;
        }
    });

    it('should skip trails when quality is low', () => {
        const qm = QualityManager.getInstance();
        qm.settings.particleMultiplier = 0.4; // Low quality

        addParticle(100, 100, 'trail', '#FFF');

        expect(_testing.getParticles().length).toBe(0);
    });

    it('should allow trails when quality is high', () => {
        const qm = QualityManager.getInstance();
        qm.settings.particleMultiplier = 1.0;

        addParticle(100, 100, 'trail', '#FFF');

        expect(_testing.getParticles().length).toBeGreaterThan(0);
    });
  });

  describe('Perfect Clear Logic', () => {
    let spy: any;

    beforeEach(() => {
        spy = vi.spyOn(renderer, 'addFloatingText').mockImplementation(() => {});
        vi.spyOn(renderer, 'addExplosion').mockImplementation(() => {});
        vi.spyOn(renderer, 'addParticle').mockImplementation(() => {});
        // Mock share functions if exported
        if (renderer.shareOnX) vi.spyOn(renderer, 'shareOnX').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should trigger PERFECT! when horde is cleared via shooting (no melee damage)', () => {
        const gameState = {
            score: 0,
            combo: 0,
            isBattling: false,
            currentLevel: 1,
            maxCombo: 0,
            coins: 0,
            damageFlash: 0
        } as unknown as GameState;

        const playerSoldier = { x: 100, y: 100, size: 10, isAlive: true, hp: 10 } as any;

        const entities = {
            playerArmy: {
                soldiers: [playerSoldier],
                aliveCount: 1,
                centerX: 100,
                centerY: 100,
                getBounds: () => ({ left: 90, right: 110, top: 90, bottom: 110 })
            },
            enemyHordes: [{
                id: 1,
                x: 100,
                y: 100,
                width: 50,
                height: 50,
                soldiers: [], // Dead
                isActive: true,
                count: 0,
                hp: 0,
                maxHp: 10,
                perfectClearEligible: true
            }],
            gates: [], bullets: [], mysteryBoxes: [], coins: [], miniBosses: [], boss: null
        } as unknown as Entities;

        checkCollisions(entities, gameState);

        expect(spy).toHaveBeenCalledWith('PERFECT!', expect.any(Number), expect.any(Number), '#00FFFF', 2.0, 'critical');
    });

    it('should NOT trigger PERFECT! if perfectClearEligible is false', () => {
        const gameState = {
            score: 0,
            combo: 0,
            isBattling: false,
            currentLevel: 1,
            maxCombo: 0,
            coins: 0,
            damageFlash: 0
        } as unknown as GameState;

        const playerSoldier = { x: 100, y: 100, size: 10, isAlive: true, hp: 10 } as any;

        const entities = {
            playerArmy: {
                soldiers: [playerSoldier],
                aliveCount: 1,
                centerX: 100,
                centerY: 100
            },
            enemyHordes: [{
                id: 1,
                x: 100,
                y: 100,
                width: 50,
                height: 50,
                soldiers: [],
                isActive: true,
                count: 0,
                hp: 0,
                maxHp: 10,
                perfectClearEligible: false
            }],
            gates: [], bullets: [], mysteryBoxes: [], coins: [], miniBosses: [], boss: null
        } as unknown as Entities;

        checkCollisions(entities, gameState);

        expect(spy).not.toHaveBeenCalledWith('PERFECT!', expect.any(Number), expect.any(Number), '#00FFFF', 2.0, 'critical');
    });
  });
});
