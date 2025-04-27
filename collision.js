// @ts-check

// collision.js - Sistema de colisões
import { sounds } from './audio.js';
import { applyDamage, createReinforcement } from './entities.js';
import { canvas } from './game.js';

// Verificar colisões entre todas as entidades
function checkCollisions(entities, gameState, handleEntityDeath) {
  const { allies, enemies, boss, bullets, barrels } = entities;

  // Verificar colisões do super canhão
  if (allies.length > 0 && allies[0].superCannonActive) {
    checkSuperCannonCollisions(entities, gameState, handleEntityDeath);
  }

  // Colisões de balas
  checkBulletCollisions(entities, gameState, handleEntityDeath);

  // Colisões diretas entre entidades
  checkDirectCollisions(entities, gameState, handleEntityDeath);

  // Colisões com barris
  checkBarrelCollisions(entities, gameState);
}

// Adicionar dano do super canhão aos barris
function checkSuperCannonCollisions(entities, gameState, handleEntityDeath) {
  const { allies, enemies, boss, barrels } = entities;

  if (allies.length === 0) return;

  const mainPlayer = allies[0];
  const beamX = mainPlayer.x + mainPlayer.width / 2 - 10;
  const beamWidth = 20;

  // Colisão com o chefe
  if (boss &&
    boss.y < mainPlayer.y &&
    boss.x + boss.width > beamX &&
    boss.x < beamX + beamWidth) {

    // Aplicar dano ao chefe
    boss.hp -= mainPlayer.bulletDamage * mainPlayer.superCannonDamageMultiply;
    boss.damageEffect = 5;

    // Verificar se o chefe morreu
    if (boss.hp <= 0) {
      handleEntityDeath(boss, null, 'boss');
    }
  }

  // Colisão com inimigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (enemy.y < mainPlayer.y &&
      enemy.x + enemy.width > beamX &&
      enemy.x < beamX + beamWidth) {

      // Aplicar dano ao inimigo
      enemy.hp -= mainPlayer.bulletDamage * mainPlayer.superCannonDamageMultiply;
      enemy.damageEffect = 5;

      // Verificar se o inimigo morreu
      if (enemy.hp <= 0) {
        handleEntityDeath(enemy, i, 'enemy');
      }
    }
  }

  // Colisão com barris
  for (let i = barrels.length - 1; i >= 0; i--) {
    const barrel = barrels[i];

    if (barrel.y < mainPlayer.y &&
      barrel.x + barrel.width > beamX &&
      barrel.x < beamX + beamWidth) {

      // Aplicar dano ao barril
      barrel.hp -= mainPlayer.bulletDamage * mainPlayer.superCannonDamageMultiply;

      // Verificar se o barril foi destruído
      if (barrel.hp <= 0) {
        barrels.splice(i, 1);

        // Aplicar efeito do barril, se necessário
        if (barrel.barrelType === 'reinforcement' && allies.length < gameState.maxReinforcements) {
          const offsetX = allies.length % 2 === 0 ? -30 * allies.length : 30 * allies.length;
          entities.allies.push(createReinforcement(offsetX, allies[0]));
          sounds.buff_damage.play();
        } else {
          processBarrelEffect(allies[0], barrel);
        }
      }}

  }
}

// Verificar colisões de balas
function checkBulletCollisions(entities, gameState, handleEntityDeath) {
  const { allies, enemies, boss, bullets } = entities;

  // Verificar cada bala
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    let bulletRemoved = false;

    // Balas inimigas vs aliados
    if (bullet.isEnemy) {
      for (let j = allies.length - 1; j >= 0; j--) {
        const ally = allies[j];

        if (isColliding(bullet, ally)) {
          // Bala acertou aliado
          bullets.splice(i, 1);
          bulletRemoved = true;

          // Aplicar dano ao aliado
          if (applyDamage(ally, bullet.damage)) {
            handleEntityDeath(ally, j, 'ally');
          }
          break;
        }
      }
    }
    // Balas aliadas vs inimigos e chefe
    else {
      // Verificar colisão com inimigos
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];

        if (isColliding(bullet, enemy)) {
          // Remover bala
          bullets.splice(i, 1);
          bulletRemoved = true;

          // Aplicar dano ao inimigo
          enemy.hp -= bullet.damage;
          enemy.damageEffect = 5;

          // Verificar se o inimigo morreu
          if (enemy.hp <= 0) {
            handleEntityDeath(enemy, j, 'enemy');
          }
          break;
        }
      }

      // Verificar colisão com chefe (se a bala ainda existir)
      if (!bulletRemoved && boss && isColliding(bullet, boss)) {
        // Remover bala
        bullets.splice(i, 1);
        bulletRemoved = true;

        // Aplicar dano ao chefe
        boss.hp -= bullet.damage;
        boss.damageEffect = 5;

        // Verificar se o chefe morreu
        if (boss.hp <= 0) {
          handleEntityDeath(boss, null, 'boss');
        }
      }

      // Verificar colisão com barris de reforço (se a bala ainda existir)
      if (!bulletRemoved) {
        for (let j = entities.barrels.length - 1; j >= 0; j--) {
          const barrel = entities.barrels[j];

          if (isColliding(bullet, barrel)) {

            // Remover bala
            bullets.splice(i, 1);
            barrel.hp -= bullet.damage;

            // Se o barril for destruído, criar um reforço
            if (barrel.hp <= 0) {
              entities.barrels.splice(j, 1);

              // Verificar limite de reforços
              if (barrel.barrelType === 'reinforcement' && allies.length < gameState.maxReinforcements) {
                // Calcular offset para o reforço
                const offsetX = allies.length % 2 === 0 ? -30 * allies.length : 30 * allies.length;
                entities.allies.push(createReinforcement(offsetX, allies[0]));
                sounds.buff_damage.play();
              } else {
                if (allies.length === 0) return;
                const mainPlayer = allies[0];
                processBarrelEffect(mainPlayer, barrel);
              }
            }
            break;
          }
        }
      }
    }
  }
}

