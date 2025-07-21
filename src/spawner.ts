import { createBoss, createBarrel, createObstacle } from './entities';
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
  let type: 'reinforcement' | 'health' | 'buff_shield' | 'buff_damage' | 'buff_firerate' | 'nerf_damage' | 'nerf_firerate' | 'nerf_health';

  if (typeRoll < 0.3) { // 30% for reinforcement
    type = 'reinforcement';
  } else if (typeRoll < 0.5) { // 20% for health (0.3 + 0.2 = 0.5)
    type = 'health';
  } else if (typeRoll < 0.8) { // 30% for buffs (0.5 + 0.3 = 0.8)
    const buffRoll = Math.random();
    if (buffRoll < 0.33) type = 'buff_shield';
    else if (buffRoll < 0.66) type = 'buff_damage';
    else type = 'buff_firerate';
  } else { // 20% for nerfs
    const nerfRoll = Math.random();
    if (nerfRoll < 0.33) type = 'nerf_damage';
    else if (nerfRoll < 0.66) type = 'nerf_firerate';
    else type = 'nerf_health';
  }

  if (type === 'reinforcement' && entities.allies.length >= gameState.maxReinforcements) {
    // If max reinforcements reached, change to a buff or nerf
    type = Math.random() < 0.5 ? (Math.random() < 0.5 ? 'buff_damage' : 'buff_firerate') : (Math.random() < 0.5 ? 'nerf_damage' : 'nerf_firerate');
  }

  let side: 'left' | 'right' = 'left';
  if (type === 'buff_shield' || type === 'buff_damage' || type === 'buff_firerate') {
    side = 'right';
  }

  entities.barrels.push(createBarrel(type, side));
}

export function spawnObstacles(): void {
  // Clear existing obstacles
  entities.obstacles = [];

  const layouts = [
    // Layout 1: Two central blocks
    [
      { x: 200, y: 250, width: 80, height: 80 },
      { x: 500, y: 250, width: 80, height: 80 },
    ],
    // Layout 2: Horizontal bar
    [
      { x: 100, y: 300, width: 600, height: 40 },
    ],
    // Layout 3: Four corner blocks
    [
      { x: 50, y: 150, width: 60, height: 60 },
      { x: 700, y: 150, width: 60, height: 60 },
      { x: 50, y: 450, width: 60, height: 60 },
      { x: 700, y: 450, width: 60, height: 60 },
    ],
    // Layout 4: Scattered small blocks
    [
      { x: 150, y: 100, width: 40, height: 40 },
      { x: 350, y: 200, width: 40, height: 40 },
      { x: 550, y: 300, width: 40, height: 40 },
      { x: 250, y: 400, width: 40, height: 40 },
      { x: 450, y: 500, width: 40, height: 40 },
    ],
  ];

  const selectedLayout = layouts[Math.floor(Math.random() * layouts.length)];

  selectedLayout.forEach(obstacleData => {
    entities.obstacles.push(createObstacle(obstacleData.x, obstacleData.y, obstacleData.width, obstacleData.height));
  });
}

export { triggerZombieSprints };