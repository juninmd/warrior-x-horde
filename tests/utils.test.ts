import { describe, it, expect } from 'vitest';
import { getArmyBounds, checkBounds, getEntityBounds, shadeColor, getBiomeColors } from '../src/utils';
import { Army } from '../src/types';
import { THEMES } from '../src/constants';

describe('utils', () => {
  describe('shadeColor', () => {
    it('should lighten a color', () => {
      expect(shadeColor('#000000', 100)).toBe('#ffffff');
    });

    it('should darken a color', () => {
      expect(shadeColor('#ffffff', -100)).toBe('#000000');
    });

    it('should handle invalid input gracefully', () => {
        expect(shadeColor('invalid', 10)).toBe('invalid');
        expect(shadeColor('#fff', 10)).toBe('#fff'); // Too short
    });

    it('should clamp values', () => {
       // Test upper bound
       expect(shadeColor('#ffffff', 10)).toBe('#ffffff');
       // Test lower bound
       expect(shadeColor('#000000', -10)).toBe('#000000');
    });
  });

  describe('checkBounds', () => {
    it('should detect overlap', () => {
      const r1 = { left: 0, right: 10, top: 0, bottom: 10 };
      const r2 = { left: 5, right: 15, top: 5, bottom: 15 };
      expect(checkBounds(r1, r2)).toBe(true);
    });

    it('should detect no overlap', () => {
      const r1 = { left: 0, right: 10, top: 0, bottom: 10 };
      const r2 = { left: 20, right: 30, top: 0, bottom: 10 };
      expect(checkBounds(r1, r2)).toBe(false);
    });

    it('should detect touching edges as no overlap (strict < >)', () => {
        const r1 = { left: 0, right: 10, top: 0, bottom: 10 };
        const r2 = { left: 10, right: 20, top: 0, bottom: 10 };
        expect(checkBounds(r1, r2)).toBe(false);
    });
  });

  describe('getArmyBounds', () => {
    it('should return correct bounds for an army with alive soldiers', () => {
      const army: Army = {
        centerX: 0,
        centerY: 0,
        soldiers: [
          { x: 10, y: 10, size: 5, isAlive: true },
          { x: 20, y: 20, size: 5, isAlive: true },
          { x: 50, y: 50, size: 5, isAlive: false },
        ]
      } as any;

      const bounds = getArmyBounds(army);
      // Soldier 1: 5 to 15, 5 to 15
      // Soldier 2: 15 to 25, 15 to 25
      // Union: 5 to 25
      expect(bounds.left).toBe(5);
      expect(bounds.right).toBe(25);
      expect(bounds.top).toBe(5);
      expect(bounds.bottom).toBe(25);
    });

    it('should return center point if no soldiers', () => {
        const army: Army = {
            centerX: 100,
            centerY: 100,
            soldiers: []
        } as any;
        const bounds = getArmyBounds(army);
        expect(bounds).toEqual({ left: 100, right: 100, top: 100, bottom: 100 });
    });
  });

  describe('getEntityBounds', () => {
      it('should return correct rect', () => {
          const rect = getEntityBounds(10, 20, 30, 40);
          expect(rect).toEqual({
              left: 10,
              right: 40,
              top: 20,
              bottom: 60
          });
      });
  });

  describe('getBiomeColors', () => {
      it('should return predefined themes for 1-10', () => {
          expect(getBiomeColors(1)).toBe(THEMES[1]);
          expect(getBiomeColors(10)).toBe(THEMES[10]);
      });

      it('should cycle themes for levels > 10', () => {
          expect(getBiomeColors(11)).toBe(THEMES[1]);
          expect(getBiomeColors(12)).toBe(THEMES[2]);
          expect(getBiomeColors(20)).toBe(THEMES[10]);
          expect(getBiomeColors(21)).toBe(THEMES[1]);
      });
  });
});
