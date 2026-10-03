import { describe, it, expect } from 'vitest';
import { paintCharacter, enemyKindFromColor, isPlayerColor, paintStyle, SPRITE_SS } from '../src/soldier-art';
import { paintBiomeScene, paintRoadDetail, mulberry32 } from '../src/biome-art';
import { getBossSprite, isPaintedBoss, paintBoss, clearBossArtCache, BOSS_BOX, BOSS_SS } from '../src/boss-art';
import { THEMES } from '../src/constants';
import { HERO_SKINS } from '../src/skins';

const ctx = () => document.createElement('canvas').getContext('2d')!;

describe('soldier art', () => {
  it('classifies player vs enemy colors', () => {
    expect(enemyKindFromColor('#8E2A2A')).toBe('tank');
    expect(enemyKindFromColor('#FF9A3D')).toBe('runner');
    expect(enemyKindFromColor('#8BD02A')).toBe('spitter');
    expect(enemyKindFromColor('#123456')).toBeNull();
    expect(isPlayerColor('#4A90D9', 'normal')).toBe(true);
    expect(isPlayerColor('#E74C3C', 'normal')).toBe(false);
    expect(isPlayerColor('#8E2A2A', 'normal')).toBe(false);
    expect(isPlayerColor('#E74C3C', 'rambo')).toBe(true);
    expect(SPRITE_SS).toBeGreaterThanOrEqual(2);
  });

  it('paints every character variant (normal, flash, simple, super) without throwing', () => {
    const c = ctx();
    const types = ['normal', 'bazooka', 'rambo', 'laser'] as const;
    const colors = ['#4A90D9', '#E74C3C', '#8E2A2A', '#FF9A3D', '#8BD02A', ...HERO_SKINS.map(s => s.primary)];
    for (const type of types) for (const color of colors) for (const flash of [false, true]) for (const simple of [false, true]) {
      expect(() => paintCharacter(c, 50, 50, 16, { type, color, isSuper: false, flash, simple })).not.toThrow();
    }
    expect(() => paintCharacter(c, 50, 50, 22, { type: 'normal', color: '#FFD700', isSuper: true, flash: false, simple: false })).not.toThrow();
    expect(() => paintCharacter(c, 50, 50, 22, { type: 'normal', color: '#FFD700', isSuper: true, flash: true, simple: true })).not.toThrow();
  });

  it('paints every skin style', () => {
    const c = ctx();
    for (const s of HERO_SKINS) expect(() => paintStyle(c, 16, s.style, s.accent)).not.toThrow();
  });
});

