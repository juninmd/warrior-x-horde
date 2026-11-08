import { describe, it, expect, vi, afterEach } from 'vitest';

// Asset URLs must follow the Vite base so the game also works under a sub-path
// (GitHub Pages serves it at /warrior-x-horde/).
describe('base path', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('resolves audio assets under import.meta.env.BASE_URL', async () => {
    vi.stubEnv('BASE_URL', '/warrior-x-horde/');
    const { audioManager } = await import('../src/audio');
    const path = (el: HTMLAudioElement) => new URL(el.src, 'http://localhost').pathname;

    expect(path(audioManager.gameMusic)).toBe('/warrior-x-horde/audio/music.mp3');
    expect(path(audioManager.bossMusic)).toBe('/warrior-x-horde/audio/music_boss.mp3');
    expect(path(audioManager.victory)).toBe('/warrior-x-horde/audio/wave_complete.wav');
  });

  it('keeps root-relative audio URLs when the base is "/"', async () => {
    vi.stubEnv('BASE_URL', '/');
    const { audioManager } = await import('../src/audio');
    expect(new URL(audioManager.gameStart.src, 'http://localhost').pathname).toBe('/audio/game_start.mp3');
  });
});
