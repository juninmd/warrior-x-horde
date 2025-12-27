// collisions.ts - Sistema de colisões
import { Entities, GameState, Army, EnemyHorde, Gate } from './types';
import { addSoldiersToArmy, multiplySoldiersInArmy, removeSoldiersFromArmy, createSoldier } from './entities';
import { addFloatingText } from './renderer';

function getArmyBounds(army: Army): { left: number; right: number; top: number; bottom: number } {
  if (army.soldiers.length === 0) {
    return { left: army.centerX, right: army.centerX, top: army.centerY, bottom: army.centerY };
  }

  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const soldier of army.soldiers) {
    if (soldier.isAlive) {
      left = Math.min(left, soldier.x - soldier.size);
      right = Math.max(right, soldier.x + soldier.size);
      top = Math.min(top, soldier.y - soldier.size);
      bottom = Math.max(bottom, soldier.y + soldier.size);
    }
  }
  return { left, right, top, bottom };
}

function checkGateCollision(army: Army, gate: Gate): boolean {
  const bounds = getArmyBounds(army);
  return !gate.passed &&
    bounds.right > gate.x &&
    bounds.left < gate.x + gate.width &&
    bounds.bottom > gate.y &&
    bounds.top < gate.y + gate.height;
}

function applyGateEffect(army: Army, gate: Gate, gameState: GameState): void {
  const beforeCount = army.soldiers.length;
  let afterCount = beforeCount;

  switch (gate.type) {
    case 'add':
      addSoldiersToArmy(army, gate.value);
      afterCount = army.soldiers.length;
      addFloatingText(`+${gate.value}`, gate.x + gate.width / 2, gate.y, '#2ECC71');
      break;
    case 'multiply':
      multiplySoldiersInArmy(army, gate.value);
      afterCount = army.soldiers.length;
      addFloatingText(`×${gate.value}`, gate.x + gate.width / 2, gate.y, '#3498DB');
      break;
    case 'subtract':
      removeSoldiersFromArmy(army, Math.min(gate.value, army.soldiers.length - 1));
      afterCount = army.soldiers.length;
      addFloatingText(`-${gate.value}`, gate.x + gate.width / 2, gate.y, '#E74C3C');
      break;
    case 'divide':
      const toRemove = Math.floor(army.soldiers.length * (1 - 1 / gate.value));
      removeSoldiersFromArmy(army, Math.min(toRemove, army.soldiers.length - 1));
      afterCount = army.soldiers.length;
      addFloatingText(`÷${gate.value}`, gate.x + gate.width / 2, gate.y, '#9B59B6');
      break;
    case 'firerate':
      army.fireRate = Math.max(50, army.fireRate / gate.value);
      addFloatingText(`🔥 Fire Rate!`, gate.x + gate.width / 2, gate.y, '#F39C12');
      break;
    case 'damage':
      army.damage = (army.damage || 1) * gate.value;
      addFloatingText(`⚔️ Damage!`, gate.x + gate.width / 2, gate.y, '#E91E63');
      break;
    case 'speed':
      gameState.gameSpeed = Math.min(8, gameState.gameSpeed * gate.value);
      addFloatingText(`💨 Speed!`, gate.x + gate.width / 2, gate.y, '#00BCD4');
      break;
  }

  gameState.score += Math.max(0, afterCount - beforeCount) * 10;
  gate.passed = true;
}

function checkHordeCollision(army: Army, horde: EnemyHorde): boolean {
  const bounds = getArmyBounds(army);
  const hordeTop = horde.y - horde.height / 2;
  const hordeBottom = horde.y + horde.height / 2;

  return horde.isActive &&
    bounds.bottom > hordeTop &&
    bounds.top < hordeBottom &&
    bounds.right > horde.x - horde.width / 2 &&
    bounds.left < horde.x + horde.width / 2;
}

function processBattle(army: Army, horde: EnemyHorde, gameState: GameState): void {
  const playerCount = army.soldiers.filter(s => s.isAlive).length;
  const enemyCount = horde.soldiers.filter(s => s.isAlive).length;

  if (playerCount <= 0 || enemyCount <= 0) {
    if (enemyCount <= 0) {
      horde.isActive = false;
      gameState.score += 100;
    }
    return;
  }

  // Batalha automática - remove soldados de ambos os lados
  const casualties = Math.min(1, playerCount, enemyCount);

  // Remove do jogador
  for (let i = 0; i < casualties && army.soldiers.length > 0; i++) {
    const idx = army.soldiers.findIndex(s => s.isAlive);
    if (idx >= 0) army.soldiers[idx].isAlive = false;
  }

  // Remove do inimigo
  for (let i = 0; i < casualties && horde.soldiers.length > 0; i++) {
    const idx = horde.soldiers.findIndex(s => s.isAlive);
    if (idx >= 0) horde.soldiers[idx].isAlive = false;
  }

  // Limpar soldados mortos
  army.soldiers = army.soldiers.filter(s => s.isAlive);
  horde.soldiers = horde.soldiers.filter(s => s.isAlive);
  horde.count = horde.soldiers.length;

  if (horde.soldiers.length <= 0) {
    horde.isActive = false;
    gameState.score += 100;
    addFloatingText('VICTORY!', horde.x, horde.y, '#FFD700');
  }

  // Screen shake
  gameState.screenShakeActive = true;
  gameState.screenShakeIntensity = 5;
  gameState.screenShakeDuration = 100;
}

function checkBossCollision(army: Army, entities: Entities): boolean {
  if (!entities.boss || !entities.boss.isActive) return false;

  const bounds = getArmyBounds(army);
  const boss = entities.boss;

  return bounds.bottom > boss.y &&
    bounds.top < boss.y + boss.height &&
    bounds.right > boss.x &&
    bounds.left < boss.x + boss.width;
}

export function checkCollisions(entities: Entities, gameState: GameState): void {
  const army = entities.playerArmy;

  // Checar colisão com gates
  for (const gate of entities.gates) {
    if (checkGateCollision(army, gate)) {
      applyGateEffect(army, gate, gameState);

      // Marcar o gate do outro lado como "passed" também (mesmo Y = mesmo par)
      for (const otherGate of entities.gates) {
        if (otherGate.id !== gate.id && Math.abs(otherGate.y - gate.y) < 10) {
          otherGate.passed = true;
        }
      }
    }
  }

  // Checar colisão com hordas
  for (const horde of entities.enemyHordes) {
    if (checkHordeCollision(army, horde)) {
      gameState.isBattling = true;
      processBattle(army, horde, gameState);
    }
  }

  // Checar colisão com boss
  if (checkBossCollision(army, entities) && entities.boss) {
    // Dano ao boss baseado no número de soldados atirando
    const damage = army.soldiers.filter(s => s.isAlive).length * army.damage * 0.1;
    entities.boss.hp -= damage;

    if (entities.boss.hp <= 0) {
      entities.boss.isActive = false;
      gameState.isVictory = true;
      gameState.score += 1000;
      addFloatingText('BOSS DEFEATED!', entities.boss.x + 50, entities.boss.y, '#FFD700');
    }
  }

  // Checar game over
  if (army.soldiers.filter(s => s.isAlive).length <= 0) {
    gameState.isGameOver = true;
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
      localStorage.setItem('crowdHighScore', gameState.highScore.toString());
    }
  }

  // Atualizar screen shake
  if (gameState.screenShakeActive) {
    gameState.screenShakeTimer += 16;
    if (gameState.screenShakeTimer >= gameState.screenShakeDuration) {
      gameState.screenShakeActive = false;
      gameState.screenShakeTimer = 0;
    }
  }
}
