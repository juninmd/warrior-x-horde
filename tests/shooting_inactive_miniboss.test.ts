
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSoldier } from '../src/entities';
import { updateShooting } from '../src/shooting';
import { GameState, Entities } from '../src/types';

// Mock dependencies
vi.mock('../src/renderer');
vi.mock('../src/game');
vi.mock('../src/audio');

describe('Shooting Coverage', () => {
    let gameState: GameState;
    let entities: Entities;

    beforeEach(() => {
        gameState = {
            score: 0,
            coins: 0,
            isGameOver: false,
            isVictory: false,
            isPaused: false,
            isBattling: false,
            combo: 0,
            comboTimer: 0,
            maxCombo: 0,
            killStreak: 0,
            killStreakTimer: 0,
            screenShakeActive: false,
            screenShakeIntensity: 0,
            screenShakeDuration: 0,
            screenShakeTimer: 0,
            hitStop: 0,
            damageFlash: 0,
            whiteFlash: 0,
            slowMoTimer: 0,
            currentLevel: 1,
            distanceTraveled: 0,
            levelDistance: 1000,
            baseGameSpeed: 2,
            gameSpeed: 2,
            isStarted: true,
            lowArmyTriggered: false,
            superCannonReady: false,
            superCannonActive: false,
            superCannonTimer: 0,
            superCannonDuration: 5000,
            superCannonCooldown: 30000,
            superCannonLastUsed: 0,
            superCannonDamageMultiplier: 10,
            nukeTimer: 0,
            newRecordReached: false,
            highScore: 1000,
            deferredInstallPrompt: null,
            bossActive: false
        };

        entities = {
            playerArmy: {
                soldiers: [],
                centerX: 100,
                centerY: 500,
                targetX: 100,
                color: '#000',
                isPlayer: true,
                fireRate: 100,
                lastShotTime: 0,
                damage: 1,
                aliveCount: 0
            },
            enemyHordes: [],
            gates: [],
            miniBosses: [],
            mysteryBoxes: [],
            coins: [],
            bullets: [],
            boss: null,
            weapons: []
        };
    });

    it('should skip inactive mini-bosses when finding targets', () => {
        const soldier = createSoldier(100, 500, '#000', 1);
        entities.playerArmy.soldiers.push(soldier);
        entities.playerArmy.aliveCount = 1;

        // Inactive MiniBoss close by
        const mb = {
            id: 1,
            x: 100,
            y: 400,
            width: 50,
            height: 50,
            hp: 100,
            maxHp: 100,
            isActive: false, // Inactive!
            color: '#F00',
            type: 'normal' as const,
            hitTimer: 0
        };
        entities.miniBosses.push(mb);

        // Advance time to allow shooting
        entities.playerArmy.lastShotTime = Date.now() - 1000;

        updateShooting(entities, gameState);

        // Should NOT fire at inactive miniboss (so no bullets)
        expect(entities.bullets.length).toBe(0);
    });
});
