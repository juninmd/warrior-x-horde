
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as game from '../src/game';
import * as movementModule from '../src/movement';
import * as gameStateModule from '../src/gameState';

// Mock dependencies
vi.mock('../src/renderer', () => ({
  render: vi.fn(),
  addFloatingText: vi.fn(),
  updateFloatingTexts: vi.fn(),
  addParticle: vi.fn(),
  shareOnX: vi.fn(),
  shareOnWhatsApp: vi.fn()
}));

vi.mock('../src/ui-overlay', () => ({
  updateShopUI: vi.fn(),
  updateSuperCannonUI: vi.fn(),
  setupShopUI: vi.fn(),
  setupSuperCannonUI: vi.fn(),
  setupGameOverUI: vi.fn(),
  updateStartScreenLeaderboard: vi.fn(),
  setupStartScreenInstallBtn: vi.fn(),
  createPauseModal: vi.fn(),
  startCountdown: vi.fn()
}));

vi.mock('../src/audio', () => ({
  initAudio: vi.fn(),
  playMusic: vi.fn(),
  playSound: vi.fn(),
  stopAllMusic: vi.fn(),
  audioManager: {},
  isMusicMuted: vi.fn().mockReturnValue(false)
}));

vi.mock('../src/input', () => ({
  setupInput: vi.fn(),
  getMouseX: vi.fn().mockReturnValue(0),
  initializeMousePosition: vi.fn(),
  setGameStateRef: vi.fn(),
  triggerHaptic: vi.fn()
}));

describe('Fixed Timestep Loop', () => {
  let requestAnimationFrameMock: any;

  beforeEach(() => {
    vi.useFakeTimers();
    requestAnimationFrameMock = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);

    // Mock Game State to be started
    game._testing.setEntities({
        playerArmy: { aliveCount: 1, soldiers: [], centerX: 200, centerY: 600 } as any,
        enemyHordes: [],
        gates: [],
        mysteryBoxes: [],
        coins: [],
        bullets: [],
        boss: null,
        miniBosses: [],
        weapons: []
    });

    // Reset loop state
    game._testing.resetLoop();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should run fixedUpdate multiple times for large delta time', () => {
    const moveSpy = vi.spyOn(movementModule, 'updateMovement');

    gameStateModule.gameState.isStarted = true;
    gameStateModule.gameState.isPaused = false;
    gameStateModule.gameState.isGameOver = false;

    // Trigger loop with 1000 (init). dt=16, acc=16. lastTime=1000.
    game._testing.gameLoop(1000);

    // Reset mocks (ignore init update if any)
    moveSpy.mockClear();

    // Trigger loop with 32ms elapsed (1032). dt=32. acc=16+32=48.
    // 48 >= 16.66 (1) -> 31.33
    // 31.33 >= 16.66 (2) -> 14.66
    // Expect 2 calls.
    game._testing.gameLoop(1032);

    expect(moveSpy).toHaveBeenCalledTimes(2);
  });

  it('should run fixedUpdate zero times for small delta time', () => {
    const moveSpy = vi.spyOn(movementModule, 'updateMovement');

    gameStateModule.gameState.isStarted = true;

    // Reset loop
    game._testing.resetLoop();

    // Init with 1000. dt=16, acc=16. lastTime=1000.
    game._testing.gameLoop(1000);

    // Reset mocks (accumulator is 16)
    moveSpy.mockClear();

    // Trigger loop with 0.5ms elapsed (1000.5). dt=0.5. acc=16+0.5=16.5.
    // 16.5 < 16.666.
    // Expect 0 calls.
    game._testing.gameLoop(1000.5);

    expect(moveSpy).toHaveBeenCalledTimes(0);
  });
});
