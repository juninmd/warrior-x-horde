import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import * as renderer from '../src/renderer';
import * as audio from '../src/audio';
import * as input from '../src/input';
import * as game from '../src/game';
import * as gameStateModule from '../src/gameState';
import * as entitiesModule from '../src/entities';
import * as utils from '../src/utils';
import { soldierPool } from '../src/soldierPool';
import { COLORS } from '../src/constants';

// Mock dependencies
vi.mock('../src/renderer', () => ({
  addFloatingText: vi.fn(),
  addExplosion: vi.fn(),
  addParticle: vi.fn(),
}));

vi.mock('../src/audio', () => ({
  playSound: vi.fn(),
  audioManager: {
    powerUp: 'powerUp',
    nerf: 'nerf',
  },
}));

vi.mock('../src/input', () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  triggerHitStop: vi.fn(),
}));

vi.mock('../src/gameState', () => ({
  saveGameProgress: vi.fn(),
}));

vi.mock('../src/entities', () => ({
  addSoldiersToArmy: vi.fn((army, count) => {
      // simulate adding soldiers
      for(let i=0; i<count; i++) army.soldiers.push({ isAlive: true } as any);
      army.aliveCount += count;
  }),
  multiplySoldiersInArmy: vi.fn((army, factor) => {
      const newCount = Math.floor(army.soldiers.length * factor) - army.soldiers.length;
      for(let i=0; i<newCount; i++) army.soldiers.push({ isAlive: true } as any);
      army.aliveCount += newCount;
  }),
  removeSoldiersFromArmy: vi.fn((army, count) => {
      let removed = 0;
      for(let i=army.soldiers.length-1; i>=0 && removed < count; i--) {
          army.soldiers.pop();
          removed++;
      }
      army.aliveCount = army.soldiers.length;
  }),
  addSuperSoldiersToArmy: vi.fn((army, count) => {
      for(let i=0; i<count; i++) army.soldiers.push({ isAlive: true, isSuper: true } as any);
      army.aliveCount += count;
  }),
  addSpecialSoldiersToArmy: vi.fn((army, type, count) => {
      for(let i=0; i<count; i++) army.soldiers.push({ isAlive: true, type } as any);
      army.aliveCount += count;
  }),
}));

vi.mock('../src/soldierPool', () => ({
  soldierPool: {
    release: vi.fn(),
  },
}));

