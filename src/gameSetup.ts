
import { createPlayer } from './entities';
import { sounds } from './audio';
import { Entities } from './types';
import { GameState } from './types';

export function initGame(entities: Entities, gameState: GameState, gameLoop: () => void, startButton: HTMLButtonElement): void {
  Object.assign(gameState, {
    isStarted: true, isGameOver: false, currentWave: 1, enemiesSpawned: 0, enemiesKilled: 0, score: 0,
    difficultyMultiplier: 1.0, enemiesRequiredForBoss: 20, waveStartTime: Date.now(), lastSpawnTime: Date.now()
  });
  entities.allies = [createPlayer()];
  entities.enemies = [];
  entities.barrels = [];
  entities.bullets = [];
  entities.boss = null;
  sounds.gameStart.play();
  sounds.gameMusic.play();
  startButton.style.display = "none";
  gameLoop();
}
