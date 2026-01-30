// Mock dependencies
import { vi } from 'vitest';

// Mock renderer-utils and renderer-boss which use Canvas API heavily
vi.mock('../src/renderer-utils', () => ({
    drawGlassBadge: vi.fn(),
    drawStar: vi.fn(),
    drawJoystick: vi.fn(),
    getComboColor: vi.fn().mockReturnValue('#fff'),
}));

vi.mock('../src/renderer-boss', () => ({
    drawBoss: vi.fn(),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import {
    render,
    preRenderSprites,
    addFloatingText,
    addExplosion,
    addParticle,
    addTrail,
    drawPauseScreen,
    updateFloatingTexts,
    _testing,
    _resetSpriteCache
} from '../src/renderer';
import { GameState, Entities, Army } from '../src/types';

describe('Renderer', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 800;
    ctx = canvas.getContext('2d')!;
    vi.clearAllMocks();
  });

  it('should pre-render sprites', () => {
    preRenderSprites();
    // It should populate spriteCache, but it's internal.
    // However, it shouldn't crash.
    expect(true).toBe(true);
  });

  it('should add particles', () => {
      addParticle(100, 100, 'spark', '#fff');
      addExplosion(100, 100, '#f00');
      addTrail(100, 100, '#00f');
      // Verify internal lists updated? Not exposed.
      // But verify it doesn't crash.
      expect(true).toBe(true);
  });

  it('should add floating text', () => {
      addFloatingText('Test', 100, 100, '#fff');
      expect(true).toBe(true);
  });

  it('should render frame', () => {
      const army: Army = {
          soldiers: [{ isAlive: true, x: 100, y: 100, size: 10, hp: 10, type: 'normal' }],
          centerX: 100,
          centerY: 100,
          damage: 1,
          fireRate: 100
      } as any;

      const entities: Entities = {
          playerArmy: army,
          coins: [{ x: 50, y: 50, passed: false, value: 1 }],
          gates: [{ x: 50, y: 50, passed: false, type: 'add', value: 1 }],
          enemyHordes: [{ isActive: true, soldiers: [], y: 50 }],
          mysteryBoxes: [{ x: 50, y: 50, passed: false }],
          miniBosses: [{ isActive: true, x: 50, y: 50 }],
          boss: { isActive: true, x: 50, y: 50 },
          bullets: [{ x: 100, y: 100, isEnemy: false }],
          weapons: []
      } as any;

      const gameState: GameState = {
          score: 100,
          coins: 50,
          currentLevel: 1,
          armyPower: 10,
          gameSpeed: 1,
          isPaused: false,
          isGameOver: false,
          distanceTraveled: 100,
          levelDistance: 1000,
          bossActive: false,
          bossAtmosphereIntensity: 0,
          screenShakeActive: false,
          highScore: 0,
          combo: 0,
          comboTimer: 0
      } as any;

      render(ctx, entities, gameState);

      expect(ctx.clearRect).toHaveBeenCalled();
  });

  it('should render frame with particles (cached and uncached)', () => {
      preRenderSprites(); // Ensure cache is populated

      // Add Cached particles (spark #FFF is in pre-render list)
      addParticle(100, 100, 'spark', '#FFF', 1);

      // Add Uncached particle (unique color)
      addParticle(200, 200, 'spark', '#123456', 1);

      const army: Army = {
          soldiers: [],
          centerX: 100,
          centerY: 100,
          damage: 1,
          fireRate: 100
      } as any;

      const entities: Entities = {
          playerArmy: army,
          coins: [],
          gates: [],
          enemyHordes: [],
          mysteryBoxes: [],
          miniBosses: [],
          boss: null,
          bullets: [],
          weapons: []
      } as any;

      const gameState: GameState = {
          score: 0,
          coins: 0,
          currentLevel: 1,
          gameSpeed: 1,
          isPaused: false,
          bossAtmosphereIntensity: 0,
          screenShakeActive: false,
          damageFlash: 0
      } as any;

      render(ctx, entities, gameState);
      // Logic inside drawParticles (loops, cache checks) will run
      expect(true).toBe(true);
  });

  it('should draw pause screen', () => {
      drawPauseScreen(ctx, 480, 800);
      expect(ctx.fillStyle).toBe('#FFD700'); // Last fillStyle set
      expect(ctx.fillText).toHaveBeenCalledWith('⏸️ PAUSADO', 240, 400);
  });

  it('should update and remove floating texts', () => {
      // Reset
      const texts = _testing.getFloatingTexts();
      texts.length = 0;

      addFloatingText('FadeMe', 100, 100, '#fff');
      expect(texts.length).toBe(1);

      // Run updates until it fades out
      // Alpha starts at 1, decrements by 0.02. Needs ~51 updates.
      for (let i = 0; i < 60; i++) {
          updateFloatingTexts();
      }

      expect(texts.length).toBe(0);
  });

  it('should handle floating text gravity', () => {
      // Reset
      const texts = _testing.getFloatingTexts();
      texts.length = 0;

      addFloatingText('Fall', 100, 100, '#fff');
      const startY = texts[0].y;

      updateFloatingTexts();

      expect(texts[0].y).not.toBe(startY);
  });

  it('should force re-render sprites', () => {
      _resetSpriteCache();
      preRenderSprites();
      // This exercises renderSoldierToCache and renderSoldierShape for all types
      expect(true).toBe(true);
  });
});
