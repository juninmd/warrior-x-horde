// collisions.ts - Sistema de colisões
import { Entities, GameState, Army, EnemyHorde, Gate } from './types';
import { addSoldiersToArmy, multiplySoldiersInArmy, removeSoldiersFromArmy } from './entities';
import { addFloatingText, addExplosion, addParticle } from './renderer';
import { playSound, audioManager } from './audio';

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

function applyGateEffect(army: Army, gate: Gate, gameState: GameState, entities: Entities): void {
  const beforeCount = army.soldiers.length;
  let afterCount = beforeCount;
  let isPositive = true;

  // Calcular multiplicador baseado na quantidade de inimigos na tela
  // Quanto mais inimigos, melhores os bônus positivos
  const totalEnemies = entities.enemyHordes.reduce((sum, horde) => {
    return sum + horde.soldiers.filter(s => s.isAlive).length;
  }, 0);

  // Multiplicador de 1x a 3x baseado na quantidade de inimigos (100 inimigos = 2x, 200+ = 3x)
  const enemyBonus = Math.min(3, 1 + totalEnemies / 100);

  switch (gate.type) {
    case 'add': {
      // Bônus de adição escalado pelos inimigos
      const scaledAdd = Math.floor(gate.value * enemyBonus);
      addSoldiersToArmy(army, scaledAdd);
      afterCount = army.soldiers.length;
      const bonusText = enemyBonus > 1.2 ? ` (${enemyBonus.toFixed(1)}x!)` : '';
      addFloatingText(`+${scaledAdd}${bonusText}`, gate.x + gate.width / 2, gate.y, '#2ECC71');
      break;
    }
    case 'multiply': {
      // Multiplicador extra baseado nos inimigos (x2 pode virar x2.5 ou x3)
      const scaledMultiplier = gate.value + (enemyBonus - 1) * 0.5; // +0.5 a cada 100 inimigos
      multiplySoldiersInArmy(army, scaledMultiplier);
      afterCount = army.soldiers.length;
      const bonusText = scaledMultiplier > gate.value ? ` (${scaledMultiplier.toFixed(1)}x!)` : '';
      addFloatingText(`×${scaledMultiplier.toFixed(1)}${bonusText}`, gate.x + gate.width / 2, gate.y, '#3498DB');
      break;
    }
    case 'subtract':
      // Subtração não é afetada (mantém o nerf)
      removeSoldiersFromArmy(army, Math.min(gate.value, army.soldiers.length - 1));
      afterCount = army.soldiers.length;
      addFloatingText(`-${gate.value}`, gate.x + gate.width / 2, gate.y, '#E74C3C');
      isPositive = false;
      break;
    case 'divide': {
      const toRemove = Math.floor(army.soldiers.length * (1 - 1 / gate.value));
      removeSoldiersFromArmy(army, Math.min(toRemove, army.soldiers.length - 1));
      afterCount = army.soldiers.length;
      addFloatingText(`÷${gate.value}`, gate.x + gate.width / 2, gate.y, '#9B59B6');
      isPositive = false;
      break;
    }
    case 'firerate': {
      // Fire rate buff escalado pelos inimigos
      const scaledFireRate = gate.value + (enemyBonus - 1) * 0.25;
      army.fireRate = Math.max(50, army.fireRate / scaledFireRate);
      const bonusText = scaledFireRate > gate.value ? ` ${scaledFireRate.toFixed(1)}x!` : '';
      addFloatingText(`🔥 Fire Rate!${bonusText}`, gate.x + gate.width / 2, gate.y, '#F39C12');
      break;
    }
    case 'damage': {
      // Damage buff escalado pelos inimigos
      const scaledDamage = gate.value + (enemyBonus - 1) * 0.25;
      army.damage = (army.damage || 1) * scaledDamage;
      const bonusText = scaledDamage > gate.value ? ` ${scaledDamage.toFixed(1)}x!` : '';
      addFloatingText(`⚔️ Damage!${bonusText}`, gate.x + gate.width / 2, gate.y, '#E91E63');
      break;
    }
    case 'speed':
      gameState.gameSpeed = Math.min(3, gameState.gameSpeed * gate.value); // Máximo 3x velocidade
      addFloatingText(`💨 Speed!`, gate.x + gate.width / 2, gate.y, '#00BCD4');
      break;
  }

  // Tocar som apropriado
  if (isPositive) {
    playSound(audioManager.powerUp);
  } else {
    playSound(audioManager.nerf);
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

      // Aumentar combo quando derrotar uma horda
      gameState.combo++;
      gameState.comboTimer = 2000; // 2 segundos para manter o combo
      if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
      }

      // Score com multiplicador de combo
      const comboMultiplier = Math.min(gameState.combo, 10);
      const scoreGain = 100 * comboMultiplier;
      gameState.score += scoreGain;

      // Efeito visual épico de vitória
      addExplosion(horde.x, horde.y, '#FFD700');
      addParticle(horde.x, horde.y, 'star', '#FFD700', 5);

      if (gameState.combo >= 3) {
        addFloatingText(`${gameState.combo}x COMBO! +${scoreGain}`, horde.x, horde.y - 30, getComboColor(gameState.combo));
      } else {
        addFloatingText(`+${scoreGain}`, horde.x, horde.y, '#FFD700');
      }
    }
    return;
  }

  // Batalha automática - remove soldados de ambos os lados
  const casualties = Math.min(1, playerCount, enemyCount);

  // Remove do jogador
  for (let i = 0; i < casualties && army.soldiers.length > 0; i++) {
    const idx = army.soldiers.findIndex(s => s.isAlive);
    if (idx >= 0) {
      const soldier = army.soldiers[idx];
      addExplosion(soldier.x, soldier.y, '#4A90D9');
      army.soldiers[idx].isAlive = false;
    }
  }

  // Remove do inimigo
  for (let i = 0; i < casualties && horde.soldiers.length > 0; i++) {
    const idx = horde.soldiers.findIndex(s => s.isAlive);
    if (idx >= 0) {
      const soldier = horde.soldiers[idx];
      addExplosion(soldier.x, soldier.y, '#E74C3C');
      horde.soldiers[idx].isAlive = false;
    }
  }

  // Limpar soldados mortos
  army.soldiers = army.soldiers.filter(s => s.isAlive);
  horde.soldiers = horde.soldiers.filter(s => s.isAlive);
  horde.count = horde.soldiers.length;

  if (horde.soldiers.length <= 0) {
    horde.isActive = false;

    // Combo e score
    gameState.combo++;
    gameState.comboTimer = 2000;
    if (gameState.combo > gameState.maxCombo) {
      gameState.maxCombo = gameState.combo;
    }

    const comboMultiplier = Math.min(gameState.combo, 10);
    const scoreGain = 100 * comboMultiplier;
    gameState.score += scoreGain;

    addExplosion(horde.x, horde.y, '#FFD700');
    addParticle(horde.x, horde.y, 'star', '#FFD700', 8);
    addFloatingText('VICTORY!', horde.x, horde.y, '#FFD700');
  }

  // Screen shake
  gameState.screenShakeActive = true;
  gameState.screenShakeIntensity = 5;
  gameState.screenShakeDuration = 100;
}

function getComboColor(combo: number): string {
  if (combo >= 10) return '#FF00FF';
  if (combo >= 7) return '#FFD700';
  if (combo >= 5) return '#FF6B6B';
  if (combo >= 3) return '#F39C12';
  return '#2ECC71';
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
      applyGateEffect(army, gate, gameState, entities);

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
