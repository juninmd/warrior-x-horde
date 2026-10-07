// gameState.ts - Estado global do jogo
import { GameState } from './types';

export const gameState: GameState = {
  isStarted: false,
  isGameOver: false,
  isVictory: false,
  isPaused: false,
  currentLevel: 1,
  score: 0,
  highScore: Number(localStorage.getItem('crowdHighScore')) || 0,
  highScoreDistance: Number(localStorage.getItem('crowdHighScoreDist')) || 0,
  coins: Number(localStorage.getItem('crowdCoins')) || 0,
  gameSpeed: 0.5,
  baseGameSpeed: 0.5,
  distanceTraveled: 0,
  levelDistance: 5000, // Levels mais curtos e dinâmicos
  isBattling: false,
  battleTimer: 0,
  screenShakeActive: false,
  screenShakeIntensity: 0,
  screenShakeDuration: 0,
  screenShakeTimer: 0,
  lastFrameTime: 0,
  // Super Cannon
  superCannonActive: false,
  superCannonTimer: 0,
  superCannonDuration: 3000,
  superCannonCooldown: 63000, // 1 minuto e 3 segundos entre disparos
  superCannonLastUsed: 0,
  superCannonReady: true,
  superCannonDamageMultiplier: 5,
  // Combo system
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
  // Boss Atmosphere
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
    comboTier: 0,
    currentRank: 'D',
  deferredInstallPrompt: null,
  activeHitEntities: [],
};

export function resetGameState(): void {
  gameState.isStarted = false;
  gameState.isGameOver = false;
  gameState.isVictory = false;
  gameState.isPaused = false;
  gameState.currentLevel = 1; // Reiniciar do level 1
  gameState.levelDistance = 5000; // Reset da distância do level
  gameState.score = 0;
  // Coins persist, do not reset to 0
  gameState.coins = Number(localStorage.getItem('crowdCoins')) || 0;
  gameState.gameSpeed = gameState.baseGameSpeed;
  gameState.distanceTraveled = 0;
  gameState.isBattling = false;
  gameState.battleTimer = 0;
  gameState.superCannonActive = false;
  gameState.superCannonTimer = 0;
  gameState.superCannonReady = true;
  gameState.superCannonLastUsed = 0;
  gameState.combo = 0;
  gameState.comboTimer = 0;
  gameState.maxCombo = 0;
  gameState.currentRank = 'D';
  gameState.bossActive = false;
  gameState.bossAtmosphereIntensity = 0;
  gameState.newRecordReached = false;
  gameState.damageFlash = 0;
  gameState.lowArmyTriggered = false;
  gameState.slowMoTimer = 0;
  gameState.isDying = false;
  gameState.nukeTimer = 0;
  gameState.killStreak = 0;
  gameState.killStreakTimer = 0;
  gameState.totalKills = 0;
  gameState.nearMissCount = 0;
  gameState.runStartTime = Date.now();
  gameState.whiteFlash = 0;
  gameState.activeHitEntities = [];
  gameState.hitStop = 0;
  gameState.warpEffectTimer = 0;
  gameState.comboTier = 0;
  gameState.screenShakeActive = false;
  gameState.screenShakeIntensity = 0;
  gameState.screenShakeTimer = 0;
  // Do not reset deferredInstallPrompt as it persists across games

  // Update DOM elements if they exist (runs in browser only)
  if (typeof document !== 'undefined') {
    const startScreen = document.getElementById('startScreen');
    if (startScreen) startScreen.classList.add('active');
    const topControls = document.querySelector('.top-controls');
    if (topControls) topControls.classList.remove('active');
  }
}

export function saveGameProgress(stateOverride?: GameState): void {
  const state = stateOverride || gameState;
  try {
    localStorage.setItem('crowdCoins', state.coins.toString());
    if (state.highScore > 0) {
        localStorage.setItem('crowdHighScore', state.highScore.toString());
    }
    if (state.highScoreDistance > 0) {
        localStorage.setItem('crowdHighScoreDist', state.highScoreDistance.toString());
    }
  } catch {
    /* v8 ignore next */
    // storage unavailable (quota/private mode): progress just isn't persisted
  }
}
