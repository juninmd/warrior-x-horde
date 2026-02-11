import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import * as renderer from '../src/renderer';
import * as audio from '../src/audio';
import * as input from '../src/input';
import * as game from '../src/game';
import * as entitiesModule from '../src/entities';
import * as utils from '../src/utils';
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
          if(army.soldiers[i]) {
            army.soldiers.pop();
            removed++;
          }
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

describe('Collisions Coverage Final', () => {
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

  it('should handle DAMAGE gate', () => {
    const gate = { id: 1, type: 'damage', value: 2, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);

    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(mockEntities.playerArmy.damage).toBe(2);
    expect(renderer.addFloatingText).toHaveBeenCalledWith('⚔️ DMG x2!', expect.any(Number), expect.any(Number), COLORS.UI.ACCENT);
  });

  it('should handle DAMAGE gate with default army damage', () => {
    const gate = { id: 1, type: 'damage', value: 2, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);
    mockEntities.playerArmy.damage = undefined; // Force || 1

    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(mockEntities.playerArmy.damage).toBe(2); // (undefined || 1) * 2 = 2
  });

  it('should handle small combos (2-4)', () => {
      // To hit the "first block" of processBattle where COMBO text is shown,
      // we need a horde that is active but has no alive soldiers (e.g. killed by bullets).
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: false, x: 100, y: 500 }], // Soldier already dead
          count: 1
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      // We want combo to be 2 AFTER increment. So start with 1.
      mockGameState.combo = 1;

      checkCollisions(mockEntities, mockGameState);

      // Now combo is 2.
      expect(mockGameState.combo).toBe(2);
      expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('2x COMBO!'), expect.any(Number), expect.any(Number), COLORS.UI.GOLD, 1.1);
  });

  it('should handle soldier deaths in horde battle (damageFlash)', () => {
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }, { isAlive: true, x: 100, y: 500 }],
          count: 2
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      // One soldier will die
      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.damageFlash).toBeGreaterThan(0);
      expect(mockEntities.playerArmy.aliveCount).toBe(9);
  });

  it('should handle killstreak > 0', () => {
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }],
          count: 1
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Enemy killed
      expect(mockGameState.killStreak).toBe(1);
  });

  it('should handle soldier deaths in MiniBoss battle', () => {
      const mb = { isActive: true, x: 100, y: 500, width: 60, height: 60, hp: 100, maxHp: 100 };
      mockEntities.miniBosses.push(mb);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'getEntityBounds').mockReturnValue({ left: 100, right: 160, top: 500, bottom: 560 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.damageFlash).toBeGreaterThan(0);
      expect(mockEntities.playerArmy.aliveCount).toBe(9);
  });

  it('should handle soldier deaths in Boss battle', () => {
      const boss = { isActive: true, x: 100, y: 500, width: 100, height: 100, hp: 1000, maxHp: 1000 };
      mockEntities.boss = boss;

      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.damageFlash).toBeGreaterThan(0);
      expect(mockEntities.playerArmy.aliveCount).toBe(8); // Boss kills 2
  });

  it('should destroy mystery box with bullet', () => {
      const box = { passed: false, x: 100, y: 500, width: 30, height: 30, hp: 1 };
      mockEntities.mysteryBoxes.push(box);
      // Bullet hitting box
      const bullet = { x: 110, y: 510, damage: 1, isEnemy: false };
      mockEntities.bullets.push(bullet);

      checkCollisions(mockEntities, mockGameState);

      expect(box.passed).toBe(true);
      expect(bullet.y).toBe(-1000); // Bullet removed
      expect(renderer.addFloatingText).toHaveBeenCalledWith('DESTROYED!', expect.any(Number), expect.any(Number), '#FFFFFF');
  });

  it('should NOT destroy mystery box with enemy bullet', () => {
      const box = { passed: false, x: 100, y: 500, width: 30, height: 30, hp: 1 };
      mockEntities.mysteryBoxes.push(box);
      const bullet = { x: 110, y: 510, damage: 1, isEnemy: true }; // Enemy bullet
      mockEntities.bullets.push(bullet);

      checkCollisions(mockEntities, mockGameState);

      expect(box.passed).toBe(false);
      expect(bullet.y).toBe(510); // Not removed
  });

  it('should handle multiple bullets hitting mystery box (second one ignores)', () => {
      const box = { passed: false, x: 100, y: 500, width: 30, height: 30, hp: 1 };
      mockEntities.mysteryBoxes.push(box);
      const bullet1 = { x: 110, y: 510, damage: 1, isEnemy: false };
      const bullet2 = { x: 110, y: 510, damage: 1, isEnemy: false };
      mockEntities.bullets.push(bullet1, bullet2);

      checkCollisions(mockEntities, mockGameState);

      expect(box.passed).toBe(true);
      expect(bullet1.y).toBe(-1000); // Both processed?
      expect(bullet2.y).toBe(-1000);
      // But only one explosion/text ideally
      expect(renderer.addFloatingText).toHaveBeenCalledTimes(1);
  });

  it('should handle coin collision bounds (false)', () => {
      const coin = { passed: false, x: 100, y: 500, width: 20, height: 20, value: 10 };
      mockEntities.coins.push(coin);
      vi.spyOn(utils, 'checkBounds').mockReturnValue(false);

      checkCollisions(mockEntities, mockGameState);

      expect(coin.passed).toBe(false);
  });

  it('should handle Boss collision with 0 soldiers', () => {
      const boss = { isActive: true, x: 100, y: 500, width: 100, height: 100, hp: 1000, maxHp: 1000 };
      mockEntities.boss = boss;
      mockEntities.playerArmy.soldiers = []; // No soldiers
      mockEntities.playerArmy.aliveCount = 0;

      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.isBattling).toBe(true);
      expect(mockGameState.damageFlash).toBe(0); // No flash as no one died
  });

  it('should handle mixed dead/alive soldiers in MiniBoss battle (skip dead)', () => {
      const mb = { isActive: true, x: 100, y: 500, width: 60, height: 60, hp: 100, maxHp: 100 };
      mockEntities.miniBosses.push(mb);

      // The loop iterates backwards: i = length - 1 down to 0.
      // Casualties = 1.
      // We want to hit the `continue` (skip dead) branch AND the process logic.

      // Index 2 (last): Alive. Will be processed and killed. Loop breaks if we don't add enough casualties?
      // Actually, casualties is just a limit.

      // Let's set up:
      // Index 2: Dead (Hit continue)
      // Index 1: Alive (Processed, killed)
      // Index 0: Alive (Alive)

      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true }); // Index 10 (from setup)
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true }); // Index 11
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: false }); // Index 12 (Last)

      mockEntities.playerArmy.aliveCount += 2; // +2 alive

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'getEntityBounds').mockReturnValue({ left: 100, right: 160, top: 500, bottom: 560 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Dead soldier (index 12) skipped -> hits `continue`
      // Alive soldier (index 11) processed -> killed
      // Loop condition `killed >= casualties` (1 >= 1) -> break

      expect(mockGameState.damageFlash).toBeGreaterThan(0);
  });

  it('should handle mixed dead/alive soldiers in Boss battle', () => {
      const boss = { isActive: true, x: 100, y: 500, width: 100, height: 100, hp: 1000, maxHp: 1000 };
      mockEntities.boss = boss;

      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: false });
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true });
      mockEntities.playerArmy.aliveCount++;

      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.damageFlash).toBeGreaterThan(0);
  });

  it('should handle loop exit by casualty limit in MiniBoss battle', () => {
      const mb = { isActive: true, x: 100, y: 500, width: 60, height: 60, hp: 100, maxHp: 100 };
      mockEntities.miniBosses.push(mb);

      // Add 2 soldiers. Limit is 1.
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true });
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true });
      mockEntities.playerArmy.aliveCount += 2;

      vi.spyOn(utils, 'getEntityBounds').mockReturnValue({ left: 100, right: 160, top: 500, bottom: 560 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Should kill 1. Start was 12.
      expect(mockEntities.playerArmy.aliveCount).toBe(11);
  });

  it('should handle loop exit by casualty limit in Boss battle', () => {
      const boss = { isActive: true, x: 100, y: 500, width: 100, height: 100, hp: 1000, maxHp: 1000 };
      mockEntities.boss = boss;

      // Add 3 soldiers. Limit is 2.
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true });
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true });
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true });
      mockEntities.playerArmy.aliveCount += 3; // 13 total

      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Should kill 2. Start was 13.
      expect(mockEntities.playerArmy.aliveCount).toBe(11);
  });

  it('should handle mixed dead/alive soldiers in Horde battle (player side)', () => {
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }],
          count: 1
      };
      mockEntities.enemyHordes.push(horde);

      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: false });
      mockEntities.playerArmy.soldiers.push({ x: 100, y: 500, isAlive: true });
      mockEntities.playerArmy.aliveCount++;

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.damageFlash).toBeGreaterThan(0);
  });

  it('should handle mixed dead/alive soldiers in Horde battle (enemy side)', () => {
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [
              { isAlive: false, x: 100, y: 500 },
              { isAlive: true, x: 100, y: 500 }
          ],
          count: 1
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Enemy killstreak should increase
      expect(mockGameState.killStreak).toBe(1);
  });

  it('should handle mini boss bounds checking (false)', () => {
       const mb = { isActive: true, x: 100, y: 500, width: 60, height: 60, hp: 100, maxHp: 100 };
      mockEntities.miniBosses.push(mb);

      vi.spyOn(utils, 'checkBounds').mockReturnValue(false); // No collision

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.isBattling).toBe(false);
  });
});
