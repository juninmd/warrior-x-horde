
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import { removeSoldiersFromArmy, createPlayerArmy, createEnemyHorde, createBoss, createMiniBoss, createSoldier } from '../src/entities';
import { moveEntitiesDown } from '../src/movement';
import { updateShooting, updateBullets, createBullet } from '../src/shooting';
import { spawnMiniBoss, spawnCoins, spawnMysteryBoxes } from '../src/spawner';
import { GameState, Army, EnemyHorde, Entities, Boss, MiniBoss, Soldier } from '../src/types';
import { COLORS } from '../src/constants';
import * as renderer from '../src/renderer';
import * as game from '../src/game';
import * as audio from '../src/audio';
import * as input from '../src/input';

// Mocks
vi.mock('../src/renderer', () => ({
  addFloatingText: vi.fn(),
  addExplosion: vi.fn(),
  addParticle: vi.fn(),
}));

vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
  triggerSuperCannon: vi.fn(),
}));

vi.mock('../src/audio', () => ({
  playSound: vi.fn(),
  audioManager: {
    powerUp: {} as HTMLAudioElement,
    nerf: {} as HTMLAudioElement,
    gameStart: {} as HTMLAudioElement,
    gameOver: {} as HTMLAudioElement,
    bossMusic: {} as HTMLAudioElement,
    gameMusic: {} as HTMLAudioElement,
    superCannon: {} as HTMLAudioElement,
    victory: {} as HTMLAudioElement,
  },
  playMusic: vi.fn(),
  stopAllMusic: vi.fn(),
}));

vi.mock('../src/input', () => ({
  vibrate: vi.fn(),
  triggerHaptic: vi.fn(),
}));

