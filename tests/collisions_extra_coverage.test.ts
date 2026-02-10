import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkCollisions } from '../src/collisions';
import * as renderer from '../src/renderer';
import * as audio from '../src/audio';
import * as input from '../src/input';
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
  addSoldiersToArmy: vi.fn(),
  multiplySoldiersInArmy: vi.fn(),
  removeSoldiersFromArmy: vi.fn(),
  addSuperSoldiersToArmy: vi.fn(),
  addSpecialSoldiersToArmy: vi.fn(),
}));

vi.mock('../src/soldierPool', () => ({
  soldierPool: {
    release: vi.fn(),
  },
}));

describe('Collisions Extra Coverage', () => {
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
  });

  it('should handle FIRERATE gate', () => {
    const gate = { id: 1, type: 'firerate', value: 0.8, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);
    mockEntities.playerArmy.soldiers.push({ isAlive: true });

    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(mockEntities.playerArmy.fireRate).toBe(80); // 100 * 0.8
    expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('Fire Rate'), expect.any(Number), expect.any(Number), expect.any(String), 1.2);
  });

  it('should handle DAMAGE gate', () => {
    const gate = { id: 1, type: 'damage', value: 2, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);
    mockEntities.playerArmy.soldiers.push({ isAlive: true });

    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(mockEntities.playerArmy.damage).toBe(2);
    expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('DMG'), expect.any(Number), expect.any(Number), COLORS.UI.ACCENT);
  });

  it('should handle SUPERWARRIOR gate', () => {
    const gate = { id: 1, type: 'superwarrior', value: 3, x: 80, y: 500, width: 40, height: 10, passed: false };
    mockEntities.gates.push(gate);
    mockEntities.playerArmy.soldiers.push({ isAlive: true });

    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 90, right: 110, top: 490, bottom: 510 });

    checkCollisions(mockEntities, mockGameState);

    expect(gate.passed).toBe(true);
    expect(entitiesModule.addSuperSoldiersToArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 3);
  });

  it('should trigger killstreak milestones during battle', () => {
    const horde = {
      isActive: true, x: 100, y: 500, width: 50, height: 50,
      soldiers: Array(10).fill(null).map(() => ({ isAlive: true, x: 100, y: 500 })),
      count: 10
    };
    mockEntities.enemyHordes.push(horde);
    // Player has many soldiers
    mockEntities.playerArmy.soldiers = Array(10).fill(null).map(() => ({ isAlive: true, x: 100, y: 500 }));
    mockEntities.playerArmy.aliveCount = 10;

    vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
    vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

    // Initial battle - kill 1 enemy
    checkCollisions(mockEntities, mockGameState);
    expect(mockGameState.killStreak).toBe(1);

    // Force killstreak to 4
    mockGameState.killStreak = 4;
    checkCollisions(mockEntities, mockGameState);
    expect(mockGameState.killStreak).toBe(5);
    expect(renderer.addFloatingText).toHaveBeenCalledWith('KILLING SPREE', expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
  });

  it('should update high score on death', () => {
    mockEntities.playerArmy.aliveCount = 0;
    mockGameState.score = 200;
    mockGameState.highScore = 100;

    checkCollisions(mockEntities, mockGameState);

    expect(mockGameState.highScore).toBe(200);
  });

  it('should apply mystery box effects', () => {
    // Helper to test mystery box effects
    const testEffect = (randomIndex: number, expectedCall: any) => {
       vi.restoreAllMocks();
       mockEntities.mysteryBoxes = [{ passed: false, x: 100, y: 500, width: 30, height: 30, hp: 10 }];
       vi.spyOn(Math, 'random').mockReturnValue(randomIndex);
       vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

       checkCollisions(mockEntities, mockGameState);
       if (expectedCall) expectedCall();
    };

    // Effects list:
    // 'reinforcements', 'nuke', 'double', 'invincible', 'bazooka', 'rambo', 'laser', 'divide', 'subtract', 'slow'
    // 0 -> reinforcements (covered)
    // 1 -> nuke
    // 2 -> double
    // 3 -> invincible
    // 4 -> bazooka
    // 5 -> rambo
    // 6 -> laser
    // 7 -> divide
    // 8 -> subtract
    // 9 -> slow

    // Nuke (index 1 = 0.1)
    testEffect(0.15, () => {
        // Need to add a horde to test the nuke effect loop
        mockEntities.enemyHordes.push({ isActive: true, y: 400, x: 100, width: 50, height: 50, soldiers: [] });
        // Call checkCollisions again manually or rely on testEffect?
        // testEffect resets mocks and calls checkCollisions.
        // But mockEntities is a reference.
        // However, testEffect overrides mockEntities.mysteryBoxes.
        // I need to add horde BEFORE calling testEffect?
        // No, testEffect is a helper that runs checkCollisions.
        // I should probably manually test 'nuke' with hordes.
    });
    // Re-doing Nuke manually below

    // Double (index 2 = 0.2)
    testEffect(0.25, () => {
        expect(entitiesModule.multiplySoldiersInArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 2);
    });

    // Invincible (index 3 = 0.3)
    testEffect(0.35, () => {
        expect(entitiesModule.addSuperSoldiersToArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 5);
    });

    // Bazooka (index 4 = 0.4)
    testEffect(0.45, () => {
        expect(entitiesModule.addSpecialSoldiersToArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 'bazooka', 8);
    });

    // Rambo (index 5 = 0.5)
    testEffect(0.55, () => {
        expect(entitiesModule.addSpecialSoldiersToArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 'rambo', 5);
    });

    // Laser (index 6 = 0.6)
    testEffect(0.65, () => {
        expect(entitiesModule.addSpecialSoldiersToArmy).toHaveBeenCalledWith(mockEntities.playerArmy, 'laser', 6);
    });

    // Divide (index 7 = 0.7)
    testEffect(0.75, () => {
         expect(renderer.addFloatingText).toHaveBeenCalledWith('DIVIDE & CONQUERED!', expect.any(Number), expect.any(Number), COLORS.UI.DANGER);
    });

    // Subtract (index 8 = 0.8)
    testEffect(0.85, () => {
         expect(renderer.addFloatingText).toHaveBeenCalledWith('AMBUSH!', expect.any(Number), expect.any(Number), COLORS.UI.DANGER);
    });

    // Slow (index 9 = 0.9)
    testEffect(0.95, () => {
        expect(renderer.addFloatingText).toHaveBeenCalledWith('JAMMED WEAPONS!', expect.any(Number), expect.any(Number), COLORS.UI.DANGER);
    });
  });

  it('should apply NUKE mystery box effect on hordes', () => {
      mockEntities.mysteryBoxes = [{ passed: false, x: 100, y: 500, width: 30, height: 30, hp: 10 }];
      mockEntities.enemyHordes = [
          { isActive: true, x: 100, y: 400, width: 50, height: 50, soldiers: [] }, // Should be nuked
          { isActive: true, x: 100, y: 900, width: 50, height: 50, soldiers: [] }  // Out of bounds (y > 800)
      ];

      vi.spyOn(Math, 'random').mockReturnValue(0.15); // Nuke

      vi.spyOn(utils, 'checkBounds').mockImplementation((r1, r2) => {
          // Mock collision only for mystery box (y=500)
          // Horde0 is y=400 (top 375, bottom 425)
          // Horde1 is y=900 (top 875, bottom 925)
          // MysteryBox is y=500 (top 500, bottom 530)
          if (r2.top === 500) return true;
          return false;
      });

      checkCollisions(mockEntities, mockGameState);

      expect(mockEntities.enemyHordes[0].isActive).toBe(false);
      expect(mockEntities.enemyHordes[1].isActive).toBe(true);
      expect(renderer.addExplosion).toHaveBeenCalled();
  });

  it('should cleanup dead soldiers in gaps', () => {
      // Setup army with dead soldiers in between
      // [Alive(1), Dead(2), Alive(3), Alive(4)]
      // Battle kills from end, so Alive(4) dies.
      // Remaining: Alive(1), Dead(2), Alive(3).
      // Cleanup should keep 1 and 3.
      const soldiers = [
          { isAlive: true, id: 1 },
          { isAlive: false, id: 2 },
          { isAlive: true, id: 3 },
          { isAlive: true, id: 4 }
      ];
      mockEntities.playerArmy.soldiers = soldiers;
      mockEntities.playerArmy.aliveCount = 3;

      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }],
          count: 1
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Army should be compacted
      expect(mockEntities.playerArmy.soldiers.length).toBe(2);
      expect(mockEntities.playerArmy.soldiers[0].id).toBe(1);
      expect(mockEntities.playerArmy.soldiers[1].id).toBe(3);
  });

  it('should trigger damage flash on player death in battle', () => {
       const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }],
          count: 1
      };
      mockEntities.enemyHordes.push(horde);
      mockEntities.playerArmy.soldiers = [{ isAlive: true, x: 100, y: 500 }];
      mockEntities.playerArmy.aliveCount = 1;

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // 1 killed
      expect(mockGameState.damageFlash).toBeGreaterThan(0);
  });

  it('should handle already dead horde collision (Instant Win)', () => {
      // Horde active but no alive soldiers
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: false, x: 100, y: 500 }],
          count: 0
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      // Force combo to 50 to test the UNSTOPPABLE branch in early exit
      mockGameState.combo = 49;

      checkCollisions(mockEntities, mockGameState);

      expect(horde.isActive).toBe(false);
      expect(mockGameState.combo).toBe(50);
      expect(renderer.addFloatingText).toHaveBeenCalledWith("UNSTOPPABLE!", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number), 'critical');
  });

  it('should handle already dead MiniBoss collision (Instant Win)', () => {
      const mb = { isActive: true, x: 100, y: 500, width: 60, height: 60, hp: 0, maxHp: 100 };
      mockEntities.miniBosses.push(mb);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'getEntityBounds').mockReturnValue({ left: 100, right: 160, top: 500, bottom: 560 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mb.isActive).toBe(false);
      expect(renderer.addFloatingText).toHaveBeenCalledWith('MINI-BOSS DEFEATED!', expect.any(Number), expect.any(Number), '#FF4500', 1.4);
  });

  it('should handle collision when player is already dead (No-op)', () => {
      // Player dead
      mockEntities.playerArmy.soldiers = [];
      mockEntities.playerArmy.aliveCount = 0;

      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: true, x: 100, y: 500 }],
          count: 1
      };
      mockEntities.enemyHordes.push(horde);

      const mb = { isActive: true, x: 100, y: 600, width: 60, height: 60, hp: 100, maxHp: 100 };
      mockEntities.miniBosses.push(mb);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      // Collision with horde and miniboss
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Should return early, no battle processing (no casualties)
      expect(horde.soldiers.length).toBe(1);
      expect(mb.hp).toBe(100);
      expect(mockGameState.isBattling).toBe(true); // Flag is set before processing
  });

  it('should handle battle with mixed dead/alive soldiers (Branch Coverage)', () => {
      // Setup army with a dead soldier at the end
      // [Alive, Dead]
      // Casualties = 1.
      // Loop starts at end (Dead). Skips (isAlive false branch).
      // Moves to Alive. Kills it. Terminates.
      mockEntities.playerArmy.soldiers = [
          { isAlive: true, x: 100, y: 500, id: 1 },
          { isAlive: false, x: 100, y: 500, id: 2 }
      ];
      mockEntities.playerArmy.aliveCount = 1;

      // Horde also with mixed
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [
              { isAlive: true, x: 100, y: 500 },
              { isAlive: false, x: 100, y: 500 }
          ],
          count: 1
      };
      mockEntities.enemyHordes.push(horde);

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      // Alive soldier should be killed and then cleaned up
      expect(mockEntities.playerArmy.soldiers.length).toBe(0);
      // Same for horde
      expect(horde.soldiers.length).toBe(0);
  });

  it('should handle Instant Win when combo is NOT high score', () => {
      // Instant win condition
      const horde = {
          isActive: true, x: 100, y: 500, width: 50, height: 50,
          soldiers: [{ isAlive: false, x: 100, y: 500 }],
          count: 0
      };
      mockEntities.enemyHordes.push(horde);

      mockGameState.combo = 5;
      mockGameState.maxCombo = 10; // Higher than current

      vi.spyOn(utils, 'getArmyBounds').mockReturnValue({ left: 80, right: 120, top: 480, bottom: 520 });
      vi.spyOn(utils, 'checkBounds').mockReturnValue(true);

      checkCollisions(mockEntities, mockGameState);

      expect(mockGameState.maxCombo).toBe(10); // Should not update
      expect(mockGameState.combo).toBe(6);
  });
});
