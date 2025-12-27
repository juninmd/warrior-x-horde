// movement.ts - Sistema de movimento
import { Entities, GameState, Army, Soldier } from './types';

export function updateArmyPosition(army: Army, targetX: number, canvasWidth: number): void {
  // Limitar movimento horizontal
  const minX = 50;
  const maxX = canvasWidth - 50;
  army.targetX = Math.max(minX, Math.min(maxX, targetX));
  
  // Mover centro do exército suavemente para o target
  const dx = army.targetX - army.centerX;
  army.centerX += dx * 0.1;
  
  // Atualizar posição de cada soldado
  updateSoldierFormation(army);
}

export function updateSoldierFormation(army: Army): void {
  const aliveSoldiers = army.soldiers.filter(s => s.isAlive);
  const count = aliveSoldiers.length;
  
  if (count === 0) return;
  
  // Formação em círculos concêntricos
  let soldierIndex = 0;
  let ring = 0;
  const baseRadius = 25;
  const ringSpacing = 20;
  
  while (soldierIndex < count) {
    const ringRadius = baseRadius + ring * ringSpacing;
    const soldiersInRing = ring === 0 ? 1 : Math.min(Math.floor(ring * 6), count - soldierIndex);
    
    for (let i = 0; i < soldiersInRing && soldierIndex < count; i++) {
      const soldier = aliveSoldiers[soldierIndex];
      const angle = ring === 0 ? 0 : (i / soldiersInRing) * Math.PI * 2;
      
      soldier.targetX = army.centerX + Math.cos(angle) * ringRadius;
      soldier.targetY = army.centerY + Math.sin(angle) * ringRadius * 0.5;
      
      // Movimento suave para a posição alvo
      soldier.x += (soldier.targetX - soldier.x) * 0.15;
      soldier.y += (soldier.targetY - soldier.y) * 0.15;
      
      soldierIndex++;
    }
    ring++;
  }
}

export function moveEntitiesDown(entities: Entities, gameState: GameState): void {
  if (gameState.isGameOver || gameState.isVictory || gameState.isPaused) return;
  
  const speed = gameState.gameSpeed;
  
  // Mover gates para baixo
  for (const gate of entities.gates) {
    gate.y += speed;
  }
  
  // Mover hordas inimigas para baixo
  for (const horde of entities.enemyHordes) {
    horde.y += speed;
    for (const soldier of horde.soldiers) {
      soldier.y += speed;
      soldier.targetY += speed;
    }
  }
  
  // Mover boss
  if (entities.boss) {
    if (entities.boss.y < 100) {
      entities.boss.y += speed * 0.5;
    }
  }
  
  // Mover bullets
  for (const bullet of entities.bullets) {
    bullet.y += bullet.speed;
  }
  
  // Atualizar distância percorrida
  gameState.distanceTraveled += speed;
  
  // Checar vitória de nível
  if (gameState.distanceTraveled >= gameState.levelDistance && gameState.isVictory) {
    // Próximo nível
    gameState.currentLevel++;
    gameState.distanceTraveled = 0;
    gameState.levelDistance += 1000;
    gameState.isVictory = false;
  }
}

export function updateMovement(entities: Entities, gameState: GameState, canvasWidth: number, targetX: number): void {
  updateArmyPosition(entities.playerArmy, targetX, canvasWidth);
  moveEntitiesDown(entities, gameState);
}
