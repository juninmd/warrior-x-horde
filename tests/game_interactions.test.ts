
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState, Entities } from '../src/types';
import * as audio from '../src/audio';
import * as renderer from '../src/renderer';

// Mock shooting BEFORE imports
vi.mock('../src/shooting', () => ({
  activateSuperCannon: vi.fn(),
  updateShooting: vi.fn(),
  updateBullets: vi.fn(),
  updateSuperCannon: vi.fn(),
  createBullet: vi.fn(),
}));

// Mock dependencies
vi.mock('../src/audio', () => ({
  playSound: vi.fn(),
  audioManager: {
    powerUp: {},
    nerf: {},
    superCannon: {},
    gameStart: {},
    gameOver: {},
    victory: {},
    gameMusic: { pause: vi.fn(), currentTime: 0, play: vi.fn().mockResolvedValue(undefined) },
    bossMusic: { pause: vi.fn(), currentTime: 0, play: vi.fn().mockResolvedValue(undefined) },
  },
  initAudio: vi.fn(),
  playMusic: vi.fn(),
  stopAllMusic: vi.fn(),
  toggleMute: vi.fn(),
  isMusicMuted: vi.fn().mockReturnValue(false),
}));

vi.mock('../src/renderer', () => ({
  render: vi.fn(),
  addFloatingText: vi.fn(),
  shareOnX: vi.fn(),
  shareOnWhatsApp: vi.fn(),
  updateFloatingTexts: vi.fn(),
  addParticle: vi.fn(), // Add this
  addExplosion: vi.fn(), // Add this
}));

vi.mock('../src/input', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    vibrate: vi.fn(),
    // setupInput: vi.fn(), // Do not mock setupInput so we can test listeners
    // initializeMousePosition: vi.fn(),
    getMouseX: vi.fn().mockReturnValue(100),
  };
});

// Capture UI callbacks
const uiCallbacks = vi.hoisted(() => ({
  handleBuy: null as any,
  handleSuperCannon: null as any,
  onRestart: null as any,
  onShare: null as any
}));

vi.mock('../src/ui-overlay', () => ({
  setupShopUI: (cb: any) => { uiCallbacks.handleBuy = cb; },
  setupSuperCannonUI: (cb: any) => { uiCallbacks.handleSuperCannon = cb; },
  updateShopUI: vi.fn(),
  updateSuperCannonUI: vi.fn(),
  updateSuperButtonInline: vi.fn(),
  setupGameOverUI: (restartCb: any, shareCb: any) => {
    uiCallbacks.onRestart = restartCb;
    uiCallbacks.onShare = shareCb;
  },
  showGameOverScreen: vi.fn(),
  startCountdown: (cb: any) => cb(),
}));

// Import game AFTER mocks
import { _testing, togglePause, startGame, triggerSuperCannon, debugSetLevel, canvas as gameCanvas } from '../src/game';
import { gameState, resetGameState } from '../src/gameState';
import { createPlayerArmy, createEnemyHorde } from '../src/entities';
import * as shooting from '../src/shooting';

describe('Game Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGameState();
    // Reset entities via _testing
    const army = createPlayerArmy(800, 600);
    _testing.setEntities({
      playerArmy: army,
      enemyHordes: [],
      gates: [],
      weapons: [],
      mysteryBoxes: [],
      coins: [],
      bullets: [],
      boss: null,
      miniBosses: [],
    });

    // Ensure game loop doesn't run infinitely if we call startGame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Shop Interactions', () => {
    it('should handle "soldier" purchase', () => {
      gameState.coins = 1000;
      uiCallbacks.handleBuy('soldier', 100);

      expect(gameState.coins).toBe(900);
      expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('+10'), expect.any(Number), expect.any(Number), expect.any(String));
      expect(audio.playSound).toHaveBeenCalled();
    });

    it('should handle "nuke" purchase', () => {
      gameState.coins = 1000;
      // Setup enemies to kill
      const horde = createEnemyHorde(800, 100, 10, 1);
      _testing.getEntities().enemyHordes.push(horde);

      uiCallbacks.handleBuy('nuke', 500);

      expect(gameState.coins).toBe(500);
      expect(gameState.nukeTimer).toBe(60);
      expect(horde.isActive).toBe(false);
      expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('ORBITAL STRIKE'), expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
    });

    it('should handle "recharge_super" purchase', () => {
      gameState.coins = 1000;
      gameState.superCannonReady = false;
      gameState.superCannonLastUsed = Date.now() - 1000; // Just used

      uiCallbacks.handleBuy('recharge_super', 200);

      expect(gameState.coins).toBe(800);
      expect(gameState.superCannonReady).toBe(true);
      expect(renderer.addFloatingText).toHaveBeenCalledWith('SUPER READY!', expect.any(Number), expect.any(Number), expect.any(String));
    });

    it('should fail purchase if not enough coins', () => {
       gameState.coins = 0;
       uiCallbacks.handleBuy('soldier', 100);
       expect(gameState.coins).toBe(0);
       expect(audio.playSound).toHaveBeenCalledWith(expect.objectContaining({})); // nerf sound
    });

    it('should not purchase recharge_super if already ready', () => {
       gameState.coins = 1000;
       gameState.superCannonReady = true;
       uiCallbacks.handleBuy('recharge_super', 200);
       expect(gameState.coins).toBe(1000); // No charge
    });
  });

  describe('Input & Events', () => {
    it('should handle visibilitychange to pause game', () => {
        gameState.isStarted = true;
        gameState.isPaused = false;

        // Mock document.hidden
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        const event = new Event('visibilitychange');
        document.dispatchEvent(event);

        expect(gameState.isPaused).toBe(true);
    });

  });
});
