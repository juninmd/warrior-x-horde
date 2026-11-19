import { describe, it, expect, vi, afterEach } from 'vitest';

describe('gameState with unavailable localStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('loads and resets with zeroed progress instead of throwing', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new DOMException('blocked', 'SecurityError'); },
      setItem: () => { throw new DOMException('blocked', 'SecurityError'); },
    });
    vi.resetModules();
    const { gameState, resetGameState } = await import('../src/gameState');
    expect(gameState.coins).toBe(0);
    expect(gameState.highScore).toBe(0);
    expect(gameState.highScoreDistance).toBe(0);
    expect(() => resetGameState()).not.toThrow();
  });

  it('still reads persisted numbers when storage works', async () => {
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'crowdCoins' ? '42' : null), setItem: () => {} });
    vi.resetModules();
    const { gameState } = await import('../src/gameState');
    expect(gameState.coins).toBe(42);
  });
});
