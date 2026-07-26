import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  HERO_SKINS,
  DEFAULT_SKIN_ID,
  getSkinById,
  getHighScore,
  isSkinUnlocked,
  getSelectedSkinId,
  getActiveSkin,
  selectSkin,
} from '../src/skins';

describe('skins', () => {
  // localStorage is a plain object mock (tests/setup.ts), so spies are restored explicitly.
  const spies: { mockRestore: () => void }[] = [];
  const spyOnStorage = (method: 'getItem' | 'setItem', impl: () => never) => {
    const spy = vi.spyOn(localStorage, method).mockImplementation(impl);
    spies.push(spy);
    return spy;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    while (spies.length) spies.pop()!.mockRestore();
    vi.restoreAllMocks();
  });

  it('exposes a catalog with a free default skin', () => {
    expect(HERO_SKINS.length).toBeGreaterThan(1);
    expect(HERO_SKINS[0].unlockScore).toBe(0);
    expect(DEFAULT_SKIN_ID).toBe(HERO_SKINS[0].id);
  });

  it('getSkinById falls back to the default for unknown ids', () => {
    expect(getSkinById('cyber').id).toBe('cyber');
    expect(getSkinById('nope').id).toBe(DEFAULT_SKIN_ID);
  });

  it('getHighScore reads and sanitizes stored values', () => {
    expect(getHighScore()).toBe(0);
    localStorage.setItem('crowdHighScore', '4200');
    expect(getHighScore()).toBe(4200);
    localStorage.setItem('crowdHighScore', 'abc');
    expect(getHighScore()).toBe(0);
    localStorage.setItem('crowdHighScore', '-5');
    expect(getHighScore()).toBe(0);
  });

  it('getHighScore returns 0 when storage throws', () => {
    spyOnStorage('getItem', () => { throw new Error('denied'); });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getHighScore()).toBe(0);
  });

  it('locks skins until the high score requirement is met', () => {
    const locked = HERO_SKINS.find(s => s.unlockScore > 0)!;
    expect(isSkinUnlocked(locked, 0)).toBe(false);
    expect(isSkinUnlocked(locked, locked.unlockScore)).toBe(true);
    localStorage.setItem('crowdHighScore', String(locked.unlockScore));
    expect(isSkinUnlocked(locked)).toBe(true);
  });

  it('selectSkin persists unlocked skins only', () => {
    const locked = HERO_SKINS.find(s => s.unlockScore > 0)!;
    expect(selectSkin(locked.id)).toBe(false);
    expect(selectSkin('unknown-skin')).toBe(false);
    expect(getSelectedSkinId()).toBe(DEFAULT_SKIN_ID);

    const free = HERO_SKINS.filter(s => s.unlockScore === 0)[1];
    expect(selectSkin(free.id)).toBe(true);
    expect(getSelectedSkinId()).toBe(free.id);
    expect(getActiveSkin().primary).toBe(free.primary);
  });

  it('selectSkin still reports success when storage write fails', () => {
    spyOnStorage('setItem', () => { throw new Error('quota'); });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(selectSkin(DEFAULT_SKIN_ID)).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it('falls back to the default when the stored skin is locked or unreadable', () => {
    const locked = HERO_SKINS.find(s => s.unlockScore > 0)!;
    localStorage.setItem('crowdHeroSkin', locked.id);
    expect(getSelectedSkinId()).toBe(DEFAULT_SKIN_ID);

    localStorage.setItem('crowdHeroSkin', 'ghost-skin');
    expect(getSelectedSkinId()).toBe(DEFAULT_SKIN_ID);

    spyOnStorage('getItem', () => { throw new Error('denied'); });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(getSelectedSkinId()).toBe(DEFAULT_SKIN_ID);
  });
});
