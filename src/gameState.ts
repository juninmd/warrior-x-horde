// @ts-check
// gameState.ts - Definição do estado global do jogo
import { GameState } from './types';

const spawnRate = 700; // Taxa de spawn inicial em ms

// Estado global do jogo
export let gameState: GameState = {
  isStarted: false,
  isGameOver: false,
  currentWave: 1,
  enemiesSpawned: 0,
  enemiesKilled: 0,
  enemiesKilledWave: 0,
  enemiesRequiredForBoss: 50,
  bossSpawnCooldown: 0,
  maxBossSpawnCooldown: 10000, // 10 segundos
  zombieSprintChance: 0.3,
  zombieSprintCooldown: 0,
  highScore: Number(localStorage.getItem('highScore')) || 0,
  score: 0,
  spawnRate: spawnRate,
  lastSpawnTime: 0,
  difficultyMultiplier: 1.0,
  waveStartTime: 0,
  maxReinforcements: 20,
  maxEnemies: 100,
  BarrelTypes: {
    REINFORCEMENT: 'reinforcement',
    NERF: 'nerf',
    BUFF: 'buff',
    HEALTH: 'health',
    SHIELD: 'shield'
  },
  showBossWarning: false,
  maxAllies: 30,
  superCannonCooldown: 20000,
  superCannonActive: false,
  superCannonTimer: 0,
  superCannonDuration: 4000,
  superCannonDamageMultiply: 5,
  superCannonLastUsed: 0,
  superCannonReady: false,
  screenShakeActive: false,
  screenShakeIntensity: 0,
  screenShakeDuration: 0,
  screenShakeTimer: 0,
  superCannonWarningPlayed: false,
  lastFrameTime: 0,
  coins: 0,
  isShopOpen: false
};
