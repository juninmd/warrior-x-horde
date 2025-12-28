// spawner.ts - Gerador de obstáculos e inimigos
import { Entities, GameState, MAX_ENEMIES } from './types';
import { createGatePair, createEnemyHorde, createBoss, createMiniBoss } from './entities';

export function spawnGates(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar gates - espaçamento maior para dar tempo de decisão
  const spawnY = -100;
  const baseSpacing = 1200; // Mais espaçados
  const levelReduction = Math.min(400, (gameState.currentLevel - 1) * 40);
  const gateSpacing = Math.max(700, baseSpacing - levelReduction); // Mínimo 700

  // Remover gates que já passaram
  entities.gates = entities.gates.filter(gate => gate.y < 1200);

  // Spawnar novos gates se necessário
  const lowestGateY = entities.gates.length > 0
    ? Math.min(...entities.gates.map(g => g.y))
    : spawnY + gateSpacing;

  if (lowestGateY > spawnY) {
    const newGates = createGatePair(canvasWidth, spawnY - gateSpacing, gameState.currentLevel);
    entities.gates.push(...newGates);
  }
}

// Contar total de inimigos ativos
function getTotalEnemyCount(entities: Entities): number {
  let total = 0;
  for (const horde of entities.enemyHordes) {
    if (horde.isActive) {
      total += horde.soldiers.filter(s => s.isAlive).length;
    }
  }
  return total;
}

export function spawnEnemies(entities: Entities, canvasWidth: number, gameState: GameState): void {
  const spawnY = 0;

  // Verificar limite de inimigos
  const currentEnemyCount = getTotalEnemyCount(entities);
  if (currentEnemyCount >= MAX_ENEMIES) return;

  // Espaçamento menor para hordas mais frequentes
  const baseSpacing = 150;
  const levelReduction = Math.min(80, (gameState.currentLevel - 1) * 8);
  const hordeSpacing = Math.max(70, baseSpacing - levelReduction);

  // Remover hordas inativas ou que já passaram
  entities.enemyHordes = entities.enemyHordes.filter(horde => horde.isActive && horde.y < 1200);

  // Spawnar novas hordas
  const lowestHordeY = entities.enemyHordes.length > 0
    ? Math.min(...entities.enemyHordes.map(h => h.y))
    : spawnY + hordeSpacing;

  // Chance de spawn mais alta para hordas mais frequentes
  const spawnChance = Math.min(0.85, 0.5 + (gameState.currentLevel - 1) * 0.07);

  if (lowestHordeY > spawnY && Math.random() < spawnChance) {
    // Balancear inimigos baseado no tamanho do exército, mas com limites baixos
    const playerCount = entities.playerArmy.soldiers.filter(s => s.isAlive).length;

    // Multiplicador muito mais conservador
    const baseMultiplier = 0.5 + Math.random() * 1.5; // 0.5x a 2x
    const levelBonus = 1 + (gameState.currentLevel - 1) * 0.1; // +10% por level

    const multiplier = baseMultiplier * levelBonus;
    const baseEnemies = Math.floor(playerCount * multiplier);

    // Limites ajustados - mínimo 15
    const minEnemies = Math.min(30, 15 + gameState.currentLevel * 2); // 15 no level 1, até 30
    const maxEnemies = Math.min(200, 40 + gameState.currentLevel * 20); // 60 no level 1, até 200

    // Garantir que não excedemos o limite global
    const availableSpace = MAX_ENEMIES - currentEnemyCount;
    const enemyCount = Math.min(availableSpace, maxEnemies, Math.max(minEnemies, baseEnemies));

    if (enemyCount > 0) {
      entities.enemyHordes.push(createEnemyHorde(canvasWidth, spawnY - hordeSpacing, enemyCount, gameState.currentLevel));
    }
  }
}

// Mini-boss spawn durante as hordas
let lastMiniBossSpawn = 0;

export function spawnMiniBoss(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar mini-boss a cada 20% da distância do level
  const miniBossInterval = gameState.levelDistance * 0.2;
  const miniBossThreshold = Math.floor(gameState.distanceTraveled / miniBossInterval);

  if (miniBossThreshold > lastMiniBossSpawn && !entities.boss) {
    // Não spawnar se já tem muitos mini-bosses ativos
    const activeMiniBosses = entities.miniBosses.filter(mb => mb.isActive).length;
    if (activeMiniBosses < 2) {
      entities.miniBosses.push(createMiniBoss(canvasWidth, -150, gameState.currentLevel));
      lastMiniBossSpawn = miniBossThreshold;
    }
  }
}

export function checkBossSpawn(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar boss quando atingir distância do nível
  if (gameState.distanceTraveled >= gameState.levelDistance * 0.9 && !entities.boss) {
    entities.boss = createBoss(canvasWidth, gameState.currentLevel);
    // Resetar contador de mini-boss para próximo level
    lastMiniBossSpawn = 0;
  }
}

export function updateSpawns(entities: Entities, canvasWidth: number, gameState: GameState): void {
  if (gameState.isGameOver || gameState.isVictory) return;

  spawnGates(entities, canvasWidth, gameState);
  spawnEnemies(entities, canvasWidth, gameState);
  spawnMiniBoss(entities, canvasWidth, gameState);
  checkBossSpawn(entities, canvasWidth, gameState);
}
