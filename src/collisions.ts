// collisions.ts - Sistema de colisões
import { Entities, GameState, Army, EnemyHorde, Gate, MiniBoss, MysteryBox, Coin } from './types';
import { addSoldiersToArmy, multiplySoldiersInArmy, removeSoldiersFromArmy, addSuperSoldiersToArmy, addSpecialSoldiersToArmy } from './entities';
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

function checkGateCollision(army: Army, gate: Gate, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
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

function checkHordeCollision(army: Army, horde: EnemyHorde, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
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
      gameState.comboTimer = 4000; // 4 segundos para manter o combo (era 2s)
      if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
      }

      // Score com multiplicador de combo MELHORADO
      // Combo agora vai até 20x e dá mais pontos
      const comboMultiplier = Math.min(gameState.combo, 20);
      const baseScore = 100 + gameState.currentLevel * 20; // Score base aumenta com level
      const scoreGain = baseScore * comboMultiplier;
      gameState.score += scoreGain;

      // Efeito visual épico de vitória
      addExplosion(horde.x, horde.y, '#FFD700');
      addParticle(horde.x, horde.y, 'star', '#FFD700', 3);

      // Mostrar combo a partir de 2x
      if (gameState.combo >= 2) {
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
function checkMiniBossCollision(army: Army, miniBoss: MiniBoss, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
  if (!miniBoss.isActive) return false;

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

function checkBossCollision(army: Army, entities: Entities, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
  if (!entities.boss || !entities.boss.isActive) return false;

  const boss = entities.boss;

  return bounds.bottom > boss.y &&
    bounds.top < boss.y + boss.height &&
    bounds.right > boss.x &&
    bounds.left < boss.x + boss.width;
}

function checkCoinCollision(army: Army, coin: Coin, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
  if (coin.passed) return false;

  // Simple bounding box check
  return bounds.bottom > coin.y - coin.height/2 &&
         bounds.top < coin.y + coin.height/2 &&
         bounds.right > coin.x - coin.width/2 &&
         bounds.left < coin.x + coin.width/2;
}

function checkMysteryBoxCollision(army: Army, box: MysteryBox, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
  if (box.passed) return false;

  return bounds.bottom > box.y &&
    bounds.top < box.y + box.height &&
    bounds.right > box.x &&
    bounds.left < box.x + box.width;
}

function applyMysteryBoxEffect(army: Army, box: MysteryBox, gameState: GameState, entities: Entities): void {
  const effects = [
    'reinforcements',
    'nuke',
    'double',
    'invincible',
    'bazooka',
    'rambo',
    'laser',
    'divide',
    'subtract',
    'slow'
  ];

  const effect = effects[Math.floor(Math.random() * effects.length)];
  let isGood = true;

  switch (effect) {
    // Efeitos Bons
    case 'reinforcements':
      addSoldiersToArmy(army, 30);
      addFloatingText('REINFORCEMENTS!', box.x, box.y, '#2ECC71');
      break;
    case 'nuke':
      // Matar todos os inimigos na tela
      entities.enemyHordes.forEach(h => {
        if (h.isActive && h.y > 0 && h.y < 800) {
          h.isActive = false;
          addExplosion(h.x, h.y, '#FFD700');
        }
      });
      addFloatingText('NUKE!', box.x, box.y, '#F1C40F');
      break;
    case 'double':
      multiplySoldiersInArmy(army, 2);
      addFloatingText('DOUBLE TROUBLE!', box.x, box.y, '#9B59B6');
      break;
    case 'invincible':
      addSuperSoldiersToArmy(army, 5);
      addFloatingText('HERO SQUAD!', box.x, box.y, '#FFD700');
      break;
    case 'bazooka':
      addSpecialSoldiersToArmy(army, 'bazooka', 8);
      addFloatingText('BAZOOKA SQUAD!', box.x, box.y, '#27ae60');
      break;
    case 'rambo':
      addSpecialSoldiersToArmy(army, 'rambo', 5);
      addFloatingText('RAMBO SQUAD!', box.x, box.y, '#e74c3c');
      break;
    case 'laser':
      addSpecialSoldiersToArmy(army, 'laser', 6);
      addFloatingText('LASER SQUAD!', box.x, box.y, '#00ffff');
      break;

    // Efeitos Ruins (Nerfs)
    case 'divide':
      removeSoldiersFromArmy(army, Math.floor(army.soldiers.length * 0.5));
      addFloatingText('DIVIDE & CONQUERED!', box.x, box.y, '#FF0000');
      isGood = false;
      break;
    case 'subtract':
      removeSoldiersFromArmy(army, 15);
      addFloatingText('AMBUSH!', box.x, box.y, '#FF0000');
      isGood = false;
      break;
    case 'slow':
      army.fireRate = Math.min(1000, army.fireRate * 1.5); // Atira mais devagar
      addFloatingText('JAMMED WEAPONS!', box.x, box.y, '#FF0000');
      isGood = false;
      break;
  }

  box.passed = true;
  playSound(isGood ? audioManager.powerUp : audioManager.nerf);
  addParticle(box.x + box.width/2, box.y + box.height/2, 'star', isGood ? '#FFFFFF' : '#FF0000', 10);
}

export function checkCollisions(entities: Entities, gameState: GameState): void {
  const army = entities.playerArmy;
  // OTIMIZAÇÃO: Calcular bounds uma vez por frame
  const bounds = getArmyBounds(army);

  // Checar colisão com gates
  for (const gate of entities.gates) {
    if (checkGateCollision(army, gate, bounds)) {
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
    if (checkHordeCollision(army, horde, bounds)) {
      gameState.isBattling = true;
      processBattle(army, horde, gameState);
    }
  }

  // Checar colisão com mini-bosses (batalha igual às hordas)
  for (const miniBoss of entities.miniBosses) {
    if (checkMiniBossCollision(army, miniBoss, bounds)) {
      gameState.isBattling = true;
      processMiniBossBattle(army, miniBoss, gameState);
    }
  }

  // Checar colisão com Mystery Boxes
  for (const box of entities.mysteryBoxes) {
    if (checkMysteryBoxCollision(army, box, bounds)) {
      applyMysteryBoxEffect(army, box, gameState, entities);
    }
  }

  // Checar colisão com Coins
  for (const coin of entities.coins) {
    if (checkCoinCollision(army, coin, bounds)) {
      coin.passed = true;
      gameState.coins += coin.value;
      playSound(audioManager.powerUp); // Reusing powerUp sound for now
      addFloatingText(`+$${coin.value}`, coin.x, coin.y, '#FFD700');
      addParticle(coin.x, coin.y, 'spark', '#FFD700', 3);
    }
  }

  // Checar tiros nas Mystery Boxes (para destruir)
  entities.mysteryBoxes.forEach(box => {
    if (!box.passed) {
       entities.bullets.forEach(bullet => {
         if (!bullet.isEnemy &&
             bullet.x > box.x && bullet.x < box.x + box.width &&
             bullet.y > box.y && bullet.y < box.y + box.height) {

           box.hp -= bullet.damage;
           bullet.y = -1000; // Remover bala

           if (box.hp <= 0 && !box.passed) {
             box.passed = true;
             addExplosion(box.x + box.width/2, box.y + box.height/2, '#FFFFFF');
             addFloatingText('DESTROYED!', box.x, box.y, '#FFFFFF');
           }
         }
       });
    }
  });

  // Checar colisão com boss
  if (checkBossCollision(army, entities, bounds) && entities.boss) {
    gameState.isBattling = true;

    // Boss causa dano ao jogador ao contato (esmagamento)
    if (entities.playerArmy.soldiers.length > 0) {
        const casualties = 2; // Mata 2 por frame
        for (let i = 0; i < casualties && army.soldiers.length > 0; i++) {
            const idx = army.soldiers.findIndex(s => s.isAlive);
            if (idx >= 0) {
              const soldier = army.soldiers[idx];
              addExplosion(soldier.x, soldier.y, '#4A90D9');
              army.soldiers[idx].isAlive = false;
            }
        }
        // Limpar soldados mortos
        army.soldiers = army.soldiers.filter(s => s.isAlive);
    }

    // Dano ao boss baseado no número de soldados atirando (contato também dá dano?)
    // O usuário disse "dar dano e receber ao encostar".
    // Recebe dano por contato físico (tipo ataque suicida ou melee)
    const contactDamage = 5;
    entities.boss.hp -= contactDamage;

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