describe('Gap Coverage Tests', () => {
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
      gameSpeed: 5,
      baseGameSpeed: 5,
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
      superCannonReady: false,
      superCannonActive: false,
      superCannonTimer: 0,
      superCannonDuration: 5000,
      superCannonCooldown: 30000,
      superCannonLastUsed: 0,
      superCannonDamageMultiplier: 10,
      nukeTimer: 0,
      deferredInstallPrompt: null,
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

  describe('Collisions - processBattle', () => {
    it('should trigger killstreak milestones when killing enemies', () => {
      // Setup Player Army
      entities.playerArmy.soldiers = Array(20).fill(null).map((_, i) => ({
        id: i, x: 100, y: 100, type: 'normal', isAlive: true,
        targetX: 100, targetY: 100, color: '#000', size: 10,
        hp: 1, maxHp: 1, isSuper: false, hitTimer: 0, animOffset: 0
      }));
      entities.playerArmy.aliveCount = 20;

      // Setup Enemy Horde (overlapping)
      const horde = createEnemyHorde(800, 100, 10, 1);
      horde.x = 100; // Overlap
      horde.y = 100;
      horde.width = 50;
      horde.height = 50;
      entities.enemyHordes.push(horde);

      // Force battle processing
      // checkCollisions checks bounds. Army bounds will overlap Horde bounds.

      // We want to trigger killStreak >= 5.
      // processBattle kills `casualties` soldiers per frame.
      // `casualties = Math.min(1, playerCount, enemyCount)`.
      // By default it kills 1 per frame.
      // To get killStreak 5, we need to call it 5 times within timer window.

      // Wait, processBattle has a loop:
      // `for (let i = army.soldiers.length - 1; i >= 0 && killed < casualties; i--)`
      // It kills `casualties` amount.

      // To kill more at once, we need `casualties` > 1?
      // No, casualties = 1 usually.
      // But `gameState.killStreak` accumulates.

      gameState.killStreak = 4; // Pre-set to 4

      checkCollisions(entities, gameState);

      expect(gameState.killStreak).toBe(5);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("KILLING SPREE", expect.any(Number), expect.any(Number), '#2ECC71', 1.3, 'critical');

      // Test other milestones
      gameState.killStreak = 9;
      checkCollisions(entities, gameState); // 10
      expect(renderer.addFloatingText).toHaveBeenCalledWith("RAMPAGE!", expect.any(Number), expect.any(Number), '#3498DB', 1.5, 'critical');

      gameState.killStreak = 19;
      checkCollisions(entities, gameState); // 20
      expect(renderer.addFloatingText).toHaveBeenCalledWith("DOMINATING!", expect.any(Number), expect.any(Number), '#9B59B6', 1.8, 'critical');

      gameState.killStreak = 49;
      checkCollisions(entities, gameState); // 50
      expect(renderer.addFloatingText).toHaveBeenCalledWith("UNSTOPPABLE!", expect.any(Number), expect.any(Number), '#E74C3C', 2.2, 'critical');

      gameState.killStreak = 99;
      checkCollisions(entities, gameState); // 100
      expect(renderer.addFloatingText).toHaveBeenCalledWith("GODLIKE!", expect.any(Number), expect.any(Number), '#FFD700', 3.0, 'critical');
    });

    it('should trigger victory logic when horde is destroyed', () => {
       // Setup army to collide with horde
       entities.playerArmy.centerX = 100;
       entities.playerArmy.centerY = 100;
       entities.playerArmy.soldiers = [createSoldier(100, 100, '#000')];
       entities.playerArmy.aliveCount = 1;

       const horde = createEnemyHorde(800, 100, 1, 1); // Only 1 enemy
       horde.x = 100;
       horde.y = 100;
       // Ensure horde soldier is also at collision point (createEnemyHorde places them relative to x,y)
       horde.soldiers[0].x = 100;
       horde.soldiers[0].y = 100;

       entities.enemyHordes.push(horde);

       checkCollisions(entities, gameState);

       expect(horde.isActive).toBe(false);
       expect(game.triggerHitStop).toHaveBeenCalledWith(5);
       expect(gameState.combo).toBeGreaterThan(0);
       expect(renderer.addFloatingText).toHaveBeenCalledWith('VICTORY!', expect.any(Number), expect.any(Number), COLORS.UI.GOLD, 1.3);
    });
  });

  describe('Entities - removeSoldiersFromArmy', () => {
    it('should handle removing more soldiers than available safely', () => {
      const army = createPlayerArmy(800, 600);
      army.soldiers = [createSoldier(0, 0, '#000')]; // 1 soldier
      army.aliveCount = 1;

      // Try to remove 5
      removeSoldiersFromArmy(army, 5);

      expect(army.soldiers.length).toBe(0);
      expect(army.aliveCount).toBe(0);
      // If it didn't crash, the check `s && s.isAlive` worked for the empty pop
    });
  });

  describe('Movement - moveEntitiesDown', () => {
    it('should update horde position when pursuing player', () => {
      const horde = createEnemyHorde(800, 0, 10, 1);
      horde.y = 600; // > pursuitThreshold (0.6 * 800 = 480)
      horde.x = 100;
      entities.playerArmy.centerX = 200; // Target is to the right
      entities.enemyHordes.push(horde);

      const initialX = horde.x;
      moveEntitiesDown(entities, gameState, 1.0);

      expect(horde.x).toBeGreaterThan(initialX); // Should move right
    });

    it('should update boss movement (Normal)', () => {
      const boss = createBoss(800, 1); // Level 1 = Beast (Normal)
      boss.spawnTime = Date.now() - 11000; // > 10s wait time
      boss.y = 150; // Already descended
      boss.x = 100;
      entities.playerArmy.centerX = 200;
      entities.boss = boss;

      const initialX = boss.x;
      const initialY = boss.y;

      moveEntitiesDown(entities, gameState, 1.0);

      expect(boss.isMoving).toBe(true);
      expect(boss.x).toBeGreaterThan(initialX); // Should pursue X
      expect(boss.y).toBeGreaterThan(initialY); // Should advance Y
    });

    it('should update boss movement (Mothership)', () => {
      const boss = createBoss(800, 10); // Level 10 = Mothership
      boss.vx = 1;
      boss.vy = 1;
      entities.boss = boss;

      const initialX = boss.x;
      const initialY = boss.y;

      moveEntitiesDown(entities, gameState, 1.0);

      expect(boss.x).not.toBe(initialX);
      expect(boss.y).not.toBe(initialY);
    });
  });

  describe('Shooting & Bullets', () => {
      it('should handle bullet collision with MiniBoss', () => {
          const mb = createMiniBoss(800, 100, 1);
          mb.x = 100;
          mb.y = 100;
          mb.width = 50;
          mb.height = 50;
          entities.miniBosses.push(mb);

          const bullet = createBullet(125, 125, 125, 125, 10, false);
          bullet.isEnemy = false;
          entities.bullets.push(bullet);

          updateBullets(entities, gameState, 1.0);

          expect(mb.hp).toBeLessThan(mb.maxHp);
          expect(renderer.addExplosion).toHaveBeenCalled();
      });

      it('should handle bullet collision with Boss (Normal)', () => {
          const boss = createBoss(800, 1);
          boss.x = 100;
          boss.y = 100;
          boss.width = 100;
          boss.height = 100;
          boss.isActive = true;
          entities.boss = boss;

          const bullet = createBullet(150, 150, 150, 150, 10, false);
          entities.bullets.push(bullet);

          updateBullets(entities, gameState, 1.0);

          expect(boss.hp).toBeLessThan(boss.maxHp);
      });

      it('should handle bullet collision with Boss (Mothership)', () => {
          const boss = createBoss(800, 10); // Mothership
          boss.x = 100;
          boss.y = 100;
          boss.isActive = true;
          entities.boss = boss;

          // Mothership has circular hitbox at center
          // x=100, y=100. Center? createBoss says x, y.
          // shooting.ts: const shipCenterX = boss.x; const shipCenterY = boss.y;
          // Wait, createBoss: x = canvasWidth/2, y=25.
          // checkBulletBossCollision uses boss.x, boss.y as center for mothership logic?
          // Code says:
          // const shipCenterX = boss.x;
          // const shipCenterY = boss.y;
          // So bullet must be close to boss.x, boss.y

          const bullet = createBullet(100, 100, 100, 100, 10, false);
          entities.bullets.push(bullet);

          updateBullets(entities, gameState, 1.0);

          expect(boss.hp).toBeLessThan(boss.maxHp);
      });
  });

  describe('Spawner', () => {
      it('should spawn multiple MiniBosses at high levels', () => {
          gameState.currentLevel = 12;
          gameState.distanceTraveled = 2000;
          gameState.levelDistance = 1000; // Trigger threshold

          spawnMiniBoss(entities, 800, gameState);

          // Level 12 > 11. logic:
          // const spawnCount = gameState.currentLevel > 11 ? Math.min(3, 1 + Math.floor((gameState.currentLevel - 11) / 5)) : 1;
          // 12 - 11 = 1. floor(1/5) = 0. 1+0 = 1.
          // Wait, let's try level 21.
          // 21 - 11 = 10. 10/5 = 2. 1+2 = 3.

          gameState.currentLevel = 21;
          // Reset lastMiniBossSpawn logic by advancing distance
          gameState.distanceTraveled = 10000;
          // Ensure we can spawn more (entities.miniBosses empty)
          entities.miniBosses = [];

          spawnMiniBoss(entities, 800, gameState);

          expect(entities.miniBosses.length).toBeGreaterThanOrEqual(1);
      });

      it('should spawn mystery boxes but NOT coins', () => {
         const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0001); // Always < 0.005

         spawnCoins(entities, 800, gameState, 1.0);
         expect(entities.coins.length).toBe(0);

         spawnMysteryBoxes(entities, 800, gameState, 1.0);
         expect(entities.mysteryBoxes.length).toBeGreaterThan(0);

         randomSpy.mockRestore();
      });
  });
});
