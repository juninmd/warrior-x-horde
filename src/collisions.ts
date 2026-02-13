// collisions.ts - Sistema de colisões
import { Entities, GameState, Army, EnemyHorde, Gate, MiniBoss, MysteryBox, Soldier } from './types';
import { addSoldiersToArmy, multiplySoldiersInArmy, removeSoldiersFromArmy, addSuperSoldiersToArmy, addSpecialSoldiersToArmy } from './entities';
import { addFloatingText, addExplosion, addParticle } from './renderer';
import { playSound, audioManager } from './audio';
import { triggerHaptic } from './input';
import { triggerScreenShake, triggerHitStop } from './game';
import { getArmyBounds, checkBounds, getEntityBounds, Rect } from './utils';
import { COLORS } from './constants';
import { soldierPool } from './soldierPool';
import { saveGameProgress } from './gameState';

function cleanupDeadSoldiers(soldiers: Soldier[]): void {
  let activeCount = 0;
  for (let i = 0; i < soldiers.length; i++) {
    const s = soldiers[i];
    if (s.isAlive) {
      if (i !== activeCount) {
        soldiers[activeCount] = s;
      }
      activeCount++;
    } else {
      soldierPool.release(s);
    }
  }
  soldiers.length = activeCount;
}

function applyGateEffect(army: Army, gate: Gate, gameState: GameState): void {
  const beforeCount = army.soldiers.length;
  let afterCount = beforeCount;
  let isPositive = true;

  switch (gate.type) {
    case 'add': {
      addSoldiersToArmy(army, gate.value);
      afterCount = army.soldiers.length;
      addFloatingText(`+${gate.value}`, gate.x + gate.width / 2, gate.y, COLORS.UI.SUCCESS, 1.2);
      break;
    }
    case 'multiply': {
      multiplySoldiersInArmy(army, gate.value);
      afterCount = army.soldiers.length;
      addFloatingText(`×${gate.value}`, gate.x + gate.width / 2, gate.y, COLORS.UI.INFO, 1.3);
      break;
    }
    case 'subtract':
      removeSoldiersFromArmy(army, Math.min(gate.value, army.soldiers.length - 1));
      afterCount = army.soldiers.length;
      addFloatingText(`-${gate.value}`, gate.x + gate.width / 2, gate.y, COLORS.UI.DANGER);
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
      army.fireRate = Math.max(40, army.fireRate * gate.value);
      addFloatingText(`🔥 Fire Rate UP!`, gate.x + gate.width / 2, gate.y, '#F39C12', 1.2);
      break;
    }
    case 'damage': {
      army.damage = (army.damage || 1) * gate.value;
      addFloatingText(`⚔️ DMG x${gate.value}!`, gate.x + gate.width / 2, gate.y, COLORS.UI.ACCENT);
      break;
    }
    case 'superwarrior': {
      addSuperSoldiersToArmy(army, Math.floor(gate.value));
      afterCount = army.soldiers.length;
      addFloatingText(`⭐ SUPER WARRIOR!`, gate.x + gate.width / 2, gate.y, COLORS.UI.GOLD);
      break;
    }
  }

  if (isPositive) {
    playSound(audioManager.powerUp);
    triggerHaptic('light');
    addParticle(gate.x + gate.width / 2, gate.y + gate.height / 2, 'shockwave', COLORS.UI.SUCCESS, 1);
  } else {
    playSound(audioManager.nerf);
    triggerHaptic('warning');
    addParticle(gate.x + gate.width / 2, gate.y + gate.height / 2, 'shockwave', COLORS.UI.DANGER, 1);
  }

  gameState.score += Math.max(0, afterCount - beforeCount) * 10;
  gate.passed = true;
}

