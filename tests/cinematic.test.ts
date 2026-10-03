import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { INTRO_SCENES, playIntro, isIntroPlaying, hasSeenIntro, shouldAutoPlayIntro } from '../src/cinematic';
import { getRadio, RADIO, showRadioBanner } from '../src/story';

describe('intro cinematic', () => {
  beforeEach(() => { document.body.innerHTML = '<div class="game-canvas-wrapper"></div>'; localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { document.getElementById('introCinematic')?.remove(); vi.useRealTimers(); });

  it('has 5 well-formed scenes', () => {
    expect(INTRO_SCENES).toHaveLength(5);
    INTRO_SCENES.forEach(s => { expect(s.title).toBeTruthy(); expect(s.text.length).toBeGreaterThan(30); expect(s.art).toBeTruthy(); });
  });

  it('types text, completes the line on first tap, then advances scene by scene and finishes once', () => {
    const done = vi.fn();
    playIntro(done);
    expect(isIntroPlaying()).toBe(true);
    const text = () => document.querySelector('.intro-text')!.textContent!;
    vi.advanceTimersByTime(24 * 5);
    expect(text().length).toBeGreaterThan(0);
    expect(text().length).toBeLessThan(INTRO_SCENES[0].text.length);
    document.querySelector<HTMLElement>('.intro-next')!.click(); // completes the line
    expect(text()).toBe(INTRO_SCENES[0].text);
    for (let i = 1; i < INTRO_SCENES.length; i++) {
      document.querySelector<HTMLElement>('.intro-next')!.click(); // next scene
      expect(document.querySelector('.intro-title')!.textContent).toBe(INTRO_SCENES[i].title);
      document.querySelector<HTMLElement>('.intro-next')!.click(); // finish line
    }
    expect(document.querySelector('.intro-next')!.textContent).toContain('Começar');
    document.querySelector<HTMLElement>('.intro-next')!.click();
    expect(done).toHaveBeenCalledTimes(1);
    expect(isIntroPlaying()).toBe(false);
    expect(hasSeenIntro()).toBe(true);
    expect(document.getElementById('introCinematic')).toBeNull();
  });

  it('can be skipped with the button or Escape, and keyboard advances', () => {
    const a = vi.fn();
    playIntro(a);
    document.querySelector<HTMLElement>('.intro-skip')!.click();
    expect(a).toHaveBeenCalledTimes(1);

    const b = vi.fn();
    playIntro(b);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(document.querySelector('.intro-title')!.textContent).toBe(INTRO_SCENES[1].title);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(b).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // listener removed
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('replaying stops the previous run and never auto-plays under test', () => {
    const a = vi.fn(); playIntro(a); playIntro(vi.fn());
    expect(a).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('#introCinematic')).toHaveLength(1);
    expect(shouldAutoPlayIntro()).toBe(false);
  });
});

describe('radio calls', () => {
  it('has one line per chapter plus an endless fallback and shows a banner', () => {
    document.body.innerHTML = '<div class="game-canvas-wrapper"></div>';
    expect(RADIO).toHaveLength(10);
    expect(getRadio(1)).toBe(RADIO[0]);
    expect(getRadio(15)).toContain('horda');
    showRadioBanner(3);
    const el = document.getElementById('storyBanner')!;
    expect(el.dataset.variant).toBe('radio');
    expect(el.textContent).toContain('Comandante Vega');
    expect(el.textContent).not.toContain('Vega:');
  });
});

describe('intro persistence edge cases', () => {
  it('survives unavailable storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    expect(hasSeenIntro()).toBe(false);
    document.body.innerHTML = '<div class="game-canvas-wrapper"></div>';
    const done = vi.fn();
    playIntro(done);
    document.querySelector<HTMLElement>('.intro-skip')!.click();
    expect(done).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
