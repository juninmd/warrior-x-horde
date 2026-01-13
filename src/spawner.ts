// spawner.ts - Gerador de obstáculos e inimigos
import { Entities, GameState, MAX_ENEMIES } from './types';
import { createGatePair, createEnemyHorde, createBoss, createMiniBoss, createMysteryBox } from './entities';

export function spawnMysteryBoxes(entities: Entities, canvasWidth: number, _gameState: GameState): void {
  // Remover caixas que já passaram
  entities.mysteryBoxes = entities.mysteryBoxes.filter(box => !box.passed && box.y < 1200);

  // Chance de spawn (raro)
  if (Math.random() < 0.002 && entities.mysteryBoxes.length < 1) { // 0.2% chance por frame
    entities.mysteryBoxes.push(createMysteryBox(canvasWidth, -100));
  }
}

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
    // Passar contagem atual de heróis e inimigos para balancear gates
    const currentHeroCount = entities.playerArmy.soldiers.filter(s => s.isAlive).length;
    const currentEnemyCount = getTotalEnemyCount(entities);
    const newGates = createGatePair(canvasWidth, spawnY - gateSpacing, gameState.currentLevel, currentHeroCount, currentEnemyCount);
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

export function spawnEnemies(entities: Entities, canvasWidth: number, gameState: GameState, _canvasHeight: number = 800): void {
  // Inimigos nascem do céu (da nave alienígena)
  const spawnY = -50; // Acima da tela, vindo da nave

  // Verificar limite de inimigos
  const currentEnemyCount = getTotalEnemyCount(entities);
  if (currentEnemyCount >= MAX_ENEMIES) return;

  // Espaçamento menor = hordas mais frequentes
  const baseSpacing = 80; // Reduzido de 180 para spawnar mais rápido
  const levelReduction = Math.min(40, (gameState.currentLevel - 1) * 4);
  const hordeSpacing = Math.max(40, baseSpacing - levelReduction); // Mínimo 40 (era 100)

  // Remover hordas inativas ou que já passaram
  entities.enemyHordes = entities.enemyHordes.filter(horde => horde.isActive && horde.y < 1200);

  // Spawnar novas hordas
  const lowestHordeY = entities.enemyHordes.length > 0
    ? Math.min(...entities.enemyHordes.map(h => h.y))
    : spawnY + hordeSpacing;

  // Chance de spawn MUITO alta - sempre ter inimigos na tela
  const spawnChance = Math.min(1.0, 0.95 + (gameState.currentLevel - 1) * 0.01);

  if (lowestHordeY > spawnY && Math.random() < spawnChance) {
    // Balancear inimigos baseado no tamanho do exército
    const playerCount = entities.playerArmy.soldiers.filter(s => s.isAlive).length;

    // Multiplicador menor = grupos menores mas mais frequentes
    const baseMultiplier = 0.3 + Math.random() * 0.5; // 0.3x a 0.8x (era 0.5x a 1.5x)
    const levelBonus = 1 + (gameState.currentLevel - 1) * 0.05; // +5% por level (era 8%)

    const multiplier = baseMultiplier * levelBonus;
    const baseEnemies = Math.floor(playerCount * multiplier);

    // Limites de inimigos - grupos menores
    const minEnemies = Math.min(15, 8 + gameState.currentLevel); // 9 no level 1, até 15
    const maxEnemies = Math.min(300, 50 + gameState.currentLevel * 25); // 75 no level 1, até 300

    // Garantir que não excedemos o limite global
    const availableSpace = MAX_ENEMIES - currentEnemyCount;
    const enemyCount = Math.min(availableSpace, maxEnemies, Math.max(minEnemies, baseEnemies));

    if (enemyCount > 0) {
      // Spawn acima da tela (vindo da nave alienígena)
      entities.enemyHordes.push(createEnemyHorde(canvasWidth, spawnY - hordeSpacing, enemyCount, gameState.currentLevel));
    }
  }
}

// Mini-boss spawn durante as hordas
let lastMiniBossSpawn = 0;

export function spawnMiniBoss(entities: Entities, canvasWidth: number, gameState: GameState, _canvasHeight: number = 800): void {
  // Spawnar mini-boss a cada 25% da distância do level
  const miniBossInterval = gameState.levelDistance * 0.25;
  const miniBossThreshold = Math.floor(gameState.distanceTraveled / miniBossInterval);

  if (miniBossThreshold > lastMiniBossSpawn && !entities.boss) {
    // Permitir até 5 mini-bosses ativos ao mesmo tempo
    const activeMiniBosses = entities.miniBosses.filter(mb => mb.isActive).length;
    if (activeMiniBosses < 5) {
      // Spawn do céu (da nave alienígena)
      entities.miniBosses.push(createMiniBoss(canvasWidth, -100, gameState.currentLevel));
      lastMiniBossSpawn = miniBossThreshold;
    }
  }
}

export function checkBossSpawn(entities: Entities, canvasWidth: number, gameState: GameState, _canvasHeight: number = 800): void {
  // Spawnar boss quando atingir distância do nível
  if (gameState.distanceTraveled >= gameState.levelDistance * 0.9 && !entities.boss) {
    const boss = createBoss(canvasWidth, gameState.currentLevel);

    // Nave mãe fica na posição definida (topo), bosses normais vêm do céu
    if (boss.type !== 'mothership') {
      boss.y = -150; // Spawn do céu (da nave alienígena)
    }
    // Para mothership, mantém y = 25 definido no createBoss

    entities.boss = boss;
    // Resetar contador de mini-boss para próximo level
    lastMiniBossSpawn = 0;
  }
}

export function updateSpawns(entities: Entities, canvasWidth: number, gameState: GameState, canvasHeight: number = 800): void {
  if (gameState.isGameOver || gameState.isVictory) return;

  spawnGates(entities, canvasWidth, gameState);
  spawnEnemies(entities, canvasWidth, gameState, canvasHeight);
  spawnMiniBoss(entities, canvasWidth, gameState, canvasHeight);
  spawnMysteryBoxes(entities, canvasWidth, gameState);
  checkBossSpawn(entities, canvasWidth, gameState, canvasHeight);
}