function processBattle(army: Army, horde: EnemyHorde, gameState: GameState): void {
  const playerCount = army.aliveCount;
  const enemyCount = horde.soldiers.filter(s => s.isAlive).length;

  if (playerCount <= 0 || enemyCount <= 0) {
    if (enemyCount <= 0) {
      horde.isActive = false;
      gameState.combo++;
      gameState.comboTimer = 4000;
      if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
      }

      const comboMultiplier = Math.min(gameState.combo, 20);
      const baseScore = 100 + gameState.currentLevel * 20;
      const scoreGain = baseScore * comboMultiplier;
      gameState.score += scoreGain;
      gameState.coins += 100;

      addExplosion(horde.x, horde.y, COLORS.UI.GOLD);
      addParticle(horde.x, horde.y, "star", COLORS.UI.GOLD, 3);
      addFloatingText("+$100", horde.x, horde.y - 20, COLORS.UI.GOLD, 1.2);
      triggerHaptic("medium");

      // Milestone messages
      if (gameState.combo === 5) addFloatingText("GREAT!", horde.x, horde.y - 60, COLORS.UI.INFO, 1.5, 'critical');
      else if (gameState.combo === 10) addFloatingText("EPIC!", horde.x, horde.y - 60, '#FF00FF', 1.8, 'critical');
      else if (gameState.combo === 20) addFloatingText("LEGENDARY!", horde.x, horde.y - 60, COLORS.UI.GOLD, 2.0, 'critical');
      else if (gameState.combo === 50) addFloatingText("UNSTOPPABLE!", horde.x, horde.y - 60, COLORS.EFFECTS.EXPLOSION, 2.5, 'critical');

      if (gameState.combo >= 2) {
        const isBigCombo = gameState.combo >= 5;
        addFloatingText(`${gameState.combo}x COMBO! +${scoreGain}`, horde.x, horde.y - 30, COLORS.UI.GOLD, isBigCombo ? 1.5 : 1.1);
      } else if (horde.perfectClearEligible) {
        addFloatingText('PERFECT!', horde.x, horde.y - 40, '#00FFFF', 1.6, 'critical');
        gameState.score += 50;
        addFloatingText(`+${scoreGain}`, horde.x, horde.y, COLORS.UI.GOLD);
      } else {
        addFloatingText(`+${scoreGain}`, horde.x, horde.y, COLORS.UI.GOLD);
      }
    }
    return;
  }

  const casualties = Math.min(1, playerCount, enemyCount);

  // Optimize: Remove soldiers in a single pass instead of repeated findIndex
  let killed = 0;
  for (let i = army.soldiers.length - 1; i >= 0; i--) {
    if (killed >= casualties) break;
    if (!army.soldiers[i].isAlive) continue;

    const soldier = army.soldiers[i];
    addExplosion(soldier.x, soldier.y, COLORS.PLAYER.NORMAL);
    addParticle(soldier.x, soldier.y, 'debris', soldier.color, 3);
    addFloatingText("-1", soldier.x, soldier.y - 10, '#FF0000', 0.8);
    horde.perfectClearEligible = false;
    soldier.isAlive = false;
    army.aliveCount--;
    killed++;
  }

  gameState.damageFlash = Math.min(0.8, gameState.damageFlash + (killed * 0.05));

  killed = 0;
  for (let i = horde.soldiers.length - 1; i >= 0; i--) {
    if (killed >= casualties) break;
    if (!horde.soldiers[i].isAlive) continue;

    const soldier = horde.soldiers[i];
    addExplosion(soldier.x, soldier.y, COLORS.ENEMY.BASE);
    addParticle(soldier.x, soldier.y, 'debris', soldier.color, 3);
    soldier.isAlive = false;
    killed++;
  }

  /* v8 ignore start */
  if (killed > 0) {
      gameState.killStreak += killed;
      gameState.killStreakTimer = 2500; // 2.5 seconds window

      const k = gameState.killStreak;
      // Killstreak Milestones
      if (k === 5) addFloatingText("KILLING SPREE", horde.x, horde.y - 80, '#2ECC71', 1.3, 'critical');
      else if (k === 10) addFloatingText("RAMPAGE!", horde.x, horde.y - 80, '#3498DB', 1.5, 'critical');
      else if (k === 20) addFloatingText("DOMINATING!", horde.x, horde.y - 80, '#9B59B6', 1.8, 'critical');
      else if (k === 50) addFloatingText("UNSTOPPABLE!", horde.x, horde.y - 80, '#E74C3C', 2.2, 'critical');
      else if (k === 100) addFloatingText("GODLIKE!", horde.x, horde.y - 80, '#FFD700', 3.0, 'critical');
  }
  /* v8 ignore stop */

  cleanupDeadSoldiers(army.soldiers);
  cleanupDeadSoldiers(horde.soldiers);
  horde.count = horde.soldiers.length;

  if (horde.soldiers.length <= 0) {
    horde.isActive = false;
    triggerHitStop(5); // Hit Stop on Horde Clear
    gameState.combo++;
    gameState.comboTimer = 2000;
    if (gameState.combo > gameState.maxCombo) {
      gameState.maxCombo = gameState.combo;
    }

    // Milestone messages
    if (gameState.combo === 5) addFloatingText("GREAT!", horde.x, horde.y - 60, COLORS.UI.INFO, 1.5, 'critical');
    else if (gameState.combo === 10) addFloatingText("EPIC!", horde.x, horde.y - 60, '#FF00FF', 1.8, 'critical');
    else if (gameState.combo === 20) addFloatingText("LEGENDARY!", horde.x, horde.y - 60, COLORS.UI.GOLD, 2.0, 'critical');
    else if (gameState.combo === 50) addFloatingText("UNSTOPPABLE!", horde.x, horde.y - 60, COLORS.EFFECTS.EXPLOSION, 2.5, 'critical');

    const comboMultiplier = Math.min(gameState.combo, 10);
    const scoreGain = 100 * comboMultiplier;
    gameState.score += scoreGain;

    addExplosion(horde.x, horde.y, COLORS.UI.GOLD);
    addParticle(horde.x, horde.y, 'star', COLORS.UI.GOLD, 8);
    addFloatingText('VICTORY!', horde.x, horde.y, COLORS.UI.GOLD, 1.3);
    gameState.coins += 100;
    addFloatingText('+$100', horde.x, horde.y - 20, COLORS.UI.GOLD, 1.2);
    triggerHaptic('success');
  }

  triggerScreenShake(5, 100);
}

