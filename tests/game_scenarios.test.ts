
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameState, Entities } from '../src/types';

// Mock dependencies
vi.mock('../src/renderer', () => ({
  render: vi.fn(),
  addFloatingText: vi.fn(), updateFloatingTexts: vi.fn(),
  shareOnX: vi.fn(),
  shareOnWhatsApp: vi.fn(),
}));

vi.mock('../src/audio', () => ({
  initAudio: vi.fn(),
  playSound: vi.fn(),
  playMusic: vi.fn(),
  stopAllMusic: vi.fn(),
  audioManager: {},
  toggleMute: vi.fn(),
  isMusicMuted: vi.fn(),
}));

vi.mock('../src/ui-overlay', () => ({
  setupShopUI: vi.fn(),
  updateShopUI: vi.fn(),
  setupSuperCannonUI: vi.fn(),
  updateSuperCannonUI: vi.fn(),
  setupGameOverUI: vi.fn(),
  showGameOverScreen: vi.fn(),
  startCountdown: vi.fn((cb) => cb()),
  updateStartScreenLeaderboard: vi.fn(),
}));

// We need to control entities
const mockArmy = {
    aliveCount: 100,
    soldiers: [],
    centerX: 0, centerY: 0, fireRate: 0, damage: 0
};
const mockEntities: Entities = {
    playerArmy: mockArmy as any,
    enemyHordes: [], gates: [], mysteryBoxes: [], coins: [], bullets: [], miniBosses: [], boss: null
};

vi.mock('../src/entities', () => ({
    createInitialEntities: vi.fn(() => mockEntities),
    createEnemyHorde: vi.fn(() => ({
        id: 1, x: 0, y: 0, width: 10, height: 10, hp: 10, maxHp: 10, isActive: true,
        soldiers: [], count: 0, color: '#F00', speed: 0
    })),
    createSoldier: vi.fn(),
    addSoldiersToArmy: vi.fn(),
    addSpecialSoldiersToArmy: vi.fn(),
    createGatePair: vi.fn(() => []), // Return empty array
    createCoin: vi.fn(() => ({ id: 1, x: 0, y: 0, value: 1 })),
    createBoss: vi.fn(),
    createMiniBoss: vi.fn(),
    createMysteryBox: vi.fn(),
}));

describe('Game Low Army Coverage', () => {
  let gameModule: any;
  let rafCallback: FrameRequestCallback;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
    });

    if (!document.getElementById('gameCanvas')) {
        document.body.innerHTML = '<canvas id="gameCanvas"></canvas>';
    }

    gameModule = await import('../src/game');
  });

  it('should trigger low army warning', async () => {
      gameModule.startGame();

      const { gameState } = await import('../src/gameState');
      const renderer = await import('../src/renderer');

      // 1. High Army (100)
      mockArmy.aliveCount = 100;
      if (rafCallback) rafCallback(1000);
      expect(renderer.addFloatingText).not.toHaveBeenCalledWith(expect.stringContaining('LOW ARMY'), expect.anything(), expect.anything(), expect.anything(), expect.anything());

      // 2. Low Army (5)
      mockArmy.aliveCount = 5;
      if (rafCallback) rafCallback(1016);
      expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('LOW ARMY'), expect.anything(), expect.anything(), expect.anything(), expect.anything());

      // 3. Reset (High Army again)
      mockArmy.aliveCount = 20;
      if (rafCallback) rafCallback(1032);
      expect(gameState.lowArmyTriggered).toBe(false);
  });
});
