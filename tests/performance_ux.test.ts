
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startGame } from '../src/game';
import { render } from '../src/renderer';
import { GameState, Entities, Bullet, Army, EnemyHorde } from '../src/types';
import { BASE_WIDTH, BASE_HEIGHT } from '../src/constants';

// Mock Navigator WakeLock
const requestMock = vi.fn().mockResolvedValue({
  release: vi.fn().mockResolvedValue(undefined)
});

Object.defineProperty(navigator, 'wakeLock', {
  value: {
    request: requestMock
  },
  writable: true
});

describe('Performance and UX Enhancements', () => {
  let ctx: CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement('canvas');
    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;
    ctx = canvas.getContext('2d')!;

    // Reset DOM
    document.body.innerHTML = '<div id="startBtnOverlay"></div><div id="startScreen"></div><canvas id="gameCanvas"></canvas>';
  });

  it('requests Wake Lock on game start', async () => {
    vi.useFakeTimers();

    // Mock animate for startCountdown
    HTMLElement.prototype.animate = vi.fn().mockReturnValue({
        finished: Promise.resolve()
    });

    // Prevent game loop from running infinitely
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);

    startGame();

    // Fast-forward time to trigger countdown completion
    // startCountdown has 3 steps of ~800ms + 500ms
    await vi.advanceTimersByTimeAsync(4000);

    expect(requestMock).toHaveBeenCalledWith('screen');

    rafSpy.mockRestore();
    vi.useRealTimers();
  });

  it('draws the combo bar when combo > 1', () => {
      const entities: Entities = {
        playerArmy: { soldiers: [], aliveCount: 0, centerX: 0, centerY: 0 } as unknown as Army,
        enemyHordes: [],
        bullets: [],
        mysteryBoxes: [],
        coins: [],
        gates: [],
        miniBosses: [],
        boss: null
      } as unknown as Entities;

      const gameState = {
          isStarted: true,
          combo: 5,
          comboTimer: 2000,
          currentLevel: 1,
          score: 100,
          coins: 0,
          distanceTraveled: 0,
          levelDistance: 1000
      } as unknown as GameState;

      ctx.roundRect = vi.fn();

      render(ctx, entities, gameState);

      // We expect roundRect calls for the Combo Bar (bg, fill, border)
      // drawComboBar makes ~3 calls.
      expect(ctx.roundRect).toHaveBeenCalled();
  });
});
