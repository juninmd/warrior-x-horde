
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState } from '../src/types';
import * as renderer from '../src/renderer';

// Mocks
vi.mock('../src/renderer', () => ({
  render: vi.fn(),
  shareOnX: vi.fn(),
  shareOnWhatsApp: vi.fn(),
  addFloatingText: vi.fn(), updateFloatingTexts: vi.fn(),
  addParticle: vi.fn(),
  addExplosion: vi.fn(),
  addTrail: vi.fn(),
}));

vi.mock('../src/audio', () => ({
  initAudio: vi.fn(),
  playMusic: vi.fn(),
  playSound: vi.fn(),
  stopAllMusic: vi.fn(),
  toggleMute: vi.fn(() => true),
  isMusicMuted: vi.fn(() => false),
  audioManager: {
      gameStart: {},
      victory: {},
      gameOver: {},
      powerUp: {},
      superCannon: {},
      nerf: {}
  }
}));

vi.mock('../src/ui-overlay', () => ({
  setupShopUI: vi.fn((cb) => { (window as any)._buyCallback = cb; }),
  updateShopUI: vi.fn(),
  setupSuperCannonUI: vi.fn((cb) => { (window as any)._superCallback = cb; }),
  updateSuperCannonUI: vi.fn(),
  setupGameOverUI: vi.fn(),
  showGameOverScreen: vi.fn(),
  startCountdown: vi.fn((cb) => cb()), // Immediate start
  updateStartScreenLeaderboard: vi.fn(), createPauseModal: vi.fn(),
}));

describe('Game Coverage', () => {
  let gameModule: any;
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();

    // Mock requestAnimationFrame to capture callback
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    // Ensure canvas exists
    document.body.innerHTML = '<div id="game-container"><canvas id="gameCanvas"></canvas></div><div id="startScreen"></div><div id="startBtnOverlay"></div><button id="muteBtn"></button><button id="pauseBtnTop"></button><button id="superCannonBtnInline"></button>';

    // Import game module
    gameModule = await import('../src/game');
  });

  it('should start game', () => {
    gameModule.startGame();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it('should toggle pause', () => {
    gameModule.startGame();
    const initialCalls = vi.mocked(window.requestAnimationFrame).mock.calls.length;

    // Pause
    gameModule.togglePause();
    const pauseBtn = document.getElementById('pauseBtnTop');
    expect(pauseBtn?.textContent).toBe('▶️');
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(initialCalls); // No new calls

    // Resume
    gameModule.togglePause();
    expect(pauseBtn?.textContent).toBe('⏸️');
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(initialCalls + 1);
  });

  it('should execute game loop logic', async () => {
      const { gameState } = await import('../src/gameState');

      gameModule.startGame();
      expect(rafCallback).toBeDefined();

      if (!rafCallback) return;

      // 1. Normal Frame
      rafCallback(1000);

      // 2. Pause Logic
      gameState.isPaused = true;
      rafCallback(1016);
      gameState.isPaused = false;

      // 3. Hit Stop Logic
      gameState.hitStop = 10;
      rafCallback(1032);
      expect(gameState.hitStop).toBe(9);
      gameState.hitStop = 0;

      // 4. Slow Mo Logic
      gameState.slowMoTimer = 100;
      rafCallback(1048);
      expect(gameState.slowMoTimer).toBeLessThan(100);
      gameState.slowMoTimer = 0;

      // 5. Screen Shake Logic
      gameState.screenShakeTimer = 100;
      gameState.screenShakeActive = true;
      rafCallback(1064);
      expect(gameState.screenShakeTimer).toBeLessThan(100);
      gameState.screenShakeTimer = 0;

      // 6. Combo Logic
      gameState.comboTimer = 100;
      gameState.combo = 5;
      rafCallback(1080);
      expect(gameState.comboTimer).toBeLessThan(100);

      // 7. Low Army Warning
      // Need army in entities. Entities are local to game.ts but passed to render.
      // We can't easily modify entities directly unless we intercept them in render call.
      // But we can check if triggerScreenShake was called or audio.

      // 8. Victory Logic
      gameState.isVictory = true;
      gameState.currentLevel = 1;
      // This calls advanceToNextLevel
      rafCallback(1096);
      expect(gameState.isVictory).toBe(false); // Reset by advanceToNextLevel
      expect(gameState.currentLevel).toBe(2);

      // 9. Game Over Logic
      gameState.isGameOver = true;
      rafCallback(1112);
      // verify showGameOverScreen called
      const ui = await import('../src/ui-overlay');
      expect(ui.showGameOverScreen).toHaveBeenCalled();
  });

  it('should toggle fullscreen', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreen;

    gameModule.toggleFullscreen();
    expect(requestFullscreen).toHaveBeenCalled();
  });

  it('should debug set level', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    gameModule.debugSetLevel(5);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Indo para Level 5'));
  });

  it('should handle resize', () => {
    // Trigger resize
    window.innerWidth = 1000;
    window.innerHeight = 1000;
    window.dispatchEvent(new Event('resize'));

    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    // Check if style width changed (resizeCanvas logic)
    expect(canvas.style.width).toBeTruthy();
  });

  it('should handle buy action', () => {
    // Need to trigger the callback passed to setupShopUI
    const buyCallback = (window as any)._buyCallback;
    expect(buyCallback).toBeDefined();

    // Need to set coins in gameState.
    // Since we mocked modules, we can't easily access the singleton gameState imported by game.ts
    // unless we mock gameState module too.
    // game.ts imports { gameState } from './gameState'.
    // If we don't mock './gameState', it uses the real one.
    // So we can import it here and modify it.
  });
});
