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
  coins: 0,
  gameSpeed: 0.5,
  baseGameSpeed: 0.5,
  distanceTraveled: 0,
  levelDistance: 15000, // 3x maior (era 5000)
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
  superCannonCooldown: 33000, // 33 segundos entre disparos
  superCannonLastUsed: 0,
  superCannonReady: true,
  superCannonDamageMultiplier: 5,
  // Combo system
  combo: 0,
  comboTimer: 0,
  maxCombo: 0,
};

export function resetGameState(): void {
  gameState.isStarted = false;
  gameState.isGameOver = false;
  gameState.isVictory = false;
  gameState.isPaused = false;
  gameState.score = 0;
  gameState.coins = 0;
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
}
