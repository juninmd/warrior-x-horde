
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as renderer from '../src/renderer';
import { GameState } from '../src/types';

// Singleton mock for gameState to ensure consistency
const mockGameState = vi.hoisted(() => ({
  isStarted: false,
  isGameOver: false,
  isPaused: false,
  lowArmyTriggered: false,
  score: 0,
  highScore: 0,
  coins: 0,
  currentLevel: 1,
  distanceTraveled: 0,
  levelDistance: 1000,
  gameSpeed: 1,
  baseGameSpeed: 1,
  isVictory: false,
  isBattling: false,
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  killStreak: 0,
  killStreakTimer: 0,
  screenShakeActive: false,
  screenShakeIntensity: 0,
  screenShakeDuration: 0,
  screenShakeTimer: 0,
  hitStop: 0,
  slowMoTimer: 0,
  damageFlash: 0,
  whiteFlash: 0,
  superCannonReady: false,
  superCannonActive: false,
  superCannonTimer: 0,
  superCannonDuration: 0,
  superCannonCooldown: 0,
  superCannonLastUsed: 0,
  superCannonDamageMultiplier: 1,
  nukeTimer: 0,
  deferredInstallPrompt: null,
}));

vi.mock('../src/gameState', () => ({
  gameState: mockGameState,
  resetGameState: () => {
      mockGameState.isStarted = false;
      mockGameState.isGameOver = false;
      mockGameState.lowArmyTriggered = false;
  },
  saveGameProgress: vi.fn(),
}));

vi.mock('../src/renderer', () => ({
  render: vi.fn(),
  addFloatingText: vi.fn(),
  updateFloatingTexts: vi.fn(),
  shareOnX: vi.fn(),
  shareOnWhatsApp: vi.fn(),
  addParticle: vi.fn(),
  addExplosion: vi.fn(),
}));

// Import game after mocks
import { _testing } from '../src/game';
import { createPlayerArmy } from '../src/entities';

describe('Game Loop Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGameState.isStarted = true;
        mockGameState.isGameOver = false;
        mockGameState.lowArmyTriggered = false;

        // Setup entities
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

        vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0);
    });

    it('should trigger low army warning', () => {
        const entities = _testing.getEntities();
        entities.playerArmy.aliveCount = 5;

        _testing.gameLoop(100);

        expect(mockGameState.lowArmyTriggered).toBe(true);
        expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('LOW ARMY'), expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
    });
});
