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
  levelDistance: 5000,
  isBattling: false,
  battleTimer: 0,
  screenShakeActive: false,
  screenShakeIntensity: 0,
  screenShakeDuration: 0,
  screenShakeTimer: 0,
  lastFrameTime: 0,
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
}
