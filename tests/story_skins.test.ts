import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CHAPTERS, getChapter, getDefeatLine, VICTORY_TEXT, showChapterBanner, showBossBanner, hideStoryBanner } from '../src/story';
import { HERO_SKINS, isSkinUnlocked, selectSkin, getSelectedSkinId } from '../src/skins';

describe('story', () => {
  beforeEach(() => { document.body.innerHTML = '<div class="game-canvas-wrapper"></div>'; vi.useFakeTimers(); });

  it('has 10 chapters, one per level, then an infinite mode', () => {
    expect(CHAPTERS).toHaveLength(10);
    CHAPTERS.forEach((c, i) => { expect(c.level).toBe(i + 1); expect(c.place).toBeTruthy(); expect(c.text.length).toBeGreaterThan(20); });
    expect(getChapter(11).place).toContain('Infinita');
    expect(getChapter(14).place).toContain('4');
  });

  it('builds epilogue lines', () => {
    expect(getDefeatLine(3)).toContain(getChapter(3).place);
    expect(VICTORY_TEXT).toContain('Nave-Mãe');
  });

  it('shows a chapter banner and hides it after the timeout', () => {
    showChapterBanner(2);
    const el = document.getElementById('storyBanner')!;
    expect(el.hidden).toBe(false);
    expect(el.textContent).toContain('CAPÍTULO 2');
    expect(el.dataset.variant).toBe('chapter');
    vi.advanceTimersByTime(5000);
    expect(el.hidden).toBe(true);
  });

  it('labels the infinite mode and shows boss banners with the taunt', () => {
    showChapterBanner(12);
    expect(document.getElementById('storyBanner')!.textContent).toContain('MODO INFINITO');
    const lore = showBossBanner('skull');
    expect(lore.name).toBe('BONE KING');
    const el = document.getElementById('storyBanner')!;
    expect(el.dataset.variant).toBe('boss');
    expect(el.textContent).toContain(lore.taunt);
    hideStoryBanner();
    expect(el.hidden).toBe(true);
    expect(() => hideStoryBanner()).not.toThrow();
  });
});

describe('skins catalog', () => {
  beforeEach(() => localStorage.clear());

  it('has unique ids/colors, ascending unlocks and a description each', () => {
    expect(HERO_SKINS.length).toBeGreaterThanOrEqual(11);
    expect(new Set(HERO_SKINS.map(s => s.id)).size).toBe(HERO_SKINS.length);
    expect(new Set(HERO_SKINS.map(s => s.primary)).size).toBe(HERO_SKINS.length);
    for (let i = 1; i < HERO_SKINS.length; i++) expect(HERO_SKINS[i].unlockScore).toBeGreaterThanOrEqual(HERO_SKINS[i - 1].unlockScore);
    HERO_SKINS.forEach(s => { expect(s.desc.length).toBeGreaterThan(5); expect(s.style).toBeTruthy(); });
  });

  it('unlocks by high score', () => {
    const galaxy = HERO_SKINS.find(s => s.id === 'galaxy')!;
    expect(isSkinUnlocked(galaxy, 19999)).toBe(false);
    expect(isSkinUnlocked(galaxy, 20000)).toBe(true);
    expect(selectSkin('galaxy')).toBe(false);
    localStorage.setItem('crowdHighScore', '25000');
    expect(selectSkin('galaxy')).toBe(true);
    expect(getSelectedSkinId()).toBe('galaxy');
  });
});

import { fmtGateValue } from '../src/renderer';
describe('gate value formatting', () => {
  it('hides float noise and keeps integers', () => {
    expect(fmtGateValue(1.1700000000000002)).toBe('1.17');
    expect(fmtGateValue(1.5)).toBe('1.5');
    expect(fmtGateValue(7)).toBe('7');
    expect(fmtGateValue(0.92)).toBe('0.92');
  });
});
