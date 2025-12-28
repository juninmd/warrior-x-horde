// spawner.ts - Gerador de obstáculos e inimigos
import { Entities, GameState } from './types';
import { createGatePair, createEnemyHorde, createBoss } from './entities';

export function spawnGates(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar gates - espaçamento diminui com o level
  const spawnY = -100;
  // Gates mais espaçados no início, ficam mais frequentes com o level
  const baseSpacing = 3000;
  const levelReduction = Math.min(1500, (gameState.currentLevel - 1) * 150); // -150 por level, max -1500
  const gateSpacing = Math.max(1500, baseSpacing - levelReduction); // Mínimo 1500

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

export function spawnEnemies(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar hordas inimigas - muito frequentes e gigantes
  const spawnY = 0;
  const hordeSpacing = 200; // Bem mais frequente (era 200)

  // Remover hordas inativas ou que já passaram
  entities.enemyHordes = entities.enemyHordes.filter(horde => horde.isActive && horde.y < 1200);

  // Spawnar novas hordas
  const lowestHordeY = entities.enemyHordes.length > 0
    ? Math.min(...entities.enemyHordes.map(h => h.y))
    : spawnY + hordeSpacing;

  if (lowestHordeY > spawnY && Math.random() < 0.75) { // 75% chance (era 60%)
    // Balancear inimigos com base no tamanho do exército do jogador
    const playerCount = entities.playerArmy.soldiers.filter(s => s.isAlive).length;

    // Multiplicador base 3x maior (2.7x a 13.5x do jogador) - TRIPLO!
    const baseMultiplier = 2.7 + Math.random() * 10.8;

    // Bônus por level (+15% por level)
    const levelBonus = 1 + (gameState.currentLevel - 1) * 0.15;

    const multiplier = baseMultiplier * levelBonus;
    const baseEnemies = Math.floor(playerCount * multiplier);

    // Limites triplicados
    const minEnemies = 27; // 3x (era 9)
    const maxEnemies = Math.min(450, 135 + gameState.currentLevel * 27); // 3x (era 150, 45+level*9)

    const enemyCount = Math.min(maxEnemies, Math.max(minEnemies, baseEnemies));
    entities.enemyHordes.push(createEnemyHorde(canvasWidth, spawnY - hordeSpacing, enemyCount));
  }
}

export function checkBossSpawn(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar boss quando atingir distância do nível
  if (gameState.distanceTraveled >= gameState.levelDistance * 0.9 && !entities.boss) {
    entities.boss = createBoss(canvasWidth, gameState.currentLevel);
  }
}

export function updateSpawns(entities: Entities, canvasWidth: number, gameState: GameState): void {
  if (gameState.isGameOver || gameState.isVictory) return;

  spawnGates(entities, canvasWidth, gameState);
  spawnEnemies(entities, canvasWidth, gameState);
  checkBossSpawn(entities, canvasWidth, gameState);
}
