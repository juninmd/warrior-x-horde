import { describe, it, expect, vi, beforeEach } from 'vitest';

// Guarda os callbacks da contagem regressiva para dispará-los manualmente
const countdownCallbacks: (() => void)[] = [];

vi.mock('../src/ui-overlay', () => ({
  setupShopUI: vi.fn(),
  setupSuperCannonUI: vi.fn(),
  updateShopUI: vi.fn(),
  updateSuperCannonUI: vi.fn(),
  setupGameOverUI: vi.fn(),
  showGameOverScreen: vi.fn(),
  startCountdown: vi.fn((cb: () => void) => { countdownCallbacks.push(cb); }),
  updateStartScreenLeaderboard: vi.fn(),
  setupStartScreenInstallBtn: vi.fn(),
  createPauseModal: vi.fn(),
}));

vi.mock('../src/audio', () => ({
  initAudio: vi.fn(),
  playSound: vi.fn(),
  playMusic: vi.fn(),
  stopAllMusic: vi.fn(),
  toggleMute: vi.fn(),
  isMusicMuted: vi.fn(() => false),
  audioManager: { gameStart: {}, powerUp: {}, nerf: {}, superCannon: {} },
}));

describe('startGame reentrancy guard', () => {
  let gameModule: any;
  let gameState: any;

  beforeEach(async () => {
    vi.resetModules();
    countdownCallbacks.length = 0;
    if (!document.getElementById('gameCanvas')) {
      document.body.innerHTML = '<canvas id="gameCanvas"></canvas>';
    }
    gameModule = await import('../src/game');
    gameState = (await import('../src/gameState')).gameState;
  });

  it('ignores the countdown of a superseded start', () => {
    gameModule.startGame();
    gameModule.startGame();
    expect(countdownCallbacks).toHaveLength(2);

    gameState.isStarted = false;

    // A contagem da primeira partida não deve mais iniciar o loop
    countdownCallbacks[0]();
    expect(gameState.isStarted).toBe(false);

    // A da partida mais recente inicia normalmente
    countdownCallbacks[1]();
    expect(gameState.isStarted).toBe(true);
  });
});
