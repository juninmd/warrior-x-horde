import { describe, it, expect } from 'vitest';
import { BIOME_WEATHER, createWeather, stepWeather, drawWeather } from '../src/weather';
import { THEMES } from '../src/constants';

const seq = () => { let i = 0; return () => ((i++ * 0.37) % 1); };

describe('weather', () => {
  it('every biome has a weather definition', () => {
    for (const t of Object.values(THEMES)) expect(BIOME_WEATHER[t.name], t.name).toBeDefined();
  });

  it('creates scaled particle counts and returns null for unknown biomes', () => {
    expect(createWeather('Nope')).toBeNull();
    const full = createWeather('Snow', 1, seq())!;
    const low = createWeather('Snow', 0.3, seq())!;
    expect(full.particles.length).toBe(70);
    expect(low.particles.length).toBeLessThan(full.particles.length);
    expect(createWeather('Snow', 0, seq())!.particles.length).toBe(4);
  });

  it('steps particles and recycles the ones that leave the screen', () => {
    for (const name of Object.keys(BIOME_WEATHER)) {
      const w = createWeather(name, 1, seq())!;
      const before = w.particles.map(p => p.y);
      for (let i = 0; i < 400; i++) stepWeather(w, 0.016, seq());
      expect(w.particles.length).toBe(BIOME_WEATHER[name].count);
      expect(w.particles.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
      expect(w.particles.map(p => p.y)).not.toEqual(before);
    }
    const w = createWeather('Snow', 1, seq())!;
    stepWeather(w, -5); stepWeather(w, 99); // clamped dt
  });

  it('draws every kind without throwing', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    for (const name of Object.keys(BIOME_WEATHER)) {
      const w = createWeather(name, 1, seq())!;
      expect(() => drawWeather(ctx, w, 1234)).not.toThrow();
    }
  });
});
