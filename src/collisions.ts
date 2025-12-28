// collisions.ts - Sistema de colisões
import { Entities, GameState, Army, EnemyHorde, Gate, MiniBoss } from './types';
import { addSoldiersToArmy, multiplySoldiersInArmy, removeSoldiersFromArmy, addSuperSoldiersToArmy } from './entities';
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

// Nova função: determinar qual gate é ativado baseado no CENTRO do exército
function getGateForArmyCenter(army: Army, gates: Gate[]): Gate | null {
  const bounds = getArmyBounds(army);

  // Encontrar gates na mesma linha (mesmo Y aproximado) que estão na posição do exército
  for (const gate of gates) {
    if (gate.passed) continue;

    // Verificar se o exército está na altura do gate
    if (bounds.bottom > gate.y && bounds.top < gate.y + gate.height) {
      // Usar o CENTRO do exército para determinar qual gate
      const gateCenter = gate.x + gate.width / 2;
      const armyCenterX = army.centerX;

      // Se o centro do exército está dentro do gate
      if (armyCenterX >= gate.x && armyCenterX <= gate.x + gate.width) {
        return gate;
      }
    }
  }
  return null;
}

function checkGateCollision(army: Army, gate: Gate): boolean {
  const bounds = getArmyBounds(army);

  // Usar o CENTRO do exército para determinar colisão
  const armyCenterX = army.centerX;

  return !gate.passed &&
    armyCenterX >= gate.x &&
    armyCenterX <= gate.x + gate.width &&
    bounds.bottom > gate.y &&
    bounds.top < gate.y + gate.height;
}

function applyGateEffect(army: Army, gate: Gate, gameState: GameState, entities: Entities): void {
  const beforeCount = army.soldiers.length;
  let afterCount = beforeCount;
  let isPositive = true;

  switch (gate.type) {
    case 'add': {
      addSoldiersToArmy(army, gate.value);
      afterCount = army.soldiers.length;
      addFloatingText(`+${gate.value}`, gate.x + gate.width / 2, gate.y, '#2ECC71');
      break;
    }
    case 'multiply': {
      multiplySoldiersInArmy(army, gate.value);
      afterCount = army.soldiers.length;
      addFloatingText(`×${gate.value}`, gate.x + gate.width / 2, gate.y, '#3498DB');
      break;
    }
    case 'subtract':
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
      // Multiplica o fireRate pelo valor (0.92 = ~8% mais rápido por gate)
      // Limite mínimo de 40ms para máxima cadência
      army.fireRate = Math.max(40, army.fireRate * gate.value);
      addFloatingText(`🔥 Fire Rate UP!`, gate.x + gate.width / 2, gate.y, '#F39C12');
      break;
    }
    case 'damage': {
      // Multiplica o dano pelo valor (2 = dobra o dano!)
      army.damage = (army.damage || 1) * gate.value;
      addFloatingText(`⚔️ DMG x${gate.value}!`, gate.x + gate.width / 2, gate.y, '#E91E63');
      break;
    }
    case 'superwarrior': {
      // Adiciona super guerreiros (mais fortes, mais vida, tiro mais rápido)
      addSuperSoldiersToArmy(army, Math.floor(gate.value));
      afterCount = army.soldiers.length;
      addFloatingText(`⭐ SUPER WARRIOR!`, gate.x + gate.width / 2, gate.y, '#FFD700');
      break;
    }
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

// Verificar colisão com mini-boss
function checkMiniBossCollision(army: Army, miniBoss: MiniBoss): boolean {
  if (!miniBoss.isActive) return false;

  const bounds = getArmyBounds(army);

  return bounds.bottom > miniBoss.y &&
    bounds.top < miniBoss.y + miniBoss.height &&
    bounds.right > miniBoss.x &&
    bounds.left < miniBoss.x + miniBoss.width;
}

// Processar batalha com mini-boss (igual hordas - troca de baixas)
function processMiniBossBattle(army: Army, miniBoss: MiniBoss, gameState: GameState): void {
  const playerCount = army.soldiers.filter(s => s.isAlive).length;

  if (playerCount <= 0 || miniBoss.hp <= 0) {
    if (miniBoss.hp <= 0) {
      miniBoss.isActive = false;
      gameState.score += 300;
      addExplosion(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, '#FF4500');
      addParticle(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, 'star', '#FF4500', 8);
      addFloatingText('MINI-BOSS DEFEATED!', miniBoss.x + miniBoss.width / 2, miniBoss.y, '#FF4500');
    }
    return;
  }

  // Mini-boss causa 1 baixa por frame no exército do jogador
  const casualties = 1;

  // Remove do jogador
  for (let i = 0; i < casualties && army.soldiers.length > 0; i++) {
    const idx = army.soldiers.findIndex(s => s.isAlive);
    if (idx >= 0) {
      const soldier = army.soldiers[idx];
      addExplosion(soldier.x, soldier.y, '#4A90D9');
      army.soldiers[idx].isAlive = false;
    }
  }

  // Mini-boss recebe dano baseado nos soldados em contato
  const damageToMiniBoss = Math.min(playerCount * 0.5, 5); // Máximo 5 de dano por frame
  miniBoss.hp -= damageToMiniBoss;

  // Limpar soldados mortos
  army.soldiers = army.soldiers.filter(s => s.isAlive);

  if (miniBoss.hp <= 0) {
    miniBoss.isActive = false;
    gameState.score += 300;
    addExplosion(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, '#FF4500');
    addParticle(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, 'star', '#FF4500', 10);
    addFloatingText('MINI-BOSS DEFEATED!', miniBoss.x + miniBoss.width / 2, miniBoss.y, '#FF4500');
  }

  // Screen shake menor para mini-boss
  gameState.screenShakeActive = true;
  gameState.screenShakeIntensity = 3;
  gameState.screenShakeDuration = 50;
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

  // Checar colisão com mini-bosses (batalha igual às hordas)
  for (const miniBoss of entities.miniBosses) {
    if (checkMiniBossCollision(army, miniBoss)) {
      gameState.isBattling = true;
      processMiniBossBattle(army, miniBoss, gameState);
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