function processMiniBossBattle(army: Army, miniBoss: MiniBoss, gameState: GameState): void {
  const playerCount = army.aliveCount;

  if (playerCount <= 0 || miniBoss.hp <= 0) {
    if (miniBoss.hp <= 0) {
      miniBoss.isActive = false;
      gameState.score += 300;
      addExplosion(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, '#FF4500');
      addParticle(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, 'star', '#FF4500', 8);
      addFloatingText('MINI-BOSS DEFEATED!', miniBoss.x + miniBoss.width / 2, miniBoss.y, '#FF4500', 1.4);
    }
    return;
  }

  // Optimize: Remove soldiers in a single pass
  const casualties = 1;
  let killed = 0;

  for (let i = army.soldiers.length - 1; i >= 0; i--) {
    if (killed >= casualties) break;
    if (!army.soldiers[i].isAlive) continue;

    const soldier = army.soldiers[i];
    addExplosion(soldier.x, soldier.y, COLORS.PLAYER.NORMAL);
    soldier.isAlive = false;
    army.aliveCount--;
    killed++;
  }

  gameState.damageFlash = Math.min(0.8, gameState.damageFlash + (killed * 0.05));

  const damageToMiniBoss = Math.min(playerCount * 0.5, 5);
  miniBoss.hp -= damageToMiniBoss;

  cleanupDeadSoldiers(army.soldiers);

  if (miniBoss.hp <= 0) {
    miniBoss.isActive = false;
    triggerHitStop(10); // Hit Stop on MiniBoss
    gameState.score += 300;
    gameState.coins += 50;
    addExplosion(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, '#FF4500');
    addParticle(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, 'star', '#FF4500', 10);
    addFloatingText('MINI-BOSS DEFEATED!', miniBoss.x + miniBoss.width / 2, miniBoss.y, '#FF4500', 1.4);
    addFloatingText('+$50', miniBoss.x + miniBoss.width / 2, miniBoss.y - 30, COLORS.UI.GOLD, 1.5);
    triggerHaptic('heavy');
  }

  triggerScreenShake(3, 50);
}

