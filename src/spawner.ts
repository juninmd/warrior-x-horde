// spawner.ts - Gerador de obstáculos e inimigos
import { Entities, GameState } from './types';
import { createGatePair, createEnemyHorde, createBoss } from './entities';

let lastGateY = -300;
let lastHordeY = -500;

export function spawnGates(entities: Entities, canvasWidth: number, gameState: GameState): void {
  // Spawnar gates a cada 400 pixels de distância
  const spawnY = -100;
  const gateSpacing = 400;
  
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
  // Spawnar hordas inimigas
  const spawnY = -200;
  const hordeSpacing = 600;
  
  // Remover hordas inativas ou que já passaram
  entities.enemyHordes = entities.enemyHordes.filter(horde => horde.isActive && horde.y < 1200);
  
  // Spawnar novas hordas
  const lowestHordeY = entities.enemyHordes.length > 0
    ? Math.min(...entities.enemyHordes.map(h => h.y))
    : spawnY + hordeSpacing;
  
  if (lowestHordeY > spawnY && Math.random() < 0.3) {
    const enemyCount = 10 + Math.floor(gameState.currentLevel * 5) + Math.floor(Math.random() * 20);
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
