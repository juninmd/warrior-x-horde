// spawner.ts - Gerador de obstáculos e inimigos
import { Entities, GameState, MAX_ENEMIES } from './types';
import { createGatePair, createEnemyHorde, createBoss, createMiniBoss, createMysteryBox, createCoin } from './entities';

export function spawnCoins(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Remover moedas que já passaram
  entities.coins = entities.coins.filter(coin => !coin.passed && coin.y < 1200);

  // Moedas não spawnam mais no chão, apenas dropam de bosses
}

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
  const baseSpacing = 700; // Mais frequentes (reduzido de 1200)
  const levelReduction = Math.min(200, (gameState.currentLevel - 1) * 20);
  const gateSpacing = Math.max(500, baseSpacing - levelReduction); // Mínimo 500

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

  // SISTEMA ANTI-ASTOLFO: Sem limite de inimigos
  // Apenas removemos hordas que saíram da tela
  entities.enemyHordes = entities.enemyHordes.filter(horde => horde.isActive && horde.y < 1200);

  // Espaçamento menor = hordas mais frequentes
  const baseSpacing = 80; // Reduzido de 180 para spawnar mais rápido
  // Redução de espaçamento sem limite (pode chegar a spawnar colado)
  const levelReduction = (gameState.currentLevel - 1) * 4;
  const hordeSpacing = Math.max(20, baseSpacing - levelReduction); // Mínimo 20 (era 40)

  // Spawnar novas hordas
  const lowestHordeY = entities.enemyHordes.length > 0
    ? Math.min(...entities.enemyHordes.map(h => h.y))
    : spawnY + hordeSpacing;

  // Chance de spawn (reduzida para performance)
  const spawnChance = Math.min(0.8, 0.7 + (gameState.currentLevel - 1) * 0.01);

  if (lowestHordeY > spawnY && Math.random() < spawnChance) {
    // Balancear inimigos baseado no tamanho do exército
    const playerCount = entities.playerArmy.soldiers.filter(s => s.isAlive).length;

    // Multiplicador REDUZIDO para performance
    const baseMultiplier = 0.2 + Math.random() * 0.3; // Reduzido de 0.3-0.8 para 0.2-0.5
    // Bônus exponencial suave para garantir dificuldade crescente
    const levelBonus = 1 + (gameState.currentLevel - 1) * 0.1; // +10% por level

    const multiplier = baseMultiplier * levelBonus;
    const baseEnemies = Math.floor(playerCount * multiplier);

    // Limites de inimigos - escala infinita mas menor quantidade
    const minEnemies = 5 + gameState.currentLevel * 1; // Reduzido

    // Máximo reduzido para performance
    const maxEnemies = 60 + gameState.currentLevel * 30; // Reduzido de 100+50*L para 60+30*L

    // Calcula quantidade final sem restrição global
    const enemyCount = Math.floor(Math.min(maxEnemies, Math.max(minEnemies, baseEnemies)));

    if (enemyCount > 0) {
      // Spawn acima da tela (vindo da nave alienígena)
      entities.enemyHordes.push(createEnemyHorde(canvasWidth, spawnY - hordeSpacing, enemyCount, gameState.currentLevel));
    }
  }
}

// Mini-boss spawn durante as hordas
let lastMiniBossSpawn = 0;

export function spawnMiniBoss(entities: Entities, canvasWidth: number, gameState: GameState, _canvasHeight: number = 800): void {
  // Spawnar mini-boss
  // Se for level > 11 (Sistema Anti-Astolfo), spawna muito mais frequente
  let intervalFactor = 0.25; // Padrão: a cada 25% do level
  let maxConcurrent = 5;

  if (gameState.currentLevel > 11) {
    // Escala agressiva pós-level 11
    const levelsPast11 = gameState.currentLevel - 11;
    intervalFactor = Math.max(0.05, 0.20 - levelsPast11 * 0.02); // Diminui até 5% (spawn frenético)
    maxConcurrent = 5 + levelsPast11 * 2; // Aumenta limite de simultâneos
  }

  const miniBossInterval = gameState.levelDistance * intervalFactor;
  const miniBossThreshold = Math.floor(gameState.distanceTraveled / miniBossInterval);

  if (miniBossThreshold > lastMiniBossSpawn && !entities.boss) {
    // Permitir até maxConcurrent mini-bosses ativos ao mesmo tempo
    const activeMiniBosses = entities.miniBosses.filter(mb => mb.isActive).length;
    if (activeMiniBosses < maxConcurrent) {
      // No modo infinito (>11), pode spawnar múltiplos de uma vez
      const spawnCount = gameState.currentLevel > 11 ? Math.min(3, 1 + Math.floor((gameState.currentLevel - 11) / 5)) : 1;

      for(let i=0; i<spawnCount; i++) {
         // Spawn do céu (da nave alienígena) com leve variação Y
         entities.miniBosses.push(createMiniBoss(canvasWidth, -100 - (i * 150), gameState.currentLevel));
      }

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
  spawnCoins(entities, canvasWidth, gameState);
  checkBossSpawn(entities, canvasWidth, gameState, canvasHeight);
}
