
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock game.ts to prevent side effects
vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
  togglePause: vi.fn(),
}));

import { render, shareOnX, shareOnWhatsApp, prepareSoldiersToDraw, addFloatingText } from '../src/renderer';
import { GameState, Entities, Army, Gate, EnemyHorde, MiniBoss, MysteryBox, Bullet, Boss, Soldier } from '../src/types';
import { MAX_RENDERED_SOLDIERS } from '../src/constants';

// Mock Canvas Context
const ctx = document.createElement('canvas').getContext('2d')!;

function createMockState(): { gameState: GameState, entities: Entities } {
  const gameState: GameState = {
    isStarted: true,
    isGameOver: false,
    isVictory: false,
    isPaused: false,
    currentLevel: 1,
    score: 1000,
    highScore: 500, // Score > HighScore -> Record
    coins: 100,
    gameSpeed: 1,
    baseGameSpeed: 1,
    distanceTraveled: 1000,
    levelDistance: 5000,
    isBattling: false,
    battleTimer: 0,
    screenShakeActive: true,
    screenShakeIntensity: 5,
    screenShakeDuration: 100,
    screenShakeTimer: 100,
    lastFrameTime: 0,
    superCannonActive: true,
    superCannonTimer: 100,
    superCannonDuration: 3000,
    superCannonCooldown: 0,
    superCannonLastUsed: 0,
    superCannonReady: false,
    superCannonDamageMultiplier: 1,
    combo: 10,
    comboTimer: 100,
    maxCombo: 10,
    bossActive: true,
    bossAtmosphereIntensity: 1,
    newRecordReached: false,
    damageFlash: 0.5,
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

describe('Renderer Coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should render everything without crashing', () => {
    const { gameState, entities } = createMockState();

    // Populate Entities
    // Army: Normal, Super, Flash
    entities.playerArmy.soldiers.push({
        id: 1, x: 240, y: 600, targetX: 240, targetY: 600, color: '#000', size: 10,
        isAlive: true, animOffset: 0, hp: 1, maxHp: 1, isSuper: false, type: 'normal', hitTimer: 0
    });
    entities.playerArmy.soldiers.push({
        id: 2, x: 250, y: 600, targetX: 250, targetY: 600, color: '#FFD700', size: 10,
        isAlive: true, animOffset: 0, hp: 1, maxHp: 1, isSuper: true, type: 'normal', hitTimer: 10
    });
    entities.playerArmy.aliveCount = 2;

    // Gate
    entities.gates.push({
        id: 1, x: 200, y: 500, width: 80, height: 50, type: 'add', value: 5, color: '#0F0', side: 'left', passed: false
    });

    // Mystery Box
    entities.mysteryBoxes.push({
        id: 1, x: 300, y: 400, width: 50, height: 50, hp: 1, maxHp: 1, passed: false, hitTimer: 0
    });

    // Enemy Horde
    entities.enemyHordes.push({
        id: 1, soldiers: [{
             id: 3, x: 240, y: 200, targetX: 240, targetY: 200, color: '#F00', size: 10,
             isAlive: true, animOffset: 0, hp: 1, maxHp: 1, isSuper: false, type: 'normal', hitTimer: 0
        }], count: 1, x: 240, y: 200, width: 50, height: 50,
        color: '#F00', speed: 0, isActive: true, hp: 1, maxHp: 1
    });

    // Mini Boss
    entities.miniBosses.push({
        id: 1, x: 100, y: 100, width: 50, height: 50, hp: 10, maxHp: 10,
        isActive: true, color: '#F00', type: 'armored', hitTimer: 0
    });

    // Boss
    entities.boss = {
        x: 240, y: 50, width: 100, height: 100, hp: 100, maxHp: 100,
        isActive: true, color: '#F00', spawnTime: 0, isMoving: false, type: 'beast', hitTimer: 0
    };

    // Bullets
    entities.bullets.push({
        id: 1, x: 240, y: 550, vx: 0, vy: -10, damage: 1, color: '#FFF', isEnemy: false
    });

    // Add Floating Text
    addFloatingText("Test", 100, 100, '#FFF');

    render(ctx, entities, gameState);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('should verify MAX_RENDERED_SOLDIERS logic', () => {
      const army: Army = {
          soldiers: [], centerX: 0, centerY: 0, targetX: 0, color: '#000', isPlayer: true,
          fireRate: 1, lastShotTime: 0, damage: 1, aliveCount: 0
      };

      // Add more soldiers than MAX (e.g. 200)
      for(let i=0; i<300; i++) {
          army.soldiers.push({
              id: i, x: 0, y: i, targetX: 0, targetY: 0, color: '#000', size: 10,
              isAlive: true, animOffset: 0, hp: 1, maxHp: 1, isSuper: i < 50, type: 'normal', hitTimer: 0
          });
      }
      army.aliveCount = 300;

      const prepared = prepareSoldiersToDraw(army);

      // Should be limited or sampled
      // The implementation sets MAX_RENDERED_SOLDIERS (default 150 from constants).
      // But let's check if it respects it.
      // Wait, MAX_RENDERED_SOLDIERS is imported from constants.
      // prepareSoldiersToDraw uses QualityManager.settings.maxRenderedSoldiers which defaults to 150.

      expect(prepared.length).toBeLessThanOrEqual(MAX_RENDERED_SOLDIERS);

      // Verify supers are prioritized
      const supers = prepared.filter(s => s.isSuper);
      // We have 50 supers. All should be there if limit is > 50.
      expect(supers.length).toBe(50);
  });

  it('should share on X', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const gameState = { score: 100, currentLevel: 2 } as GameState;
      shareOnX(gameState);
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('twitter.com'), '_blank');
  });

  it('should share on WhatsApp', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const gameState = { score: 100, currentLevel: 2 } as GameState;
      shareOnWhatsApp(gameState);
      expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('whatsapp.com'), '_blank');
  });
});
