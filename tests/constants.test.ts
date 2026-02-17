import { describe, it, expect } from 'vitest';
import * as Constants from '../src/constants';

describe('Constants', () => {
  it('should have defined constants', () => {
    expect(Constants.BASE_WIDTH).toBe(480);
    expect(Constants.BASE_HEIGHT).toBe(800);
    expect(Constants.ASPECT_RATIO).toBeDefined();
    expect(Constants.MAX_HEROES).toBe(20000);
  });

  it('should have correct biome themes', () => {
      expect(Constants.THEMES).toBeDefined();
      expect(Object.keys(Constants.THEMES).length).toBeGreaterThan(0);
      expect(Constants.THEMES[1].name).toBeDefined();
  });
});
