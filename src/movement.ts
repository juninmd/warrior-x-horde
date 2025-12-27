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
  if (gameState.isGameOver || gameState.isPaused) return;

  // Não mover se está em vitória (transição de nível)
  if (gameState.isVictory) return;

  const baseSpeed = gameState.gameSpeed;
  const gateSpeed = baseSpeed * 3;      // Gates são 3x mais rápidos
  const enemySpeed = baseSpeed * 0.5;   // Inimigos são 2x mais lentos
  const canvasHeight = 800;
  const pursuitThreshold = canvasHeight * 0.6;

  // Mover gates para baixo (RÁPIDO)
  for (const gate of entities.gates) {
    gate.y += gateSpeed;
  }

  // Mover hordas inimigas para baixo (LENTO) e perseguir jogador
  for (const horde of entities.enemyHordes) {
    horde.y += enemySpeed;

    // Calcular limites da estrada nesta posição Y
    const roadTopWidth = 0.3; // 30% da largura no topo
    const normalizedY = Math.max(0, Math.min(1, horde.y / canvasHeight));
    const canvasWidth = 480; // Largura padrão do canvas
    const roadWidthAtY = canvasWidth * (roadTopWidth + (1 - roadTopWidth) * normalizedY);
    const roadMinX = (canvasWidth - roadWidthAtY) / 2 + 30; // Margem de 30px
    const roadMaxX = (canvasWidth + roadWidthAtY) / 2 - 30;

    // Se a horda passou do threshold, perseguir o jogador horizontalmente
    if (horde.y > pursuitThreshold && horde.isActive) {
      const targetX = entities.playerArmy.centerX;
      const dx = targetX - horde.x;
      horde.x += dx * 0.03;
      
      // Limitar dentro da estrada
      horde.x = Math.max(roadMinX, Math.min(roadMaxX, horde.x));
    }

    for (const soldier of horde.soldiers) {
      soldier.y += enemySpeed;
      soldier.targetY += enemySpeed;

      // Atualizar posição X dos soldados para acompanhar a horda
      if (horde.y > pursuitThreshold && horde.isActive) {
        soldier.targetX = horde.x + (soldier.x - horde.x) * 0.95;
        soldier.x += (soldier.targetX - soldier.x) * 0.1;
      }
      
      // Limitar soldados dentro da estrada
      soldier.x = Math.max(roadMinX - 20, Math.min(roadMaxX + 20, soldier.x));
    }
  }

  // Mover boss (velocidade média)
  if (entities.boss) {
    if (entities.boss.y < 100) {
      entities.boss.y += baseSpeed;
    }
  }

  // Mover bullets
  for (const bullet of entities.bullets) {
    bullet.y += bullet.speed;
  }

  // Atualizar distância percorrida (baseado na velocidade dos gates)
  gameState.distanceTraveled += gateSpeed;
}

export function updateMovement(entities: Entities, gameState: GameState, canvasWidth: number, targetX: number): void {
  updateArmyPosition(entities.playerArmy, targetX, canvasWidth);
  moveEntitiesDown(entities, gameState);
}