function applyMysteryBoxEffect(army: Army, box: MysteryBox, gameState: GameState, entities: Entities): void {
  const effects = [
    'reinforcements', 'nuke', 'double', 'invincible', 'bazooka', 'rambo', 'laser', 'divide', 'subtract', 'slow'
  ];
  const effect = effects[Math.floor(Math.random() * effects.length)];
  let isGood = true;

  switch (effect) {
    case 'reinforcements':
      addSoldiersToArmy(army, 30);
      addFloatingText('REINFORCEMENTS!', box.x, box.y, COLORS.UI.SUCCESS, 1.2);
      break;
    case 'nuke':
      entities.enemyHordes.forEach(h => {
        if (h.isActive && h.y > 0 && h.y < 800) {
          h.isActive = false;
          addExplosion(h.x, h.y, COLORS.UI.GOLD);
        }
      });
      addFloatingText('NUKE!', box.x, box.y, COLORS.UI.GOLD, 2.0);
      triggerHitStop(20); // Big Hit Stop on Nuke
      triggerScreenShake(10, 500);
      break;
    case 'double':
      multiplySoldiersInArmy(army, 2);
      addFloatingText('DOUBLE TROUBLE!', box.x, box.y, '#9B59B6', 1.4);
      break;
    case 'invincible':
      addSuperSoldiersToArmy(army, 5);
      addFloatingText('HERO SQUAD!', box.x, box.y, COLORS.UI.GOLD, 1.3);
      break;
    case 'bazooka':
      addSpecialSoldiersToArmy(army, 'bazooka', 8);
      addFloatingText('BAZOOKA SQUAD!', box.x, box.y, COLORS.PLAYER.BAZOOKA, 1.3);
      break;
    case 'rambo':
      addSpecialSoldiersToArmy(army, 'rambo', 5);
      addFloatingText('RAMBO SQUAD!', box.x, box.y, COLORS.PLAYER.RAMBO, 1.3);
      break;
    case 'laser':
      addSpecialSoldiersToArmy(army, 'laser', 6);
      addFloatingText('LASER SQUAD!', box.x, box.y, COLORS.PLAYER.LASER, 1.3);
      break;
    case 'divide':
      removeSoldiersFromArmy(army, Math.floor(army.soldiers.length * 0.5));
      addFloatingText('DIVIDE & CONQUERED!', box.x, box.y, COLORS.UI.DANGER);
      isGood = false;
      break;
    case 'subtract':
      removeSoldiersFromArmy(army, 15);
      addFloatingText('AMBUSH!', box.x, box.y, COLORS.UI.DANGER);
      isGood = false;
      break;
    case 'slow':
      army.fireRate = Math.min(1000, army.fireRate * 1.5);
      addFloatingText('JAMMED WEAPONS!', box.x, box.y, COLORS.UI.DANGER);
      isGood = false;
      break;
  }

  box.passed = true;
  playSound(isGood ? audioManager.powerUp : audioManager.nerf);
  addParticle(box.x + box.width/2, box.y + box.height/2, 'star', isGood ? '#FFFFFF' : '#FF0000', 10);
  addParticle(box.x + box.width/2, box.y + box.height/2, 'shockwave', isGood ? '#FFFFFF' : '#FF0000', 1);
}

