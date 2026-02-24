
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, _testing } from '../src/renderer';
import { GameState, Entities, Army } from '../src/types';
import { BASE_WIDTH, BASE_HEIGHT } from '../src/constants';

describe('Visual Enhancements', () => {
  let ctx: CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement('canvas');
    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;
    ctx = canvas.getContext('2d')!;

    ctx.fillRect = vi.fn();
    ctx.globalCompositeOperation = 'source-over';

    // Reset particles
    const particles = _testing.getParticles();
    particles.length = 0;
  });

  it('triggers confetti on new record', () => {
    const entities = {
        playerArmy: { soldiers: [], aliveCount: 0, centerX: 0, centerY: 0, trail: null } as unknown as Army,
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
        newRecordReached: true,
        isGameOver: false,
        combo: 0,
        comboTimer: 0,
        currentLevel: 1,
        score: 100,
    } as unknown as GameState;

    // Force Math.random to always return 0.1 so it hits the < 0.3 check
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);

    render(ctx, entities, gameState);

    const particles = _testing.getParticles();
    const hasConfetti = particles.some(p => p.type === 'confetti');

    expect(hasConfetti).toBe(true);

    randomSpy.mockRestore();
  });

  it('draws screen pulse on high combo', () => {
    const entities = {
        playerArmy: { soldiers: [], aliveCount: 0, centerX: 0, centerY: 0, trail: null } as unknown as Army,
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
        combo: 60, // > 50 triggers pulse
        comboTimer: 1000,
        currentLevel: 1,
    } as unknown as GameState;

    // Mock composite operation setter to detect 'screen' used in drawScreenPulse
    let usedScreenComposite = false;
    Object.defineProperty(ctx, 'globalCompositeOperation', {
        set: (v) => { if (v === 'screen') usedScreenComposite = true; },
        get: () => 'source-over'
    });

    render(ctx, entities, gameState);

    expect(usedScreenComposite).toBe(true);
  });
});
