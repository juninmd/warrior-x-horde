// spawner.ts - Gerador de obstáculos e inimigos
import { Entities, GameState } from './types';
import { createGatePair, createEnemyHorde, createBoss } from './entities';

export function spawnGates(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar gates - espaçamento diminui com o level (3x mais frequentes)
  const spawnY = -100;
  // Gates mais espaçados no início, ficam mais frequentes com o level
  const baseSpacing = 1000; // 3x mais frequente (era 3000)
  const levelReduction = Math.min(500, (gameState.currentLevel - 1) * 50); // -50 por level, max -500
  const gateSpacing = Math.max(500, baseSpacing - levelReduction); // Mínimo 500 (era 1500)

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
  // Spawnar hordas inimigas - mais fácil no começo, dificuldade crescente
  const spawnY = 0;

  // Espaçamento maior no início, diminui com o level
  const baseSpacing = 180; // Começa mais espaçado
  const levelReduction = Math.min(100, (gameState.currentLevel - 1) * 15);
  const hordeSpacing = Math.max(80, baseSpacing - levelReduction);

  // Remover hordas inativas ou que já passaram
  entities.enemyHordes = entities.enemyHordes.filter(horde => horde.isActive && horde.y < 1200);

  // Spawnar novas hordas
  const lowestHordeY = entities.enemyHordes.length > 0
    ? Math.min(...entities.enemyHordes.map(h => h.y))
    : spawnY + hordeSpacing;

  // Chance de spawn aumenta com o level (50% no level 1, até 85% no level 5+)
  const spawnChance = Math.min(0.85, 0.5 + (gameState.currentLevel - 1) * 0.09);

  if (lowestHordeY > spawnY && Math.random() < spawnChance) {
    // Balancear inimigos com base no tamanho do exército do jogador
    const playerCount = entities.playerArmy.soldiers.filter(s => s.isAlive).length / 3;

    // Multiplicador menor no início, cresce com o level (1.5x a 3x no level 1)
    const baseMultiplier = 1.5 + Math.random() * 4;

    // Bônus por level (+40% por level, mais agressivo depois)
    const levelBonus = 1 + (gameState.currentLevel - 1) * 0.4;

    const multiplier = baseMultiplier * levelBonus;
    const baseEnemies = Math.floor(playerCount * multiplier);

    // Limites menores no início, crescem com o level
    const minEnemies = Math.min(50, 8 + gameState.currentLevel * 7); // 15 no level 1, até 50
    const maxEnemies = Math.min(875, 80 + gameState.currentLevel * 70); // 150 no level 1, cresce rápido

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
