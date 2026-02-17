
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Army, Soldier } from '../src/types';
import { createSoldier } from '../src/entities';
import { soldierPool } from '../src/soldierPool';
import { checkCollisions } from '../src/collisions';
import { GameState } from '../src/types';
import { COLORS } from '../src/constants';

// Mock dependencies
vi.mock('../src/audio');
vi.mock('../src/renderer');
vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
}));

describe('Collisions Coverage', () => {
    let gameState: GameState;
    let army: Army;

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

        army = {
            soldiers: [],
            centerX: 100,
            centerY: 100,
            targetX: 100,
            color: '#000',
            isPlayer: true,
            fireRate: 500,
            lastShotTime: 0,
            damage: 1,
            aliveCount: 0
        };
    });

    it('should cleanup dead soldiers in the middle of the array (gap removal)', () => {
        // Create 4 soldiers: Alive, Dead, Alive, Alive
        // Battle will kill the last one (s4)
        // Leaving: Alive, Dead, Alive
        // Cleanup should remove Dead, leaving [Alive, Alive]
        // And s3 should move to index 1, triggering line 18

        const s1 = createSoldier(100, 100, '#000', 1);
        const s2 = createSoldier(100, 100, '#000', 0);
        const s3 = createSoldier(100, 100, '#000', 1);
        const s4 = createSoldier(100, 100, '#000', 1);

        s1.isAlive = true;
        s2.isAlive = false; // Dead gap
        s3.isAlive = true;
        s4.isAlive = true; // Sacrificial lamb

        army.soldiers = [s1, s2, s3, s4];
        army.aliveCount = 3;

        const horde = {
            id: 1,
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            soldiers: [createSoldier(100, 100, '#F00', 1)], // 1 enemy
            count: 1,
            color: '#F00',
            speed: 1,
            isActive: true,
            hp: 1,
            maxHp: 1
        };
        horde.soldiers[0].isAlive = true;

        const entities = {
            playerArmy: army,
            enemyHordes: [horde],
            gates: [],
            miniBosses: [],
            mysteryBoxes: [],
            coins: [],
            bullets: [],
            boss: null,
            weapons: []
        };

        checkCollisions(entities, gameState);

        // Expect length 2 (s1 and s3)
        // s4 killed. s2 removed.
        expect(army.soldiers.length).toBe(2);
        expect(army.soldiers[0]).toBe(s1);
        expect(army.soldiers[1]).toBe(s3);
    });
});
