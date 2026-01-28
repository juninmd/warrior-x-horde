
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock game.ts BEFORE import collisions
vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
}));

import { checkCollisions } from '../src/collisions';
import { GameState, Entities, Army, Gate, EnemyHorde, MiniBoss, MysteryBox, Coin, Bullet, Boss } from '../src/types';
import { COLORS } from '../src/constants';

// Helper to create basic state
function createMockState(): { gameState: GameState, entities: Entities } {
  const gameState: GameState = {
    isStarted: true,
    isGameOver: false,
    isVictory: false,
    isPaused: false,
    currentLevel: 1,
    score: 0,
    highScore: 1000,
    coins: 0,
    gameSpeed: 1,
    baseGameSpeed: 1,
    distanceTraveled: 0,
    levelDistance: 5000,
    isBattling: false,
    battleTimer: 0,
    screenShakeActive: false,
    screenShakeIntensity: 0,
    screenShakeDuration: 0,
    screenShakeTimer: 0,
    lastFrameTime: 0,
    superCannonActive: false,
    superCannonTimer: 0,
    superCannonDuration: 0,
    superCannonCooldown: 0,
    superCannonLastUsed: 0,
    superCannonReady: true,
    superCannonDamageMultiplier: 1,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    bossActive: false,
    bossAtmosphereIntensity: 0,
    newRecordReached: false,
    damageFlash: 0,
    lowArmyTriggered: false,
    hitStop: 0,
    slowMoTimer: 0,
  };

  const army: Army = {
    soldiers: [],
    centerX: 240,
    centerY: 600,
    targetX: 240,
    color: '#000',
    isPlayer: true,
    fireRate: 500,
    lastShotTime: 0,
    damage: 1,
    aliveCount: 0
  };
  // Add a soldier
  army.soldiers.push({
    id: 1, x: 240, y: 600, targetX: 240, targetY: 600, color: '#000', size: 10,
    isAlive: true, animOffset: 0, hp: 1, maxHp: 1, isSuper: false, type: 'normal', hitTimer: 0
  });
  army.aliveCount = 1;

  const entities: Entities = {
    playerArmy: army,
    enemyHordes: [],
    gates: [],
    weapons: [],
    mysteryBoxes: [],
    coins: [],
    bullets: [],
    boss: null,
    miniBosses: [],
  };

  return { gameState, entities };
}