// Verificar colisões diretas entre entidades
function checkDirectCollisions(entities, gameState, handleEntityDeath) {
  const { allies, enemies, boss, barrels } = entities;

  // Verificar colisão entre aliados e inimigos
  for (let i = allies.length - 1; i >= 0; i--) {
    const ally = allies[i];

    // Colisão com inimigos
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];

      if (isColliding(ally, enemy)) {
        // Remover inimigo
        enemies.splice(j, 1);

        // Aplicar dano ao aliado
        if (applyDamage(ally, 1)) {
          handleEntityDeath(ally, i, 'ally');
        }
      }
    }

    // Colisão com chefe
    if (boss && isColliding(ally, boss)) {
      // Aplicar dano ao aliado (dano máximo)
      if (applyDamage(ally, ally.hp)) {
        handleEntityDeath(ally, i, 'ally');
      }
    }

    for (let i = barrels.length - 1; i >= 0; i--) {
      const barrel = barrels[i];

      if (isColliding(ally, barrel)) {
        barrels.splice(i, 1);

        // Aplicar dano ao aliado
        if (applyDamage(ally, 1)) {
          handleEntityDeath(ally, i, 'ally');
        }
      }
    }

  }

  // Verificar inimigos que saíram da tela
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    if (enemy.y > canvas.height) {
      enemies.splice(i, 1);

      // Aplicar dano ao jogador principal se existir
      if (allies.length > 0) {
        if (applyDamage(allies[0], 1)) {
          handleEntityDeath(allies[0], 0, 'ally');
        }
      }
    }
  }
}

// Certificar que os efeitos dos barris estão sendo aplicados corretamente
function processBarrelEffect(player, barrel) {

  if (barrel.barrelType === 'buff') {
    // Escolha aleatória de buff
    const rand = Math.random();
    const maxHp = 10;
    const hpRatio = player.hp / maxHp;
    const healChance = 0.25 + (1 - hpRatio) * 0.25; // Varia entre 25% e 50%
    const shieldChance = 0.25;
    const damageChance = 0.25;
    const fireRateChance = 1 - (healChance + shieldChance + damageChance);

    if (rand < shieldChance) {
      player.shield += 1;
      sounds.buff_damage.play();
    } else if (rand < shieldChance + damageChance) {
      player.bulletDamage += 1;
      sounds.buff_damage.play();
    } else if (rand < shieldChance + damageChance + fireRateChance) {
      player.fireRate = Math.max(100, player.fireRate - 100);
      sounds.buff_firerate.play();
    }
  }
  else if (barrel.barrelType === 'nerf') {
    // Efeito negativo aleatório
    const rand = Math.random();

    if (rand < 0.33) {
      player.bulletDamage = Math.max(1, player.bulletDamage - 1);
    } else if (rand < 0.66) {
      player.fireRate += 100;
    } else {
      player.hp = Math.max(1, player.hp - 1);
    }
    sounds.nerf.play();
  }
  else if (barrel.barrelType === 'health') {
    player.hp += 1;
    sounds.buff_health.play();
  }
}

// Corrigir a lógica para adicionar reforços ao destruir barris de reforço
function checkBarrelCollisions(entities, gameState) {
  const { allies, barrels } = entities;

  // Ignorar se não há aliados
  if (allies.length === 0) return;

  const mainPlayer = allies[0];

  // Verificar cada barril
  for (let i = barrels.length - 1; i >= 0; i--) {
    const barrel = barrels[i];

    // Verificar colisão com jogador principal
    if (isColliding(mainPlayer, barrel)) {
      // Processar efeito do barril
      if (barrel.barrelType === 'reinforcement') {
        // Adicionar reforço se o limite não foi atingido
        if (allies.length < gameState.maxAllies) {
          const offsetX = allies.length % 2 === 0 ? -30 * allies.length : 30 * allies.length;
          allies.push(createReinforcement(offsetX, mainPlayer));
          sounds.buff_damage.play();
        }
      } else {
        processBarrelEffect(mainPlayer, barrel);
      }

      // Remover barril
      barrels.splice(i, 1);
    }
  }
}

// Verificar se duas entidades estão colidindo
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export { checkCollisions };