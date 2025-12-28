// spawner.ts - Gerador de obstáculos e inimigos
import { Entities, GameState } from './types';
import { createGatePair, createEnemyHorde, createBoss } from './entities';

export function spawnGates(entities: Entities, canvasWidth: number, _gameState: GameState): void {
  // Spawnar gates a cada 1200 pixels de distância (bem mais espaçado)
  const spawnY = -100;
  const gateSpacing = 1200;

  // Remover gates que já passaram
  entities.gates = entities.gates.filter(gate => gate.y < 1200);

  // Spawnar novos gates se necessário
  const lowestGateY = entities.gates.length > 0
    ? Math.min(...entities.gates.map(g => g.y))
    : spawnY + gateSpacing;

  if (lowestGateY > spawnY) {
    const newGates = createGatePair(canvasWidth, spawnY - gateSpacing);
    entities.gates.push(...newGates);
  }
}

export function spawnEnemies(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar hordas inimigas - FREQUENTES mas lentas
  const spawnY = 0; // Começa mais perto da tela
  const hordeSpacing = 150; // Muito frequente!

  // Remover hordas inativas ou que já passaram
  entities.enemyHordes = entities.enemyHordes.filter(horde => horde.isActive && horde.y < 1200);

  // Spawnar novas hordas
  const lowestHordeY = entities.enemyHordes.length > 0
    ? Math.min(...entities.enemyHordes.map(h => h.y))
    : spawnY + hordeSpacing;

  if (lowestHordeY > spawnY && Math.random() < 0.7) { // 70% chance - bem frequente
    // Balancear inimigos com base no tamanho do exército do jogador
    const playerCount = entities.playerArmy.soldiers.filter(s => s.isAlive).length;
''
    // Multiplicador base  (agora 1-4x)
    const baseMultiplier = 1 + Math.random() * 4;

    // Adicionar 20% por level (level 1 = +0%, level 5 = +80%, level 10 = +180%)
    const levelBonus = 1 + (gameState.currentLevel - 1) * 0.2;

    const multiplier = baseMultiplier * levelBonus;
    const baseEnemies = Math.floor(playerCount * multiplier);

    // Mínimo e máximo de inimigos por horda
    const minEnemies = 10;
    const maxEnemies = 30 + gameState.currentLevel * 6; // Máximo cresce com level

    const enemyCount = Math.max(maxEnemies, Math.max(minEnemies, baseEnemies));
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
