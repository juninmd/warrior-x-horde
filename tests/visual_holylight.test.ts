import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, addParticle, _testing } from '../src/renderer';
import { GameState, Entities, Army } from '../src/types';

// Mock canvas context
const ctx = {
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  ellipse: vi.fn(),
  roundRect: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  setTransform: vi.fn(),
  canvas: { width: 800, height: 1200 },
} as unknown as CanvasRenderingContext2D;

describe('Holy Light VFX', () => {
  let gameState: GameState;
  let entities: Entities;

  beforeEach(() => {
    // Reset particles
    const particles = _testing.getParticles();
    particles.length = 0;

    gameState = {
      isGameOver: false,
      isVictory: false,
      isStarted: true,
      isPaused: false,
      currentLevel: 1,
      score: 0,
      highScore: 0,
      highScoreDistance: 0,
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
      isDying: false,
      nukeTimer: 0,
      killStreak: 0,
      killStreakTimer: 0,
      totalKills: 0,
      runStartTime: 0,
      nearMissCount: 0,
      whiteFlash: 0,
      warpEffectTimer: 0,
      deferredInstallPrompt: null,
      comboTier: 0,
      currentRank: 'D'
    };

    entities = {
      playerArmy: {
        soldiers: [],
        aliveCount: 50,
        centerX: 400,
        centerY: 1000,
        targetX: 400,
        color: '#000',
        isPlayer: true,
        fireRate: 100,
        lastShotTime: 0,
        damage: 1,
        trail: { points: [], color: '#000', width: 1, maxLength: 10 }
      } as unknown as Army,
      enemyHordes: [],
      gates: [],
      weapons: [],
      mysteryBoxes: [],
      coins: [],
      bullets: [],
      boss: null,
      miniBosses: []
    };

    vi.clearAllMocks();
  });

  it('should add beam particle', () => {
    addParticle(100, 100, 'beam', '#FFD700');
    const particles = _testing.getParticles();
    expect(particles.length).toBe(1);
    expect(particles[0].type).toBe('beam');
  });

  it('should draw beam particle with gradients', () => {
    addParticle(400, 600, 'beam', '#FFD700');

    // Render frame
    render(ctx, entities, gameState);

    // Expect linear gradient creation
    expect(ctx.createLinearGradient).toHaveBeenCalled();
    // Expect filling rect
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
