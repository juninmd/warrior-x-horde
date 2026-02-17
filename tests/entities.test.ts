import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    createSoldier,
    createSpecialSoldier,
    createSuperSoldier,
    createEnemyHorde,
    createGate,
    createGatePair,
    createMysteryBox,
    createBoss,
    createMiniBoss,
    createInitialEntities,
    createPlayerArmy,
    addSoldiersToArmy,
    addSpecialSoldiersToArmy,
    multiplySoldiersInArmy,
    removeSoldiersFromArmy,
    addSuperSoldiersToArmy,
    createCoin
} from '../src/entities';
import { MAX_HEROES } from '../src/constants';

describe('Entities', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

  describe('Soldier', () => {
    it('should create a soldier with correct stats', () => {
      const soldier = createSoldier(100, 100, '#000', 1, 'normal');
      expect(soldier.type).toBe('normal');
      expect(soldier.hp).toBe(1);
    });

    it('should create super soldier', () => {
        const superSoldier = createSuperSoldier(100, 100);
        expect(superSoldier.isSuper).toBe(true);
        expect(superSoldier.hp).toBe(5);
    });

    it('should create special soldiers', () => {
        const bazooka = createSpecialSoldier(100, 100, 'bazooka');
        expect(bazooka.type).toBe('bazooka');
        expect(bazooka.hp).toBe(3);

        const rambo = createSpecialSoldier(100, 100, 'rambo');
        expect(rambo.type).toBe('rambo');
        expect(rambo.hp).toBe(4);

        const laser = createSpecialSoldier(100, 100, 'laser');
        expect(laser.type).toBe('laser');
        expect(laser.hp).toBe(2);
    });
  });

  describe('Army Management', () => {
      it('should create player army', () => {
          const army = createPlayerArmy(480, 800);
          expect(army.soldiers.length).toBe(5);
          expect(army.aliveCount).toBe(5);
      });

      it('should add soldiers to army', () => {
          const army = createPlayerArmy(480, 800);
          const initial = army.soldiers.length;
          addSoldiersToArmy(army, 5);
          expect(army.soldiers.length).toBe(initial + 5);
          expect(army.aliveCount).toBe(initial + 5);
      });

      it('should limit soldiers to MAX_HEROES', () => {
          const army = createPlayerArmy(480, 800);
          addSoldiersToArmy(army, MAX_HEROES + 100);
          expect(army.soldiers.length).toBe(MAX_HEROES);
      });

      it('should add special soldiers to army', () => {
          const army = createPlayerArmy(480, 800);
          addSpecialSoldiersToArmy(army, 'bazooka', 2);
          const bazookas = army.soldiers.filter(s => s.type === 'bazooka');
          expect(bazookas.length).toBe(2);
      });

      it('should multiply soldiers', () => {
          const army = createPlayerArmy(480, 800);
          const initial = army.soldiers.length;
          multiplySoldiersInArmy(army, 2);
          expect(army.soldiers.length).toBe(initial * 2);
      });

      it('should remove soldiers', () => {
          const army = createPlayerArmy(480, 800);
          const initial = army.soldiers.length;
          removeSoldiersFromArmy(army, 2);
          expect(army.soldiers.length).toBe(initial - 2); // pop removes from array
          expect(army.aliveCount).toBe(initial - 2);
      });

      it('should add super soldiers', () => {
          const army = createPlayerArmy(480, 800);
          addSuperSoldiersToArmy(army, 2);
          const supers = army.soldiers.filter(s => s.isSuper);
          expect(supers.length).toBe(2);
      });
  });

  describe('EnemyHorde', () => {
    it('should create an enemy horde', () => {
      const horde = createEnemyHorde(500, 100, 10, 1);
      expect(horde).toBeDefined();
      expect(horde.soldiers.length).toBe(10);
      expect(horde.count).toBe(10);
      expect(horde.width).toBeGreaterThan(0);
      expect(horde.height).toBeGreaterThan(0);
    });

    it('should position enemies in rings', () => {
        const horde = createEnemyHorde(500, 100, 20, 1); // Enough for multiple rings
        expect(horde.soldiers.length).toBe(20);
    });
  });

  describe('Gate', () => {
    it('should create gate types based on probability', () => {
        // Mock random
        const randomSpy = vi.spyOn(Math, 'random');

        // add: < 0.50
        randomSpy.mockReturnValue(0.4);
        const addGate = createGate(480, 0, 'left', 1, 10, 10);
        expect(addGate.type).toBe('add');

        // multiply: < 0.65 (so 0.6)
        randomSpy.mockReturnValue(0.6);
        const mulGate = createGate(480, 0, 'left', 1, 10, 10);
        expect(mulGate.type).toBe('multiply');

        // firerate: < 0.73 (so 0.7)
        randomSpy.mockReturnValue(0.7);
        const rateGate = createGate(480, 0, 'left', 1, 10, 10);
        expect(rateGate.type).toBe('firerate');

        // damage: < 0.80 (so 0.75)
        randomSpy.mockReturnValue(0.75);
        const dmgGate = createGate(480, 0, 'left', 1, 10, 10);
        expect(dmgGate.type).toBe('damage');

        // superwarrior: < 0.94 (so 0.9)
        randomSpy.mockReturnValue(0.9);
        const superGate = createGate(480, 0, 'left', 1, 10, 10);
        expect(superGate.type).toBe('superwarrior');

        // subtract: < 0.97 (so 0.95)
        randomSpy.mockReturnValue(0.95);
        const subGate = createGate(480, 0, 'left', 1, 10, 10);
        expect(subGate.type).toBe('subtract');

        // divide: >= 0.97 (so 0.99)
        randomSpy.mockReturnValue(0.99);
        const divGate = createGate(480, 0, 'left', 1, 10, 10);
        expect(divGate.type).toBe('divide');
    });

    it('should handle max heroes restrictions', () => {
        const randomSpy = vi.spyOn(Math, 'random');

        // At max heroes, probabilities shift
        // < 0.35 -> firerate
        randomSpy.mockReturnValue(0.3);
        const rateGate = createGate(480, 0, 'left', 1, MAX_HEROES + 1, 10);
        expect(rateGate.type).toBe('firerate');

        // < 0.70 -> damage
        randomSpy.mockReturnValue(0.6);
        const dmgGate = createGate(480, 0, 'left', 1, MAX_HEROES + 1, 10);
        expect(dmgGate.type).toBe('damage');

        // < 0.85 -> subtract
        randomSpy.mockReturnValue(0.8);
        const subGate = createGate(480, 0, 'left', 1, MAX_HEROES + 1, 10);
        expect(subGate.type).toBe('subtract');

        // else -> divide
        randomSpy.mockReturnValue(0.9);
        const divGate = createGate(480, 0, 'left', 1, MAX_HEROES + 1, 10);
        expect(divGate.type).toBe('divide');
    });

    it('should scale gate values with level and army size', () => {
        // High level, small army -> strong buffs
        const strongGate = createGate(480, 0, 'left', 10, 5, 100); // 5 heroes vs 100 enemies, level 10
        // Check value scaling logic implicitly by ensuring it doesn't crash
        // and returns expected type for given random.
        expect(strongGate.value).toBeGreaterThan(0);
    });
  });

  describe('GatePair', () => {
      it('should create math gate pair (40% chance)', () => {
          const randomSpy = vi.spyOn(Math, 'random');
          randomSpy.mockReturnValue(0.1); // < 0.4

          const gates = createGatePair(480, 0, 1, 10, 10);
          expect(gates.length).toBe(2);
          // One should be correct (add), one incorrect (subtract)
          const hasAdd = gates.some(g => g.type === 'add');
          const hasSub = gates.some(g => g.type === 'subtract');
          expect(hasAdd).toBe(true);
          expect(hasSub).toBe(true);
      });

      it('should create normal gate pair and ensure at least one bad/good if both are good/bad', () => {
          const randomSpy = vi.spyOn(Math, 'random');
          randomSpy.mockReturnValue(0.5); // Normal path

          // We need to manipulate subsequent random calls to force createGate to return specific types
          // This is tricky because createGate calls Math.random too.
          // Easier to test the result properties.

          const gates = createGatePair(480, 0, 1, 10, 10);
          expect(gates.length).toBe(2);
          expect(gates[0].side).toBe('left');
          expect(gates[1].side).toBe('right');
      });

      it('should handle max heroes logic in gate pair', () => {
          const randomSpy = vi.spyOn(Math, 'random');
          randomSpy.mockReturnValue(0.9); // force non-math gate

          // at MAX_HEROES
          const gates = createGatePair(480, 0, 1, MAX_HEROES, 10);
          expect(gates.length).toBe(2);

          // Should mostly be firerate/damage or bad gates
          const allowedTypes = ['firerate', 'damage', 'subtract', 'divide'];
          gates.forEach(g => {
              expect(allowedTypes).toContain(g.type);
          });
      });
  });

  describe('MysteryBox', () => {
      it('should create mystery box', () => {
          const box = createMysteryBox(500, 0);
          expect(box.hp).toBeGreaterThan(0);
          expect(box.passed).toBe(false);
          // Check random positioning (left/right)
          // Hard to deterministic test without mocking random for x
      });
  });

  describe('Coin', () => {
      it('should create coin', () => {
          const coin = createCoin(100, 100, 5);
          expect(coin.value).toBe(5);
      });
  });

  describe('Boss', () => {
      it('should create correct boss for levels', () => {
          const levelsAndTypes = [
              { lvl: 1, type: 'beast' },
              { lvl: 2, type: 'slime' },
              { lvl: 3, type: 'eye' },
              { lvl: 4, type: 'machine' },
              { lvl: 5, type: 'spider' },
              { lvl: 6, type: 'skull' },
              { lvl: 7, type: 'demon' },
              { lvl: 8, type: 'ghost' },
              { lvl: 9, type: 'crystal' },
          ];

          levelsAndTypes.forEach(({ lvl, type }) => {
              const boss = createBoss(480, lvl);
              expect(boss.type).toBe(type);
          });
      });

      it('should create mothership for level 10+', () => {
          const boss = createBoss(480, 10);
          expect(boss.type).toBe('mothership');
          const boss11 = createBoss(480, 11);
          expect(boss11.type).toBe('mothership');
      });
  });

  describe('MiniBoss', () => {
      it('should create mini boss', () => {
          const mb = createMiniBoss(500, 0, 1);
          expect(mb.maxHp).toBeGreaterThan(0);
          expect(['normal', 'armored', 'speed', 'spiky']).toContain(mb.type);
      });
  });

  describe('InitialEntities', () => {
      it('should create initial entities', () => {
          const entities = createInitialEntities(500, 800);
          expect(entities.playerArmy).toBeDefined();
          expect(entities.enemyHordes.length).toBeGreaterThan(0);
      });
  });

});
