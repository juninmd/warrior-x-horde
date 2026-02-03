import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Gate, GameState } from '../src/types';

// Mock game.ts to avoid circular dependency side effects
vi.mock('../src/game', () => ({
  triggerScreenShake: vi.fn(),
  canvas: typeof document !== 'undefined' ? document.createElement('canvas') : null,
  getScale: vi.fn(() => 1),
  screenToCanvas: vi.fn((x, y) => ({ x, y })),
  _testing: {},
  startGame: vi.fn(),
  togglePause: vi.fn(),
  triggerSuperCannon: vi.fn(),
  toggleFullscreen: vi.fn(),
  debugSetLevel: vi.fn()
}));

import { render } from '../src/renderer';

// Mock GameState
const mockGameState: GameState = {
  isGameOver: false,
  isVictory: false,
  isStarted: true,
  isPaused: false,
  currentLevel: 1,
  score: 0,
  highScore: 0,
  coins: 0,
  gameSpeed: 1,
  baseGameSpeed: 1,
  distanceTraveled: 0,
  levelDistance: 1000,
  isBattling: false,
  battleTimer: 0,
  screenShakeActive: false,
  screenShakeIntensity: 0,
  screenShakeDuration: 0,
  screenShakeTimer: 0,
  lastFrameTime: 0,
  superCannonActive: false,
  superCannonTimer: 0,
  superCannonDuration: 0,
  superCannonCooldown: 0,
  superCannonLastUsed: 0,
  superCannonReady: false,
  superCannonDamageMultiplier: 1,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  bossActive: false,
  bossAtmosphereIntensity: 0,
  newRecordReached: false,
  damageFlash: 0,
  lowArmyTriggered: false,
  hitStop: 0,
  slowMoTimer: 0,
  nukeTimer: 0,
  killStreak: 0,
  killStreakTimer: 0,
  whiteFlash: 0,
  deferredInstallPrompt: null
};

describe('Gate Rendering Caching', () => {
  let ctx: CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d')!;
    vi.clearAllMocks();
  });

  it('should create and use cachedCanvas for a gate', () => {
    const gate: Gate = {
      id: 1,
      x: 100,
      y: 200,
      width: 100,
      height: 50,
      type: 'add',
      value: 10,
      color: '#FF0000',
      side: 'left',
      passed: false
    };

    // First render: Should create cachedCanvas and call drawImage
    render(ctx, {
      playerArmy: { soldiers: [], aliveCount: 0, centerX: 0, centerY: 0, targetX: 0, color: '', isPlayer: true, fireRate: 0, lastShotTime: 0, damage: 0 },
      enemyHordes: [],
      gates: [gate],
      weapons: [],
      mysteryBoxes: [],
      coins: [],
      bullets: [],
      boss: null,
      miniBosses: []
    }, mockGameState);

    expect(gate.cachedCanvas).toBeDefined();
    expect(ctx.drawImage).toHaveBeenCalledWith(
        gate.cachedCanvas,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
    );
  });

  it('should reuse cachedCanvas on subsequent renders', () => {
     const gate: Gate = {
      id: 1,
      x: 100,
      y: 200,
      width: 100,
      height: 50,
      type: 'add',
      value: 10,
      color: '#FF0000',
      side: 'left',
      passed: false
    };

    const entities = {
      playerArmy: { soldiers: [], aliveCount: 0, centerX: 0, centerY: 0, targetX: 0, color: '', isPlayer: true, fireRate: 0, lastShotTime: 0, damage: 0 },
      enemyHordes: [],
      gates: [gate],
      weapons: [],
      mysteryBoxes: [],
      coins: [],
      bullets: [],
      boss: null,
      miniBosses: []
    };

    // First render
    render(ctx, entities, mockGameState);
    const cachedCanvas = gate.cachedCanvas;
    expect(cachedCanvas).toBeDefined();

    // Reset mocks to clear call history
    vi.clearAllMocks();

    // Second render
    render(ctx, entities, mockGameState);

    // Should still have the same cached canvas
    expect(gate.cachedCanvas).toBe(cachedCanvas);

    // Should draw it again
    expect(ctx.drawImage).toHaveBeenCalledWith(
        gate.cachedCanvas,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
    );
  });
});