describe('Collisions System', () => {
  let mockGameState: any;
  let mockEntities: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    mockGameState = {
      score: 0,
      coins: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      currentLevel: 1,
      damageFlash: 0,
      killStreak: 0,
      killStreakTimer: 0,
      isBattling: false,
      isGameOver: false,
      isDying: false,
      highScore: 100,
      whiteFlash: 0,
      slowMoTimer: 0,
      isVictory: false,
      bossActive: false,
    };

    mockEntities = {
      playerArmy: {
        soldiers: [],
        aliveCount: 0,
        centerX: 100,
        fireRate: 100,
        damage: 1,
      },
      gates: [],
      enemyHordes: [],
      miniBosses: [],
      mysteryBoxes: [],
      coins: [],
      bullets: [],
      boss: { isActive: false, x: 0, y: 0, width: 0, height: 0, hp: 0 },
    };

    // Initialize army with some soldiers
    for(let i=0; i<10; i++) {
        mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true });
    }
    mockEntities.playerArmy.aliveCount = 10;
  });

  // --- GATE TESTS ---

  it('should handle ADD gate', () => {
    const gate = { id: 1, type: 'add', value: 5, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);

    // Mock getArmyBounds to intersect
    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(entitiesModule.addSoldiersToArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 5);
    expect(renderer.addFloatingText).toHaveBeenCalledWith('+5', expect.any(Number), expect.any(Number), COLORS.UI.SUCCESS, 1.2);
    expect(renderer.addParticle).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'shockwave', COLORS.UI.SUCCESS, 1);
    expect(audio.playSound).toHaveBeenCalledWith(audio.audioManager.powerUp);
    expect(input.triggerHaptic).toHaveBeenCalledWith('success');
  });

  it('should handle MULTIPLY gate', () => {
    const gate = { id: 1, type: 'multiply', value: 2, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);
    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(entitiesModule.multiplySoldiersInArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 2);
    expect(renderer.addFloatingText).toHaveBeenCalledWith('×2', expect.any(Number), expect.any(Number), COLORS.UI.INFO, 1.3);
  });

  it('should handle SUBTRACT gate', () => {
    const gate = { id: 1, type: 'subtract', value: 2, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);
    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(entitiesModule.removeSoldiersFromArmy).toHaveBeenCalled();
    expect(renderer.addFloatingText).toHaveBeenCalledWith('-2', expect.any(Number), expect.any(Number), COLORS.UI.DANGER);
    expect(audio.playSound).toHaveBeenCalledWith(audio.audioManager.nerf);
  });

  it('should handle DIVIDE gate', () => {
    const gate = { id: 1, type: 'divide', value: 2, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);
    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(entitiesModule.removeSoldiersFromArmy).toHaveBeenCalled();
    expect(renderer.addFloatingText).toHaveBeenCalledWith('÷2', expect.any(Number), expect.any(Number), '#9B59B6');
  });

  it('should pass sibling gates', () => {
      const gate1 = { id: 1, type: 'add', value: 5, x: 50, y: 500, width: 40, height: 10, passed: false };
      const gate2 = { id: 2, type: 'multiply', value: 2, x: 150, y: 500, width: 40, height: 10, passed: false };
      mockEntities.gates.push(gate1, gate2);

      // Hit gate1
      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 60, right: 80, top: 490, bottom: 510 });
      // Mock army center X to align with gate1
      mockEntities.playerArmy.centerX = 60;

      checkCollisions(mockEntities, mockGameState);

      expect(gate1.passed).toBe(true);
      expect(gate2.passed).toBe(true); // Sibling passed
  });

  // --- BATTLE TESTS ---

  it('should process battle with horde', () => {
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }, { isAlive: true, x: 100, y: 500 }],
          count: 2
      };
      mockEntities.enemyHordes.push(horde);

      // Overlap
      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.isBattling).toBe(true);
      expect(renderer.addExplosion).toHaveBeenCalled();
      // Should kill 1 player and 1 enemy per frame (casualties = min(1, p, e))
      expect(mockEntities.playerArmy.aliveCount).toBe(9);
      // cleanupDeadSoldiers removes dead ones, so length should decrease
      expect(horde.soldiers.length).toBe(1);
  });

  it('should clear horde and grant victory', () => {
      // Horde with 1 soldier that will be killed
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }],
          count: 1
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(horde.isActive).toBe(false);
      expect(mockGameState.combo).toBe(1);
      expect(renderer.addFloatingText).toHaveBeenCalledWith('VICTORY!', expect.any(Number), expect.any(Number), COLORS.UI.GOLD, 1.3);
      expect(input.triggerHaptic).toHaveBeenCalledWith('medium');
  });

  it('should process combo milestones on victory', () => {
      const createHorde = () => ({
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }],
          count: 1
      });

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      // Combo 4 -> 5
      mockGameState.combo = 4;
      mockEntities.enemyHordes = [createHorde()];
      checkCollisions(mockEntities, mockGameState);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("GREAT!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');

      // Combo 9 -> 10
      mockGameState.combo = 9;
      mockEntities.enemyHordes = [createHorde()];
      checkCollisions(mockEntities, mockGameState);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("EPIC!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');

      // Combo 19 -> 20
      mockGameState.combo = 19;
      mockEntities.enemyHordes = [createHorde()];
      checkCollisions(mockEntities, mockGameState);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("LEGENDARY!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');

      // Combo 49 -> 50
      mockGameState.combo = 49;
      mockEntities.enemyHordes = [createHorde()];
      checkCollisions(mockEntities, mockGameState);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("UNSTOPPABLE!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
  });

  it('should process killstreak milestones', () => {
       const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: Array(10).fill(null).map(() => ({ isAlive: true, x: 100, y: 500 })),
          count: 10
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      // Force high casualty count via code mod or just loop?
      // In processBattle, casualties = Math.min(1, playerCount, enemyCount).
      // So it kills 1 per frame.

      // To test killstreak, we need to call checkCollisions multiple times or fake the state
      mockGameState.killStreak = 4;
      checkCollisions(mockEntities, mockGameState);
      expect(mockGameState.killStreak).toBe(5);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("KILLING SPREE", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');

      // Test other milestones
      mockGameState.killStreak = 9;
      checkCollisions(mockEntities, mockGameState);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("RAMPAGE!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');

      mockGameState.killStreak = 19;
      checkCollisions(mockEntities, mockGameState);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("DOMINATING!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');

      mockGameState.killStreak = 49;
      checkCollisions(mockEntities, mockGameState);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("UNSTOPPABLE!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');

      mockGameState.killStreak = 99;
      checkCollisions(mockEntities, mockGameState);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("GODLIKE!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
  });

  // --- MINIBOSS TESTS ---

  it('should process miniboss battle', () => {
      const mb = { isActive: true, x: 100, y: 500, width: 60, height: 60, hp: 100, maxHp: 100 };
      mockEntities.miniBosses.push(mb);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'getEntityBounds').mockReturnValue({ left: 100, right: 160, top: 500, bottom: 560 }); // Mock intersection
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.isBattling).toBe(true);
      expect(mb.hp).toBeLessThan(100);
      expect(mockEntities.playerArmy.aliveCount).toBe(9); // 1 casualty
  });

  it('should defeat miniboss', () => {
      const mb = { isActive: true, x: 100, y: 500, width: 60, height: 60, hp: 1, maxHp: 100 };
      mockEntities.miniBosses.push(mb);
      // High army count to kill it in one tick (damage = count * 0.5)

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mb.isActive).toBe(false);
      expect(mockGameState.coins).toBe(50);
      expect(renderer.addFloatingText).toHaveBeenCalledWith('MINI-BOSS DEFEATED!', expect.any(Number), expect.any(Number), '#FF4500', 1.4);
  });

  // --- MYSTERY BOX TESTS ---

  it('should apply mystery box effect', () => {
      const box = { passed: false, x: 100, y: 500, width: 30, height: 30, hp: 10 };
      mockEntities.mysteryBoxes.push(box);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);
      // Mock random for deterministic effect (e.g., 0 = reinforcements)
      vi.spyOn(Math, 'random').mockReturnValue(0.0);

      checkCollisions(mockEntities, mockGameState);

      expect(box.passed).toBe(true);
      expect(entitiesModule.addSoldiersToArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 30);
      expect(renderer.addFloatingText).toHaveBeenCalledWith('REINFORCEMENTS!', expect.any(Number), expect.any(Number), COLORS.UI.SUCCESS, 1.2);
  });

  it('should handle bad mystery box effect', () => {
     const box = { passed: false, x: 100, y: 500, width: 30, height: 30, hp: 10 };
     mockEntities.mysteryBoxes.push(box);
     vi.spyOn(utils, 'checkBounds').mockReturnValue(true);
     // Mock random for divide (index 7)
     vi.spyOn(Math, 'random').mockReturnValue(0.75); // 0.75 * 10 = 7.5 -> 7

     checkCollisions(mockEntities, mockGameState);

     expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('DIVIDE'), expect.any(Number), expect.any(Number), COLORS.UI.DANGER);
  });

  it('should destroy mystery box with bullets', () => {
      // Move army away so it doesn't trigger box effect first
      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 0, right: 10, top: 0, bottom: 10 });

      const box = { passed: false, x: 100, y: 500, width: 30, height: 30, hp: 1 };
      mockEntities.mysteryBoxes.push(box);
      const bullet = { x: 110, y: 510, damage: 1, isEnemy: false };
      mockEntities.bullets.push(bullet);

      checkCollisions(mockEntities, mockGameState);

      expect(box.passed).toBe(true);
      expect(bullet.y).toBe(-1000); // Bullet removed
      expect(renderer.addFloatingText).toHaveBeenCalledWith('DESTROYED!', expect.any(Number), expect.any(Number), '#FFFFFF');
  });

  // --- COIN TESTS ---

  it('should collect coin', () => {
      const coin = { passed: false, x: 100, y: 500, width: 20, height: 20, value: 10 };
      mockEntities.coins.push(coin);
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(coin.passed).toBe(true);
      expect(mockGameState.coins).toBe(10);
      expect(renderer.addFloatingText).toHaveBeenCalledWith('+$10', expect.any(Number), expect.any(Number), COLORS.UI.GOLD);
  });

  // --- BOSS TESTS ---

  it('should battle boss', () => {
      const boss = { isActive: true, x: 100, y: 500, width: 100, height: 100, hp: 1000, maxHp: 1000, type: 'beast' };
      mockEntities.boss = boss;

      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.isBattling).toBe(true);
      expect(boss.hp).toBe(995); // 1000 - 5 contact damage
      expect(mockEntities.playerArmy.aliveCount).toBe(8); // 2 casualties
  });

  it('should defeat boss', () => {
      const boss = { isActive: true, x: 100, y: 500, width: 100, height: 100, hp: 1, maxHp: 1000 };
      mockEntities.boss = boss;
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(boss.isActive).toBe(false);
      expect(mockGameState.isVictory).toBe(true);
      expect(renderer.addFloatingText).toHaveBeenCalledWith('BOSS DEFEATED!', expect.any(Number), expect.any(Number), COLORS.UI.GOLD, 2.0);
  });

  // --- PLAYER DEATH ---

  it('should trigger player death when army is empty', () => {
      mockEntities.playerArmy.soldiers = [];
      mockEntities.playerArmy.aliveCount = 0;

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.isDying).toBe(true);
      expect(input.triggerHaptic).toHaveBeenCalledWith('failure');
      expect(gameStateModule.saveGameProgress).toHaveBeenCalled();
  });

  it('should handle state inconsistency gracefully (aliveCount > 0 but no soldiers)', () => {
      // Corrupted state: aliveCount says 10, but array is empty
      mockEntities.playerArmy.aliveCount = 10;
      mockEntities.playerArmy.soldiers = [];

      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [],
          count: 10 // Corrupted horde too
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      // Should not crash, loop should exit via i < 0 check
      checkCollisions(mockEntities, mockGameState);

      // killed should be 0
      expect(mockEntities.playerArmy.aliveCount).toBe(10); // No change
  });

  it('should ignore inactive or passed entities', () => {
      // Inactive horde
      mockEntities.enemyHordes.push({ isActive: false, x: 100, y: 500, width: 50, height: 50, soldiers: [], count: 0 });

      // Inactive miniboss
      mockEntities.miniBosses.push({ isActive: false, x: 100, y: 500, width: 60, height: 60, hp: 100, maxHp: 100 });

      // Passed mystery box
      mockEntities.mysteryBoxes.push({ passed: true, x: 100, y: 500, width: 30, height: 30, hp: 10 });

      // Passed coin
      mockEntities.coins.push({ passed: true, x: 100, y: 500, width: 20, height: 20, value: 10 });

      // Passed gate
      mockEntities.gates.push({ passed: true, x: 80, y: 500, width: 40, height: 10, type: 'add', value: 5 });

      // Inactive boss
      mockEntities.boss = { isActive: false, x: 100, y: 500, width: 100, height: 100, hp: 1000, maxHp: 1000 };

      // Overlapping bounds, but entities are inactive
      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Assert no interactions (no score change, no text)
      expect(renderer.addFloatingText).not.toHaveBeenCalled();
      expect(mockGameState.isBattling).toBe(false);
  });

  it('should handle no collisions (checkBounds returns false)', () => {
      // Active entities but far away
      mockEntities.enemyHordes.push({ isActive: true, x: 500, y: 500, width: 50, height: 50, soldiers: [], count: 0 });

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 0, right: 10, top: 0, bottom: 10 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(false);
      vi.spyOn(utils, 'getEntityBounds').mockReturnValue({ left: 500, right: 550, top: 480, bottom: 520 });

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.isBattling).toBe(false);
  });
});