describe('biome art', () => {
  it('rng is deterministic and in [0,1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 50; i++) { const v = a(); expect(v).toBe(b()); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });

  it('paints scenery and road detail for all 10 biomes', () => {
    const c = ctx();
    for (const theme of Object.values(THEMES)) {
      expect(() => paintBiomeScene(c, 480, 800, 176, theme)).not.toThrow();
      expect(() => paintRoadDetail(c, 480, 800, 176, theme)).not.toThrow();
    }
  });
});

describe('boss art', () => {
  it('knows which bosses have painted sprites', () => {
    for (const t of ['beast', 'slime', 'eye', 'machine', 'spider', 'skull', 'demon', 'ghost', 'crystal'] as const) expect(isPaintedBoss(t)).toBe(true);
    expect(isPaintedBoss('mothership')).toBe(false);
    expect(isPaintedBoss('normal')).toBe(false);
  });

  it('paints all bosses and caches normal + flash sprites at supersampled size', () => {
    clearBossArtCache();
    const c = ctx();
    for (const t of ['beast', 'slime', 'eye', 'machine', 'spider', 'skull', 'demon', 'ghost', 'crystal'] as const) {
      expect(() => paintBoss(c, t)).not.toThrow();
      const a = getBossSprite(t, false)!;
      expect(a.width).toBe(BOSS_BOX * BOSS_SS);
      expect(getBossSprite(t, false)).toBe(a); // cached
      expect(getBossSprite(t, true)).not.toBe(a);
    }
  });
});

import { paintMiniBoss, getMiniBossSprite, MINI_BOX, MINI_NAMES } from '../src/boss-art';
describe('mini-boss art', () => {
  it('paints and caches all four elites', () => {
    clearBossArtCache();
    const c = ctx();
    for (const k of ['normal', 'armored', 'speed', 'spiky'] as const) {
      expect(() => paintMiniBoss(c, k)).not.toThrow();
      const s = getMiniBossSprite(k, false)!;
      expect(s.width).toBe(MINI_BOX * BOSS_SS);
      expect(getMiniBossSprite(k, false)).toBe(s);
      expect(getMiniBossSprite(k, true)).not.toBe(s);
      expect(MINI_NAMES[k].length).toBeGreaterThan(3);
    }
    expect(() => paintMiniBoss(c, '???' as never)).not.toThrow(); // falls back to the brute
  });
});

import { paintGate, gateValueText, gateCaption, gateIcon, isHarmful, fmtGateValue, GATE_PADDING } from '../src/gate-art';
import { paintMothership, getMothershipSprite, MOTHER_W, MOTHER_LIGHTS, MOTHER_CANNONS } from '../src/boss-art';
describe('gate art', () => {
  const kinds = ['add', 'multiply', 'subtract', 'divide', 'firerate', 'damage', 'superwarrior'] as const;
  it('formats values clearly (percentages for buffs, no float noise)', () => {
    expect(gateValueText({ type: 'add', value: 20, color: '#0f0', side: 'left' })).toBe('+20');
    expect(gateValueText({ type: 'multiply', value: 1.1700000000000002, color: '#0f0', side: 'left' })).toBe('×1.17');
    expect(gateValueText({ type: 'subtract', value: 3, color: '#f00', side: 'left' })).toBe('-3');
    expect(gateValueText({ type: 'divide', value: 1.5, color: '#f00', side: 'left' })).toBe('÷1.5');
    expect(gateValueText({ type: 'firerate', value: 0.92, color: '#fa0', side: 'left' })).toBe('+9%');
    expect(gateValueText({ type: 'firerate', value: 1.1, color: '#fa0', side: 'left' })).toBe('-10%');
    expect(gateValueText({ type: 'damage', value: 1.12, color: '#90f', side: 'left' })).toBe('+12%');
    expect(gateValueText({ type: 'superwarrior', value: 2, color: '#fd0', side: 'left' })).toBe('+2');
    expect(gateValueText({ type: 'add', value: 72, color: '#0f0', side: 'right', customText: '8 × 9 = 72' })).toBe('8 × 9 = 72');
    expect(fmtGateValue(7)).toBe('7');
  });
  it('has captions/icons and flags harmful gates', () => {
    for (const k of kinds) { expect(gateCaption(k, false).length).toBeGreaterThan(3); expect(gateIcon(k)).toBeTruthy(); }
    expect(gateCaption('add', true)).toContain('ESCOLHA');
    expect(gateIcon('add', '1 × 1 = 1')).toBe('🧮');
    expect(isHarmful('subtract')).toBe(true);
    expect(isHarmful('divide')).toBe(true);
    expect(isHarmful('add', '2 × 2 = 5', '#E74C3C')).toBe(true);
    expect(isHarmful('add')).toBe(false);
  });
  it('paints every gate kind, both sides, simple and full', () => {
    const c = ctx();
    for (const k of kinds) for (const side of ['left', 'right'] as const) for (const simple of [false, true]) {
      expect(() => paintGate(c, GATE_PADDING, GATE_PADDING, 210, 80, { type: k, value: 1.5, color: k === 'subtract' ? '#E74C3C' : '#2ECC71', side }, simple)).not.toThrow();
    }
    expect(() => paintGate(c, 40, 40, 210, 80, { type: 'add', value: 6, color: '#E74C3C', side: 'right', customText: '2 × 3 = 7' }, false)).not.toThrow();
  });
});
describe('mothership art', () => {
  it('paints and caches the hull (normal + flash) and exposes light/cannon anchors', () => {
    clearBossArtCache();
    expect(() => paintMothership(ctx())).not.toThrow();
    const a = getMothershipSprite(false)!;
    expect(a.width).toBe(MOTHER_W * BOSS_SS);
    expect(getMothershipSprite(false)).toBe(a);
    expect(getMothershipSprite(true)).not.toBe(a);
    expect(MOTHER_LIGHTS.length).toBe(14);
    expect(MOTHER_CANNONS.length).toBe(3);
  });
});
