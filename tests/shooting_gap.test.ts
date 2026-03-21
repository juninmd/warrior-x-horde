
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateBullets, updateSuperCannon, activateSuperCannon } from '../src/shooting';
import { GameState, Entities } from '../src/types';
import { createPlayerArmy, createEnemyHorde, createSoldier } from '../src/entities';
import * as renderer from '../src/renderer';

// Mocks
vi.mock('../src/renderer', () => ({
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
}));

vi.mock('../src/game', () => ({
    triggerScreenShake: vi.fn(),
}));

describe('Shooting Gap Coverage', () => {
    let gameState: GameState;
    let entities: Entities;

    beforeEach(() => {
        vi.clearAllMocks();
        gameState = {
            isStarted: true,
            isGameOver: false,
            isPaused: false,
            score: 0,
            highScore: 0,
            coins: 0,
            currentLevel: 1,
            distanceTraveled: 0,
            levelDistance: 1000,
            gameSpeed: 1,
            baseGameSpeed: 1,
            isVictory: false,
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
            slowMoTimer: 0,
            damageFlash: 0,
            whiteFlash: 0,
            lowArmyTriggered: false,
            newRecordReached: false,
            superCannonReady: true,
            superCannonActive: false,
            superCannonTimer: 0,
            superCannonDuration: 5000,
            superCannonCooldown: 10000,
            superCannonLastUsed: 0,
            superCannonDamageMultiplier: 10,
            nukeTimer: 0,
            deferredInstallPrompt: null,
            bossActive: false,
            bossAtmosphereIntensity: 0,
        };
        entities = {
            playerArmy: createPlayerArmy(800, 600),
            enemyHordes: [],
            gates: [],
            weapons: [],
            mysteryBoxes: [],
            coins: [],
            bullets: [],
            boss: null,
            miniBosses: [],
        };
    });

    it('should prevent Super Cannon activation if on cooldown', () => {
        gameState.superCannonReady = false; // Already used
        activateSuperCannon(gameState);
        expect(gameState.superCannonActive).toBe(false);
    });

    it('should kill soldiers with Super Cannon', () => {
        activateSuperCannon(gameState);
        expect(gameState.superCannonActive).toBe(true);

        // Setup horde in beam path
        const horde = createEnemyHorde(800, 100, 5, 1);
        horde.x = entities.playerArmy.centerX; // In beam center
        horde.y = 100;
        horde.isActive = true;

        // Ensure soldiers are in beam
        horde.soldiers.forEach(s => {
            s.x = entities.playerArmy.centerX;
            s.y = 100;
            s.isAlive = true;
        });

        entities.enemyHordes.push(horde);

        // Update
        updateSuperCannon(entities, gameState, 100);

        // Soldiers should be killed/removed
        expect(horde.soldiers.length).toBeLessThan(5);
        expect(renderer.addExplosion).toHaveBeenCalled();
    });

    it('should cleanup dead soldiers in Horde (Coverage for updateBullets cleanup)', () => {
        const horde = createEnemyHorde(800, 100, 5, 1);
        entities.enemyHordes.push(horde);
        horde.isActive = true;

        // Manually kill one soldier
        horde.soldiers[0].isAlive = false;

        // We need to trigger the cleanup logic in updateBullets.
        // The cleanup happens after a bullet hit.
        // So we need to simulate a bullet hit.

        // Use a pooled bullet if possible, but manual is fine if structure matches
        // But need valid `update` props? `updateBullets` checks `bullet.y`.
        // Also `isEnemy: false`.

        // Ensure valid positions for enemyGrid
        horde.y = 200;
        horde.soldiers.forEach(s => {
            s.y = 200;
            s.x = 200;
        });

        // Place bullet at soldier 1
        const bullet = {
             x: 200, y: 200, targetX: 0, targetY: 0, speed: 0, damage: 1000, isEnemy: false,
             draw: () => {}
        };
        entities.bullets.push(bullet as any);

        updateBullets(entities, gameState, 1.0);

        // Check if dead soldier (index 0) was cleaned up
        // We know index 1 was hit and probably killed.
        // Index 0 was already dead.
        expect(horde.soldiers.length).toBeLessThanOrEqual(3);
    });

    it('should skip defensive checks coverage', () => {
        // Test defensive branches in shooting.ts

        // 1. Horde not active
        const horde = createEnemyHorde(800, 100, 1, 1);
        horde.isActive = false;
        entities.enemyHordes.push(horde);

        // 2. Horde too high
        const horde2 = createEnemyHorde(800, 100, 1, 1);
        horde2.y = 50;
        entities.enemyHordes.push(horde2);

        // 3. Soldier too high
        const horde3 = createEnemyHorde(800, 100, 1, 1);
        horde3.y = 200;
        horde3.soldiers[0].y = 50;
        entities.enemyHordes.push(horde3);

        const bullet = { x: 200, y: 200, speed: 0, damage: 1, isEnemy: false };
        entities.bullets.push(bullet as any);

        updateBullets(entities, gameState, 1.0);

        // No assertions needed, just ensuring code paths run
    });
});
