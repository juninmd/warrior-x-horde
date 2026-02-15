// tests/antigravity_audit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameState, Entities } from '../src/types';

// Mocks
vi.mock('../src/input', () => ({
  virtualJoystick: { active: false, alpha: 0 },
  getMouseX: () => 0,
  setInputScale: vi.fn(),
  setGameStateRef: vi.fn(),
  setupInput: vi.fn(),
  initializeMousePosition: vi.fn(),
  vibrate: vi.fn(),
  triggerHaptic: vi.fn()
}));
vi.mock('../src/renderer-boss', () => ({ drawBoss: vi.fn() }));
vi.mock('../src/renderer-utils', () => ({
  drawGlassBadge: vi.fn(), drawStar: vi.fn(), drawJoystick: vi.fn(), getComboColor: vi.fn()
}));
vi.mock('../src/quality', () => ({
  QualityManager: {
      getInstance: () => ({
          settings: { particleMultiplier: 1, enableShadows: true, simplifiedRendering: false, maxRenderedSoldiers: 100 },
          updateFPS: vi.fn(),
          setQuality: vi.fn(),
          checkRecovery: vi.fn()
      })
  }
}));
vi.mock('../src/audio', () => ({
  initAudio: vi.fn(),
  playMusic: vi.fn(),
  playSound: vi.fn(),
  stopAllMusic: vi.fn(),
  audioManager: {},
  toggleMute: vi.fn(),
  isMusicMuted: vi.fn()
}));

// Import AFTER mocks
import { addFloatingText, updateFloatingTexts, updateParticles, _testing as rendererTesting, addParticle, addExplosion } from '../src/renderer';
import { moveEntitiesDown } from '../src/movement';
import { createInitialEntities } from '../src/entities';
import { BASE_WIDTH, BASE_HEIGHT } from '../src/constants';
import { _testing as gameTesting } from '../src/game';
import { gameState, resetGameState } from '../src/gameState';

describe('Antigravity Audit', () => {

  describe('FloatingText Physics', () => {
    beforeEach(() => {
      // Clear floating texts by replacing the array if possible, or just knowing we append
      // Since _testing.getFloatingTexts returns the reference, we can clear it
      const texts = rendererTesting.getFloatingTexts();
      texts.length = 0;
    });

    it('should have initial antigravity (upward velocity) then fall', () => {
      addFloatingText('TEST', 100, 100, '#FFF');
      const texts = rendererTesting.getFloatingTexts();
      expect(texts.length).toBe(1);
      const ft = texts[0];

      // Initial state: "Pop" effect means upward velocity (negative Vy)
      expect(ft.vy).toBeLessThan(0);
      const initialVy = ft.vy;
      const initialY = ft.y;

      // Update 1 frame
      updateFloatingTexts();

      // Should move UP (y decreases) because vy is negative
      expect(ft.y).toBeLessThan(initialY);

      // Gravity should apply (vy increases/becomes less negative)
      expect(ft.vy).toBeGreaterThan(initialVy);
      expect(ft.vy).toBeCloseTo(initialVy + ft.gravity);
    });

    it('should eventually fall down (gravity dominance)', () => {
      addFloatingText('TEST', 100, 100, '#FFF');
      const texts = rendererTesting.getFloatingTexts();
      const ft = texts[0];

      // Simulate enough frames for gravity to overcome initial upward velocity
      for (let i = 0; i < 60; i++) {
        updateFloatingTexts();
      }

      expect(ft.vy).toBeGreaterThan(0); // Should be falling now
    });

    it('should be removed when alpha fades out (Cleanup Check)', () => {
       addFloatingText('TEST', 100, 100, '#FFF');
       const texts = rendererTesting.getFloatingTexts();

       // Force alpha to near zero to speed up test
       texts[0].alpha = 0.05;

       // Update a few times
       for(let i=0; i<5; i++) updateFloatingTexts();

       expect(texts.length).toBe(0);
    });
  });

  describe('Particle Physics', () => {
    beforeEach(() => {
        // Clear particles
        const particles = rendererTesting.getParticles();
        particles.length = 0;
    });

    it('should have gravity applied to particles', () => {
        addParticle(100, 100, 'spark', '#FFF');
        const particles = rendererTesting.getParticles();
        expect(particles.length).toBeGreaterThan(0);
        const p = particles[0];

        const initialVy = p.vy;

        // Update
        updateParticles();

        // Gravity is 0.1 per frame
        expect(p.vy).toBeCloseTo(initialVy + 0.1);
    });

    it('should cleanup particles', () => {
        addParticle(100, 100, 'spark', '#FFF');
        const particles = rendererTesting.getParticles();
        const p = particles[0];

        // Force expiry
        p.life = -0.1;

        updateParticles();

        expect(particles.length).toBe(0);
    });
  });

  describe('Entity Scrolling (World Gravity)', () => {
    let entities: Entities;
    let gameState: GameState;

    beforeEach(() => {
      entities = createInitialEntities(BASE_WIDTH, BASE_HEIGHT);
      gameState = {
        isGameOver: false,
        isVictory: false,
        isStarted: true,
        isPaused: false,
        currentLevel: 1,
        score: 0,
        highScore: 0,
        coins: 0,
        gameSpeed: 5, // Set a known speed
        baseGameSpeed: 5,
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
        superCannonReady: true,
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
        nukeTimer: 0
      };
    });

    it('should move gates downwards (scrolling gravity)', () => {
      // Create a gate manually or use existing
      entities.gates = [{
        id: 1, x: 100, y: 100, width: 100, height: 50,
        type: 'add', value: 10, color: '#FFF', side: 'left', passed: false
      }];

      const initialY = entities.gates[0].y;

      // Move entities
      moveEntitiesDown(entities, gameState, 1.0); // dtFactor 1.0

      expect(entities.gates[0].y).toBeGreaterThan(initialY);
    });

    it('should NOT move entities if game is paused (Antigravity Halt)', () => {
      entities.gates = [{
        id: 1, x: 100, y: 100, width: 100, height: 50,
        type: 'add', value: 10, color: '#FFF', side: 'left', passed: false
      }];
      gameState.isPaused = true;

      const initialY = entities.gates[0].y;
      moveEntitiesDown(entities, gameState, 1.0);

      expect(entities.gates[0].y).toBe(initialY);
    });
  });

  describe('Game Loop Physics Timers (Antigravity Decay)', () => {
    it('should decay screen shake timer', () => {
        resetGameState();
        gameState.isStarted = true;
        gameState.screenShakeActive = true;
        gameState.screenShakeTimer = 30;

        // Mock setEntities to prevent crash if game loop tries to access them
        gameTesting.setEntities(createInitialEntities(BASE_WIDTH, BASE_HEIGHT));

        // Run loop: t=1000 (init lastTime), t=1100 (dt=100 -> cap 50)
        gameTesting.gameLoop(1000);
        gameTesting.gameLoop(1100);

        expect(gameState.screenShakeTimer).toBeLessThanOrEqual(0);
        expect(gameState.screenShakeActive).toBe(false);
    });
  });
});