export function checkCollisions(entities: Entities, gameState: GameState): void {
  const army = entities.playerArmy;
  const bounds = getArmyBounds(army);
  const armyCenterX = army.centerX;

  // Check Gates
  for (const gate of entities.gates) {
    if (!gate.passed &&
        armyCenterX >= gate.x &&
        armyCenterX <= gate.x + gate.width &&
        bounds.bottom > gate.y &&
        bounds.top < gate.y + gate.height) {
      applyGateEffect(army, gate, gameState);
      // Pass sibling gate
      for (const otherGate of entities.gates) {
        if (otherGate.id !== gate.id && Math.abs(otherGate.y - gate.y) < 10) {
          otherGate.passed = true;
        }
      }
    }
  }

  // Check Hordes
  for (const horde of entities.enemyHordes) {
    if (horde.isActive) {
        // Hordes use center position for x/y in types?
        // Reading type def: x, y, width, height. Usually drawn centered.
        // Renderer draws at x, y. getEntityBounds assumes Top-Left by default in my utils,
        // but let's check draw logic.
        // drawEnemyHorde uses x, y directly for drawing soldiers.
        // But collisions.ts used: bounds.right > horde.x - horde.width / 2
        // This implies horde.x is Center X.
        const hordeBounds: Rect = {
            left: horde.x - horde.width / 2,
            right: horde.x + horde.width / 2,
            top: horde.y - horde.height / 2,
            bottom: horde.y + horde.height / 2
        };

        if (checkBounds(bounds, hordeBounds)) {
            gameState.isBattling = true;
            processBattle(army, horde, gameState);
        }
    }
  }

  // Check MiniBosses
  for (const miniBoss of entities.miniBosses) {
    if (miniBoss.isActive) {
        // MiniBoss check was: bounds.right > miniBoss.x && bounds.left < miniBoss.x + miniBoss.width
        // Implies Top-Left X/Y.
        const mbBounds = getEntityBounds(miniBoss.x, miniBoss.y, miniBoss.width, miniBoss.height);
        if (checkBounds(bounds, mbBounds)) {
             gameState.isBattling = true;
             processMiniBossBattle(army, miniBoss, gameState);
        }
    }
  }

  // Check Mystery Boxes
  for (const box of entities.mysteryBoxes) {
    if (box && !box.passed) {
        // Box check was standard rect
        const boxBounds = getEntityBounds(box.x, box.y, box.width, box.height);
        if (checkBounds(bounds, boxBounds)) {
            applyMysteryBoxEffect(army, box, gameState, entities);
        }
    }
  }

  // Check Coins
  for (const coin of entities.coins) {
    if (!coin.passed) {
        // Coin check was: right > coin.x - width/2. Implies Center X.
        const coinBounds: Rect = {
            left: coin.x - coin.width / 2,
            right: coin.x + coin.width / 2,
            top: coin.y - coin.height / 2,
            bottom: coin.y + coin.height / 2
        };
        if (checkBounds(bounds, coinBounds)) {
            coin.passed = true;
            gameState.coins += coin.value;
            playSound(audioManager.powerUp);
            addFloatingText(`+$${coin.value}`, coin.x, coin.y, COLORS.UI.GOLD);
            addParticle(coin.x, coin.y, 'spark', COLORS.UI.GOLD, 3);
        }
    }
  }

  // Bullet vs Mystery Box interaction
  entities.mysteryBoxes.forEach(box => {
    if (box && !box.passed) {
       entities.bullets.forEach(bullet => {
         if (bullet.y < box.y || bullet.y > box.y + box.height) return;

         if (!bullet.isEnemy &&
             bullet.x > box.x && bullet.x < box.x + box.width) {

           box.hp -= bullet.damage;
           bullet.y = -1000;

           if (box.hp <= 0 && !box.passed) {
             box.passed = true;
             addExplosion(box.x + box.width/2, box.y + box.height/2, '#FFFFFF');
             addFloatingText('DESTROYED!', box.x, box.y, '#FFFFFF');
           }
         }
       });
    }
  });

  // Check Boss
  if (entities.boss && entities.boss.isActive) {
      const boss = entities.boss;
      // Boss check was standard rect: right > boss.x ...
      // Implies Top-Left.
      const bossBounds = getEntityBounds(boss.x, boss.y, boss.width, boss.height);

      if (checkBounds(bounds, bossBounds)) {
        gameState.isBattling = true;

        if (entities.playerArmy.soldiers.length > 0) {
            const casualties = 2;
            let killed = 0;
            for (let i = army.soldiers.length - 1; i >= 0; i--) {
                if (killed >= casualties) break;
                if (!army.soldiers[i].isAlive) continue;

                const soldier = army.soldiers[i];
                addExplosion(soldier.x, soldier.y, COLORS.PLAYER.NORMAL);
                army.soldiers[i].isAlive = false;
                army.aliveCount--;
                killed++;
            }
            gameState.damageFlash = Math.min(0.8, gameState.damageFlash + (killed * 0.1));
            cleanupDeadSoldiers(army.soldiers);
        }

        const contactDamage = 5;
        boss.hp -= contactDamage;

        if (boss.hp <= 0) {
          boss.isActive = false;
          gameState.whiteFlash = 1.0;
          triggerHitStop(20); // Massive Hit Stop on Boss Kill
          gameState.slowMoTimer = 2000; // 2 seconds of Slow Mo
          gameState.isVictory = true;
          gameState.score += 1000;
          gameState.coins += 500;
          addFloatingText('BOSS DEFEATED!', boss.x + 50, boss.y, COLORS.UI.GOLD, 2.0);
          addFloatingText('+$500', boss.x + 50, boss.y - 40, COLORS.UI.GOLD, 1.8);
          triggerHaptic('heavy');
        }
      }
  }

  if (army.aliveCount <= 0 && !gameState.isGameOver && !gameState.isDying) {
    gameState.isDying = true;
    gameState.slowMoTimer = 2000; // 2 seconds of dramatic slow motion
    triggerHaptic('failure');
    triggerScreenShake(10, 2000); // Shake during death

    // Update High Score immediately for safety
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
    }
    saveGameProgress(gameState);
  }

}
