import { describe, it, expect } from 'vitest';
import {
    createSoldier,
    createEnemyHorde,
    createGate,
    createMysteryBox,
    createBoss,
    createMiniBoss,
    createInitialEntities
} from '../src/entities';
import { GameState, Entities } from '../src/types';

describe('Entities', () => {
  describe('Soldier', () => {
    it('should create a soldier with correct stats', () => {
      const soldier = createSoldier(100, 100, '#000', 1, 'normal');
      expect(soldier.type).toBe('normal');
      expect(soldier.damage).toBeUndefined(); // Damage is on Army level? No, let's check.
      // createSoldier doesn't take damage as arg, defaults?
      // Looking at code: createSoldier returns object.
      // { ..., hp, maxHp, isSuper, type, hitTimer }
      // It doesn't seem to set damage on individual soldier, damage is calculated or on Army.
      // Wait, createPlayerArmy sets damage: 3 on Army.
      // So soldier struct doesn't have damage usually, unless special types?
      expect(soldier.hp).toBe(1);

      const rambo = createSoldier(100, 100, '#f00', 1, 'rambo');
      expect(rambo.type).toBe('rambo');
    });
  });

  describe('EnemyHorde', () => {
    it('should create an enemy horde', () => {
      const horde = createEnemyHorde(500, 100, 10, 1);
      expect(horde).toBeDefined();
      expect(horde.soldiers.length).toBe(10);
      expect(horde.count).toBe(10);
    });
  });

  describe('Gate', () => {
    it('should create a gate', () => {
      const gate = createGate(500, 0, 'left', 1, 10, 10);
      expect(gate.side).toBe('left');
      expect(gate.value).toBeGreaterThan(0);
      expect(gate.color).toBeDefined();
    });
  });

  describe('MysteryBox', () => {
      it('should create mystery box', () => {
          const box = createMysteryBox(500, 0);
          // type is not on MysteryBox interface in the file?
          // It just returns object with id, x, y, width, height, hp, maxHp, passed, hitTimer.
          // It doesn't have 'type' property in the return object literal.
          expect(box.hp).toBeGreaterThan(0);
          expect(box.passed).toBe(false);
      });
  });

  describe('Boss', () => {
      it('should create boss', () => {
          const boss = createBoss(500, 1);
          expect(boss.maxHp).toBeGreaterThan(0);
          // boss.phase is not in the return object based on read_file
          expect(boss.type).toBeDefined();
      });
  });

  describe('MiniBoss', () => {
      it('should create mini boss', () => {
          const mb = createMiniBoss(500, 0, 1);
          expect(mb.maxHp).toBeGreaterThan(0);
          expect(mb.type).toBeDefined();
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