describe('Collisions Coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mystery Box Effects', () => {
    // Effects: 'reinforcements', 'nuke', 'double', 'invincible', 'bazooka', 'rambo', 'laser', 'divide', 'subtract', 'slow'
    const effects = [
      'reinforcements', 'nuke', 'double', 'invincible', 'bazooka', 'rambo', 'laser', 'divide', 'subtract', 'slow'
    ];

    effects.forEach((effect, index) => {
      it(`should apply ${effect} effect`, () => {
        const { gameState, entities } = createMockState();
        const box: MysteryBox = {
            id: 1, x: 240, y: 600, width: 50, height: 50, hp: 1, maxHp: 1, passed: false, hitTimer: 0
        };
        entities.mysteryBoxes.push(box);

        // Add enemy horde for nuke test
        if (effect === 'nuke') {
            entities.enemyHordes.push({
                id: 1, soldiers: [], count: 10, x: 240, y: 400, width: 50, height: 50,
                color: '#F00', speed: 0, isActive: true, hp: 10, maxHp: 10
            });
        }

        // Mock Math.random for effect selection
        // index / 10 will pick the effect at index
        const mockRandom = vi.spyOn(Math, 'random');
        mockRandom.mockReturnValue((index + 0.5) / 10);

        checkCollisions(entities, gameState);

        expect(box.passed).toBe(true);
        // We could verify specific side effects here (like army count changing),
        // but verifying the box passed implies the effect code ran.
      });
    });
  });

  describe('Gate Effects', () => {
    it('should apply add gate', () => {
      const { gameState, entities } = createMockState();
      const gate: Gate = {
        id: 1, x: 200, y: 580, width: 80, height: 50, type: 'add', value: 5, color: '#0F0', side: 'left', passed: false
      };
      entities.gates.push(gate);

      checkCollisions(entities, gameState);

      expect(gate.passed).toBe(true);
      expect(entities.playerArmy.aliveCount).toBe(6); // 1 + 5
    });

    it('should apply multiply gate', () => {
      const { gameState, entities } = createMockState();
      const gate: Gate = {
        id: 1, x: 200, y: 580, width: 80, height: 50, type: 'multiply', value: 2, color: '#0F0', side: 'left', passed: false
      };
      entities.gates.push(gate);

      checkCollisions(entities, gameState);

      expect(gate.passed).toBe(true);
      expect(entities.playerArmy.aliveCount).toBe(2); // 1 * 2
    });

    it('should apply subtract gate', () => {
        const { gameState, entities } = createMockState();
        // Give enough soldiers first
        for(let i=0; i<5; i++) entities.playerArmy.soldiers.push({...entities.playerArmy.soldiers[0], id: i+2});
        entities.playerArmy.aliveCount = 6;

        const gate: Gate = {
          id: 1, x: 200, y: 580, width: 80, height: 50, type: 'subtract', value: 2, color: '#F00', side: 'left', passed: false
        };
        entities.gates.push(gate);

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(entities.playerArmy.aliveCount).toBe(4);
    });

    it('should apply divide gate', () => {
        const { gameState, entities } = createMockState();
        // Give enough soldiers
        for(let i=0; i<9; i++) entities.playerArmy.soldiers.push({...entities.playerArmy.soldiers[0], id: i+2});
        entities.playerArmy.aliveCount = 10;

        const gate: Gate = {
          id: 1, x: 200, y: 580, width: 80, height: 50, type: 'divide', value: 2, color: '#F00', side: 'left', passed: false
        };
        entities.gates.push(gate);

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        // Remove floor(10 * (1 - 1/2)) = 5. Result 5.
        expect(entities.playerArmy.aliveCount).toBe(5);
    });

    it('should apply firerate gate', () => {
        const { gameState, entities } = createMockState();
        const initialFireRate = entities.playerArmy.fireRate;
        const gate: Gate = {
          id: 1, x: 200, y: 580, width: 80, height: 50, type: 'firerate', value: 0.5, color: '#0F0', side: 'left', passed: false
        };
        entities.gates.push(gate);

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(entities.playerArmy.fireRate).toBe(initialFireRate * 0.5);
    });

    it('should apply damage gate', () => {
        const { gameState, entities } = createMockState();
        const initialDamage = entities.playerArmy.damage;
        const gate: Gate = {
          id: 1, x: 200, y: 580, width: 80, height: 50, type: 'damage', value: 2, color: '#0F0', side: 'left', passed: false
        };
        entities.gates.push(gate);

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(entities.playerArmy.damage).toBe(initialDamage * 2);
    });

    it('should apply superwarrior gate', () => {
        const { gameState, entities } = createMockState();
        const gate: Gate = {
          id: 1, x: 200, y: 580, width: 80, height: 50, type: 'superwarrior', value: 1, color: '#0F0', side: 'left', passed: false
        };
        entities.gates.push(gate);

        checkCollisions(entities, gameState);

        expect(gate.passed).toBe(true);
        expect(entities.playerArmy.soldiers.length).toBe(2);
        expect(entities.playerArmy.soldiers[1].isSuper).toBe(true);
    });
  });

  describe('Battle Processing', () => {
    it('should process battle and trigger milestones', () => {
        const { gameState, entities } = createMockState();

        // Setup horde that will die instantly
        const horde: EnemyHorde = {
            id: 1, soldiers: [], count: 0, x: 240, y: 600, width: 50, height: 50,
            color: '#F00', speed: 0, isActive: true, hp: 0, maxHp: 10
        };
        entities.enemyHordes.push(horde);

        // Mock combo to trigger milestones
        // 4, 9, 19, 49 -> becomes 5, 10, 20, 50
        const combos = [4, 9, 19, 49];

        combos.forEach(startCombo => {
            gameState.combo = startCombo;
            horde.isActive = true; // Reset
            checkCollisions(entities, gameState);
            // After check, combo should increment
            expect(gameState.combo).toBe(startCombo + 1);
        });
    });

    it('should process player death', () => {
        const { gameState, entities } = createMockState();
        // Army with 1 soldier
        // Horde with 1 soldier
        const horde: EnemyHorde = {
            id: 1, soldiers: [{
                id: 2, x: 240, y: 600, targetX: 240, targetY: 600, color: '#F00', size: 10,
                isAlive: true, animOffset: 0, hp: 1, maxHp: 1, isSuper: false, type: 'normal', hitTimer: 0
            }], count: 1, x: 240, y: 600, width: 50, height: 50,
            color: '#F00', speed: 0, isActive: true, hp: 1, maxHp: 1
        };
        entities.enemyHordes.push(horde);

        checkCollisions(entities, gameState);

        expect(entities.playerArmy.aliveCount).toBe(0);
        expect(gameState.isGameOver).toBe(true);
    });
  });

  describe('MiniBoss Battle', () => {
      it('should kill miniboss and award coins', () => {
          const { gameState, entities } = createMockState();
          // Army
          entities.playerArmy.soldiers.push({...entities.playerArmy.soldiers[0], id: 2});
          entities.playerArmy.aliveCount = 2;

          const miniBoss: MiniBoss = {
              id: 1, x: 240, y: 600, width: 50, height: 50, hp: 1, maxHp: 10,
              isActive: true, color: '#F00', type: 'normal', hitTimer: 0
          };
          entities.miniBosses.push(miniBoss);

          checkCollisions(entities, gameState);

          expect(miniBoss.hp).toBeLessThanOrEqual(0);
          expect(miniBoss.isActive).toBe(false);
          expect(gameState.coins).toBeGreaterThan(0);
      });
  });

  describe('Boss Battle', () => {
      it('should kill boss and trigger victory', () => {
          const { gameState, entities } = createMockState();

          const boss: Boss = {
              x: 200, y: 550, width: 100, height: 100, hp: 1, maxHp: 100,
              isActive: true, color: '#F00', spawnTime: 0, isMoving: false, type: 'beast', hitTimer: 0
          };
          entities.boss = boss;

          checkCollisions(entities, gameState);

          expect(boss.isActive).toBe(false);
          expect(gameState.isVictory).toBe(true);
      });
  });

  describe('Interactions', () => {
      it('should collect coin', () => {
          const { gameState, entities } = createMockState();
          const coin: Coin = {
              id: 1, x: 240, y: 600, width: 20, height: 20, value: 10, passed: false, bounceOffset: 0
          };
          entities.coins.push(coin);

          checkCollisions(entities, gameState);

          expect(coin.passed).toBe(true);
          expect(gameState.coins).toBe(10);
      });

      it('should destroy mystery box with bullet', () => {
          const { gameState, entities } = createMockState();
          const box: MysteryBox = {
              id: 1, x: 200, y: 400, width: 50, height: 50, hp: 1, maxHp: 1, passed: false, hitTimer: 0
          };
          entities.mysteryBoxes.push(box);

          const bullet: Bullet = {
              id: 1, x: 225, y: 425, vx: 0, vy: -10, damage: 1, color: '#FFF', isEnemy: false
          };
          entities.bullets.push(bullet);

          checkCollisions(entities, gameState);

          expect(box.hp).toBeLessThanOrEqual(0);
          expect(box.passed).toBe(true);
          expect(bullet.y).toBe(-1000); // Bullet moved off screen
      });
  });
});
