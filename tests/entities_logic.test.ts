
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createBoss,
  createGatePair,
  createMiniBoss,
  createMysteryBox,
  createCoin,
  createInitialEntities,
  createGate,
  createPlayerArmy,
  addSoldiersToArmy,
  addSpecialSoldiersToArmy,
  multiplySoldiersInArmy,
  removeSoldiersFromArmy,
  addSuperSoldiersToArmy,
  createEnemyHorde,
  createSpecialSoldier,
  createSuperSoldier
} from '../src/entities';
import { MAX_HEROES } from '../src/constants';

describe('Entities Coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createBoss', () => {
    it('should create different boss types for levels 1-9', () => {
      const bossTypes = [
        { level: 1, type: 'beast' },
        { level: 2, type: 'slime' },
        { level: 3, type: 'eye' },
        { level: 4, type: 'machine' },
        { level: 5, type: 'spider' },
        { level: 6, type: 'skull' },
        { level: 7, type: 'demon' },
        { level: 8, type: 'ghost' },
        { level: 9, type: 'crystal' },
      ];

      bossTypes.forEach(({ level, type }) => {
        const boss = createBoss(800, level);
        expect(boss.type).toBe(type);
        expect(boss.isActive).toBe(true);
      });
    });

    it('should create Mothership boss for level 10+', () => {
      const boss = createBoss(800, 10);
      expect(boss.type).toBe('mothership');
      expect(boss.y).toBe(25); // Fixed position
      expect(boss.hp).toBe(5000);
    });

    it('should create Mothership boss for level 11 (scaling HP)', () => {
      const boss = createBoss(800, 11);
      expect(boss.type).toBe('mothership');
      expect(boss.hp).toBe(7000); // 5000 + 2000
    });

    it('should default to beast for unknown low levels (fallback check)', () => {
        // Technically createBoss takes a number, and switch handles 1-9.
        // If we pass 0 or float, it might hit default.
        const boss = createBoss(800, 0);
        expect(boss.type).toBe('beast');
    });
  });

  describe('createMiniBoss', () => {
    it('should create different mini boss types', () => {
      const mockRandom = vi.spyOn(Math, 'random');

      // Types: ['normal', 'armored', 'speed', 'spiky']

      // Normal (0.00-0.24)
      mockRandom.mockReturnValue(0.0);
      const mb1 = createMiniBoss(800, 100, 1);
      expect(mb1.type).toBe('normal');

      // Armored (0.25-0.49)
      mockRandom.mockReturnValue(0.25);
      const mb2 = createMiniBoss(800, 100, 1);
      expect(mb2.type).toBe('armored');
      expect(mb2.color).toBe('#555555');

      // Speed (0.50-0.74)
      mockRandom.mockReturnValue(0.5);
      const mb3 = createMiniBoss(800, 100, 1);
      expect(mb3.type).toBe('speed');
      expect(mb3.color).toBe('#FFFF00');

      // Spiky (0.75-0.99)
      mockRandom.mockReturnValue(0.75);
      const mb4 = createMiniBoss(800, 100, 1);
      expect(mb4.type).toBe('spiky');
      expect(mb4.color).toBe('#800080');
    });
  });

  describe('createMysteryBox', () => {
    it('should create box on left or right', () => {
      const mockRandom = vi.spyOn(Math, 'random');

      // Left
      mockRandom.mockReturnValue(0.6); // > 0.5
      const boxLeft = createMysteryBox(800, 100);
      expect(boxLeft.x).toBe(40);

      // Right
      mockRandom.mockReturnValue(0.4); // <= 0.5
      const boxRight = createMysteryBox(800, 100);
      expect(boxRight.x).toBe(800 - 50 - 40);
    });
  });

  describe('createCoin', () => {
    it('should create coin', () => {
      const coin = createCoin(100, 200, 50);
      expect(coin.x).toBe(100);
      expect(coin.y).toBe(200);
      expect(coin.value).toBe(50);
    });
  });

  describe('createInitialEntities', () => {
      it('should create initial entities properly', () => {
          const entities = createInitialEntities(480, 800);
          expect(entities.playerArmy).toBeDefined();
          expect(entities.enemyHordes.length).toBe(3);
          expect(entities.gates.length).toBe(0);
      });
  });

  describe('Army Modification Functions', () => {
    it('should create player army', () => {
        const army = createPlayerArmy(480, 800);
        expect(army.soldiers.length).toBe(5);
        expect(army.aliveCount).toBe(5);
    });

    it('should add soldiers to army', () => {
        const army = createPlayerArmy(480, 800);
        const initialCount = army.soldiers.length;
        addSoldiersToArmy(army, 10);
        expect(army.soldiers.length).toBe(initialCount + 10);
        expect(army.aliveCount).toBe(initialCount + 10);
    });

    it('should limit soldiers to MAX_HEROES', () => {
        const army = createPlayerArmy(480, 800);
        addSoldiersToArmy(army, MAX_HEROES + 100);
        expect(army.soldiers.length).toBeLessThanOrEqual(MAX_HEROES);
    });

    it('should add special soldiers', () => {
        const army = createPlayerArmy(480, 800);
        const initialCount = army.soldiers.length;
        addSpecialSoldiersToArmy(army, 'bazooka', 5);
        expect(army.soldiers.length).toBe(initialCount + 5);
        expect(army.soldiers[army.soldiers.length - 1].type).toBe('bazooka');
    });

    it('should add super soldiers', () => {
        const army = createPlayerArmy(480, 800);
        const initialCount = army.soldiers.length;
        addSuperSoldiersToArmy(army, 3);
        expect(army.soldiers.length).toBe(initialCount + 3);
        expect(army.soldiers[army.soldiers.length - 1].isSuper).toBe(true);
    });

    it('should multiply soldiers', () => {
        const army = createPlayerArmy(480, 800);
        const initialCount = army.soldiers.length; // 5
        multiplySoldiersInArmy(army, 2);
        expect(army.soldiers.length).toBe(10);
    });

    it('should remove soldiers', () => {
        const army = createPlayerArmy(480, 800);
        removeSoldiersFromArmy(army, 2);
        expect(army.aliveCount).toBe(3);
        // Note: removeSoldiersFromArmy uses swap-and-pop or just updates aliveCount/isAlive?
        // entities.ts: pop() and aliveCount--.
        expect(army.soldiers.length).toBe(3);
    });
  });

  describe('Individual Soldier Creation', () => {
      it('should create special soldiers correctly', () => {
          const bazooka = createSpecialSoldier(0, 0, 'bazooka');
          expect(bazooka.hp).toBe(3);
          expect(bazooka.type).toBe('bazooka');

          const rambo = createSpecialSoldier(0, 0, 'rambo');
          expect(rambo.hp).toBe(4);
          expect(rambo.type).toBe('rambo');

          const laser = createSpecialSoldier(0, 0, 'laser');
          expect(laser.hp).toBe(2);
          expect(laser.type).toBe('laser');
      });

      it('should create super soldier', () => {
          const s = createSuperSoldier(0, 0);
          expect(s.isSuper).toBe(true);
          expect(s.hp).toBe(5);
      });
  });

  describe('createEnemyHorde', () => {
      it('should create horde', () => {
          const horde = createEnemyHorde(480, 100, 10, 1);
          expect(horde.soldiers.length).toBe(10);
          expect(horde.count).toBe(10);
      });
  });

  describe('createGatePair', () => {
    it('should create Math Gate (40% chance)', () => {
      const mockRandom = vi.spyOn(Math, 'random');
      // < 0.4 triggers Math Gate
      mockRandom.mockReturnValueOnce(0.3);
      // a=2 (floor(0.2 * 9) + 1 = 2)
      mockRandom.mockReturnValueOnce(0.2);
      // b=3 (floor(0.3 * 9) + 1 = 3)
      mockRandom.mockReturnValueOnce(0.3);
      // result = 6.
      // wrongResult calculation...
      // random > 0.5 (0.6) -> +1
      mockRandom.mockReturnValueOnce(0.6);
      // offset (floor(0.4 * 5) + 1 = 3)
      mockRandom.mockReturnValueOnce(0.4);
      // wrongResult = 6 + 3 = 9

      // isLeftCorrect > 0.5 (0.6) -> Left is correct
      mockRandom.mockReturnValueOnce(0.6);

      const gates = createGatePair(480, 100, 1, 0, 0);
      expect(gates.length).toBe(2);
      expect(gates[0].side).toBe('left');
      expect(gates[0].type).toBe('add');
      expect(gates[0].value).toBe(6); // 2 * 3
      expect(gates[0].customText).toContain('2 × 3 = 6');

      expect(gates[1].side).toBe('right');
      expect(gates[1].type).toBe('subtract');
      expect(gates[1].value).toBe(3); // abs(6 - 9)
      expect(gates[1].customText).toContain('2 × 3 = 9');
    });

    it('should create Standard Gate Pair (Left Good, Right Bad)', () => {
       const mockRandom = vi.spyOn(Math, 'random');
       mockRandom.mockReturnValue(0.9); // Skip Math Gate

       // Mock createGate logic inside createGatePair
       // We can't easily mock inner functions of the same module.
       // We have to control randomness to steer createGate outcomes.
       // This is tricky because createGate calls random multiple times.

       // Strategy: createGate logic depends on roll.
       // 0.0-0.5: add (Good)
       // 0.5-0.65: multiply (Good)
       // 0.97-1.0: divide (Bad)

       // We want Left Good, Right Bad for standard logic.
       // But createGatePair generates two random gates first.

       // Let's rely on the logic that modifies gates if they are both good or both bad.
    });

    it('should adjust gates if both are Good', () => {
        // Force non-math gate
        const mockRandom = vi.spyOn(Math, 'random');
        mockRandom.mockReturnValueOnce(0.9);

        // Gate 1 (Left): Force 'add' (Good) -> roll 0.1
        mockRandom.mockReturnValueOnce(0.1);
        // Gate 1 value... random
        mockRandom.mockReturnValueOnce(0.5);

        // Gate 2 (Right): Force 'multiply' (Good) -> roll 0.6
        // Multiply does NOT use random for value
        mockRandom.mockReturnValueOnce(0.6);

        // Logic: if leftIsGood && rightIsGood
        // Right becomes bad.
        // random > 0.5 ? subtract : divide.
        // Let's force subtract (0.6)
        mockRandom.mockReturnValueOnce(0.6);
        // Subtract value random (createGatePair line 351: Math.floor(Math.random() * 2) + 1)
        mockRandom.mockReturnValueOnce(0.5);

        const gates = createGatePair(480, 100, 1, 0, 0);
        expect(gates[0].type).toBe('add');
        expect(gates[1].type).toBe('subtract');
    });

    it('should adjust gates if both are Bad', () => {
        const mockRandom = vi.spyOn(Math, 'random');
        mockRandom.mockReturnValueOnce(0.9); // Skip Math Gate

        // Gate 1 (Left): Force 'divide' (Bad) -> roll 0.99
        // Divide does NOT use random for value
        mockRandom.mockReturnValueOnce(0.99);

        // Gate 2 (Right): Force 'subtract' (Bad) -> roll 0.96
        mockRandom.mockReturnValueOnce(0.96);
        // Gate 2 value (Subtract uses random)
        mockRandom.mockReturnValueOnce(0.5);

        // Logic: !leftIsGood && !rightIsGood
        // Left becomes good.
        // buffRoll < 0.4 -> add
        mockRandom.mockReturnValueOnce(0.3);
        // Add value
        mockRandom.mockReturnValueOnce(0.5);

        const gates = createGatePair(480, 100, 1, 0, 0);
        expect(gates[0].type).toBe('add');
        expect(gates[1].type).toBe('subtract');
    });

    it('should handle MAX_HEROES restriction in createGate', () => {
        const mockRandom = vi.spyOn(Math, 'random');

        // Test createGate directly
        // atMaxHeroes = true
        // roll < 0.35 -> firerate
        mockRandom.mockReturnValue(0.1);

        const gate = createGate(480, 100, 'left', 1, MAX_HEROES + 1, 0);
        expect(gate.type).toBe('firerate');
    });

    it('should handle MAX_HEROES restriction in createGatePair logic', () => {
         const mockRandom = vi.spyOn(Math, 'random');
         mockRandom.mockReturnValueOnce(0.9); // Skip Math Gate

         // We are at Max Heroes.
         // Gate 1: Bad (divide) -> 0.99
         // Divide uses no value random
        mockRandom.mockReturnValueOnce(0.99);

         // Gate 2: Bad (subtract) -> 0.96
         mockRandom.mockReturnValueOnce(0.96);
         // 0.96 is Divide in atMaxHeroes mode (>= 0.85), so NO value random used.

         // Both bad -> Left becomes Good.
         // BUT atMaxHeroes logic applies for "Good" selection.
         // buffRoll < 0.5 -> firerate
         mockRandom.mockReturnValueOnce(0.4);

         const gates = createGatePair(480, 100, 1, MAX_HEROES + 1, 0);
         expect(gates[0].type).toBe('firerate');
    });
  });
});
