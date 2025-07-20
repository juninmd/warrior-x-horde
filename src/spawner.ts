import { createBoss, createBarrel } from './entities';
import { gameState } from './gameState';
import { entities } from './game';
import { sounds } from './audio';
import { createZombie, triggerZombieSprints } from './spawner/zombieSpawner';

export function spawnEnemies() {
  if (!gameState.isStarted || gameState.isGameOver || entities.boss) return;

  const now = Date.now();
  if (now - gameState.lastSpawnTime < gameState.spawnRate) return;

  gameState.lastSpawnTime = now;
  const spawnCount = Math.min(Math.ceil(gameState.currentWave / 2), gameState.maxEnemies);

  for (let i = 0; i < spawnCount; i++) {
    entities.enemies.push(createZombie());
    gameState.enemiesSpawned++;
  }
}

export function spawnBoss(): void {
  if (!gameState.isStarted || entities.boss) return;
  entities.boss = createBoss(gameState.currentWave);
  sounds.gameMusic.pause();
  sounds.bossMusic.currentTime = 0;
  sounds.bossMusic.play();
  gameState.zombieSprintChance = Math.min(0.2 + (gameState.currentWave * 0.05), 0.5);
}

export function spawnBarrel(): void {
  if (!gameState.isStarted) return;
  const typeRoll = Math.random();
  let type = gameState.BarrelTypes.BUFF;
  if (typeRoll < 0.4) type = gameState.BarrelTypes.BUFF;
  else if (typeRoll < 0.7) type = gameState.BarrelTypes.REINFORCEMENT;
  else if (typeRoll < 0.9) type = gameState.BarrelTypes.HEALTH;
  else type = gameState.BarrelTypes.NERF;

  if (type === gameState.BarrelTypes.REINFORCEMENT && entities.allies.length >= gameState.maxReinforcements) {
    type = Math.random() < 0.5 ? gameState.BarrelTypes.BUFF : gameState.BarrelTypes.NERF;
  }
  entities.barrels.push(createBarrel(type as 'reinforcement' | 'nerf' | 'buff' | 'health' | 'shield'));
}

export { triggerZombieSprints };