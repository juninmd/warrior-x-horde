// shooting.ts - Sistema de tiro automatico e Super Cannon
import { Entities, GameState, Bullet, EnemyHorde, Boss, Soldier, MiniBoss, BulletType } from './types';
import { addFloatingText, addExplosion, addParticle } from './renderer';
import { ObjectPool } from './pool';

const bulletPool = new ObjectPool<Bullet>(
  () => ({ x: 0, y: 0, targetX: 0, targetY: 0, speed: 0, damage: 0, isEnemy: false, type: 'normal' }),
  (b) => {
    b.x = 0;
    b.y = 0;
    b.targetX = 0;
    b.targetY = 0;
    b.speed = 0;
    b.damage = 0;
    b.isEnemy = false;
    b.type = 'normal';
  }
);

export function createBullet(x: number, y: number, targetX: number, targetY: number, damage: number, isEnemy: boolean, type: BulletType = 'normal'): Bullet {
  const bullet = bulletPool.get();
  bullet.x = x;
  bullet.y = y;
  bullet.targetX = targetX;
  bullet.targetY = targetY;
  bullet.speed = isEnemy ? 3 : -12; // Tiros do jogador mais rápidos

  if (type === 'rocket') {
      bullet.speed = -8; // Rockets are slower
  } else if (type === 'laser') {
      bullet.speed = -20; // Lasers are very fast
  }

  bullet.damage = damage;
  bullet.isEnemy = isEnemy;
  bullet.type = type;
  return bullet;
}

function findNearestTarget(shooter: Soldier, hordes: EnemyHorde[], boss: Boss | null, miniBosses: MiniBoss[]): { x: number; y: number } | null {
  let nearestDist = Infinity;
  let nearest: { x: number; y: number } | null = null;

  // Procurar inimigos nas hordas
  for (const horde of hordes) {
    if (!horde.isActive || horde.soldiers.length === 0) continue;

    // Encontrar o soldado inimigo mais próximo, não apenas o centro da horda
    for (const enemy of horde.soldiers) {
      if (!enemy.isAlive) continue;
      const dx = enemy.x - shooter.x;
      const dy = enemy.y - shooter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Só mirar em inimigos que estão na frente (acima)
      if (dist < nearestDist && enemy.y < shooter.y) {
        nearestDist = dist;
        nearest = { x: enemy.x, y: enemy.y };
      }
    }
  }

  // Verificar mini-bosses
  for (const miniBoss of miniBosses) {
    if (!miniBoss.isActive) continue;
    const dx = miniBoss.x + miniBoss.width / 2 - shooter.x;
    const dy = miniBoss.y + miniBoss.height / 2 - shooter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist && miniBoss.y < shooter.y) {
      nearestDist = dist;
      nearest = { x: miniBoss.x + miniBoss.width / 2, y: miniBoss.y + miniBoss.height / 2 };
    }
  }

  // Verificar boss
  if (boss && boss.isActive) {
    const dx = boss.x + boss.width / 2 - shooter.x;
    const dy = boss.y + boss.height / 2 - shooter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist && boss.y < shooter.y) {
      nearest = { x: boss.x + boss.width / 2, y: boss.y + boss.height / 2 };
    }
  }

  return nearest;
}

function checkBulletSoldierCollision(bullet: Bullet, soldier: Soldier): boolean {
  const soldierRadius = soldier.size;
  const bulletRadius = bullet.type === 'rocket' ? 10 : 5; // Rockets have larger hit area (direct hit)
  const dx = bullet.x - soldier.x;
  const dy = bullet.y - soldier.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < (soldierRadius + bulletRadius);
}

export function updateShooting(entities: Entities, gameState: GameState): void {
  if (gameState.isGameOver || gameState.isVictory) return;

  const army = entities.playerArmy;
  const now = Date.now();

  // Army fire rate check for normal soldiers
  const canArmyShoot = now - army.lastShotTime >= army.fireRate;

  const aliveSoldiers = army.soldiers.filter(s => s.isAlive);
  if (aliveSoldiers.length === 0) return;

  // Mais soldados atiram baseado no tamanho do exército
  // We need to iterate all soldiers to check individual fire rates for special units
  // For normal units, we still use the group logic to save performance, but maybe we should allow specials to always shoot?

  const shootersCount = Math.min(Math.ceil(aliveSoldiers.length / 5), 20); // Até 20 atiradores normais
  let normalShootersCount = 0;

  // Sort soldiers by Y (frontline first)
  const sortedSoldiers = [...aliveSoldiers].sort((a, b) => a.y - b.y);

  for (const shooter of sortedSoldiers) {
      let canShoot = false;

      // Special soldiers have individual fire rates
      if (shooter.type !== 'normal') {
          if (!shooter.lastShotTime) shooter.lastShotTime = 0;
          const fireRate = shooter.personalFireRate || army.fireRate;
          if (now - shooter.lastShotTime >= fireRate) {
              canShoot = true;
          }
      } else {
          // Normal soldiers follow army fire rate and limit
          if (canArmyShoot && normalShootersCount < shootersCount) {
              canShoot = true;
              normalShootersCount++;
          }
      }

      if (!canShoot) continue;

      // Find target
      const target = findNearestTarget(shooter, entities.enemyHordes, entities.boss, entities.miniBosses);
      if (!target) continue;

      const bulletX = army.centerX; // All bullets start from center? Maybe special units should shoot from their position if we want to be fancy, but keep center for consistency as per code comments

      let damage = army.damage;
      let type: BulletType = 'normal';
      let dispersion = (Math.random() - 0.5) * 3;

      if (shooter.type === 'super') {
          damage *= 2;
          dispersion = 0;
      } else if (shooter.type === 'bazooka') {
          damage *= 5; // High damage
          type = 'rocket';
          dispersion = (Math.random() - 0.5) * 5; // Less accurate
      } else if (shooter.type === 'rambo') {
          damage *= 0.8; // Slightly less damage per shot but high ROF
          dispersion = (Math.random() - 0.5) * 10; // Spray and pray
      } else if (shooter.type === 'laser') {
          damage *= 1.5;
          type = 'laser';
          dispersion = 0; // Perfect accuracy
      }

      entities.bullets.push(createBullet(
        bulletX,
        army.centerY - 20,
        target.x + dispersion,
        target.y,
        damage,
        false,
        type
      ));

      if (shooter.type !== 'normal') {
          shooter.lastShotTime = now;
      }
  }

  if (canArmyShoot && normalShootersCount > 0) {
      army.lastShotTime = now;
  }
}

export function activateSuperCannon(gameState: GameState): void {
  const now = Date.now();
  if (!gameState.superCannonReady) return;
  if (now - gameState.superCannonLastUsed < gameState.superCannonCooldown) return;

  gameState.superCannonActive = true;
  gameState.superCannonTimer = gameState.superCannonDuration;
  gameState.superCannonLastUsed = now;
  gameState.superCannonReady = false;
}

export function updateSuperCannon(entities: Entities, gameState: GameState, deltaTime: number): void {
  const now = Date.now();

  if (!gameState.superCannonReady && now - gameState.superCannonLastUsed >= gameState.superCannonCooldown) {
    gameState.superCannonReady = true;
  }

  if (gameState.superCannonActive) {
    gameState.superCannonTimer -= deltaTime;

    if (gameState.superCannonTimer <= 0) {
      gameState.superCannonActive = false;
      gameState.superCannonTimer = 0;
    } else {
      applySuperCannonDamage(entities, gameState);
    }
  }
}

function applySuperCannonDamage(entities: Entities, gameState: GameState): void {
  const army = entities.playerArmy;
  if (army.soldiers.length === 0) return;

  const beamX = army.centerX;
  const beamWidth = 40;
  const damage = army.damage * gameState.superCannonDamageMultiplier;

  for (const horde of entities.enemyHordes) {
    if (!horde.isActive) continue;

    for (let i = horde.soldiers.length - 1; i >= 0; i--) {
      const soldier = horde.soldiers[i];
      if (soldier.y < army.centerY && soldier.x > beamX - beamWidth / 2 && soldier.x < beamX + beamWidth / 2) {
        // Efeito visual de desintegração
        addExplosion(soldier.x, soldier.y, '#FFD700');
        addParticle(soldier.x, soldier.y, 'spark', '#FFF', 3);
        horde.soldiers.splice(i, 1);
        gameState.score += 15;
      }
    }

    horde.count = horde.soldiers.length;
    if (horde.soldiers.length === 0) {
      horde.isActive = false;
      gameState.score += 100;
      addParticle(horde.x, horde.y, 'star', '#FFD700', 10);
    }
  }

  if (entities.boss && entities.boss.isActive) {
    const boss = entities.boss;
    const bossCenter = boss.x + boss.width / 2;
    if (bossCenter > beamX - beamWidth / 2 && bossCenter < beamX + beamWidth / 2) {
      boss.hp -= damage * 0.1;
      if (boss.hp <= 0) {
        boss.isActive = false;
        gameState.isVictory = true;
        gameState.score += 1000;
        addFloatingText('BOSS DESTROYED!', boss.x + boss.width / 2, boss.y, '#FFD700');
      }
    }
  }
}

export function updateBullets(entities: Entities, gameState: GameState): void {
  // Atualizar e remover bullets fora da tela manualmente para usar o pool
  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    const bullet = entities.bullets[i];
    bullet.y += bullet.speed;

    if (bullet.y <= -50 || bullet.y >= 900) {
      bulletPool.release(bullet);
      entities.bullets.splice(i, 1);
    }
  }

  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    const bullet = entities.bullets[i];
    if (bullet.isEnemy) continue;

    let bulletHit = false;

    // Colisão com hordas (só inimigos visíveis - y > 100)
    for (const horde of entities.enemyHordes) {
      if (!horde.isActive || bulletHit) continue;

      // Horda precisa estar visível (abaixo da área de fadeIn)
      if (horde.y < 100) continue;

      for (let j = horde.soldiers.length - 1; j >= 0; j--) {
        const soldier = horde.soldiers[j];
        if (!soldier.isAlive) continue;

        // Soldado precisa estar visível
        if (soldier.y < 100) continue;

        if (checkBulletSoldierCollision(bullet, soldier)) {
          // Aplicar dano ao HP do inimigo
          soldier.hp -= bullet.damage;

          // Efeito visual de impacto
          addExplosion(soldier.x, soldier.y, '#E74C3C');

          if (bullet.type === 'rocket') {
              // Area Damage
              // Find other soldiers near this one
              const explosionRadius = 40;
              for (let k = horde.soldiers.length - 1; k >= 0; k--) {
                  if (k === j) continue; // Skip the direct hit one (already damaged)
                  const otherSoldier = horde.soldiers[k];
                  const dx = otherSoldier.x - soldier.x;
                  const dy = otherSoldier.y - soldier.y;
                  if (dx*dx + dy*dy < explosionRadius*explosionRadius) {
                      otherSoldier.hp -= bullet.damage * 0.5; // 50% splash damage
                      if (otherSoldier.hp <= 0) {
                          horde.soldiers.splice(k, 1);
                          if (k < j) j--; // Adjust index if we removed an element before current
                      }
                  }
              }
              // Add big explosion effect
              addParticle(soldier.x, soldier.y, 'explosion', '#FFA500', 5);
          }

          // Só remove se HP <= 0
          if (soldier.hp <= 0) {
            horde.soldiers.splice(j, 1);
            horde.count = horde.soldiers.length;
            gameState.score += 10;

            if (horde.soldiers.length === 0) {
              horde.isActive = false;
              gameState.score += 50;
              addFloatingText('HORDE DESTROYED!', horde.x, horde.y, '#FFD700');
              addParticle(horde.x, horde.y, 'star', '#FFD700', 8);
            }
          }

          if (bullet.type !== 'laser') { // Lasers pierce? maybe not for now to keep it simple, or make them pierce
            bulletPool.release(bullet);
            entities.bullets.splice(i, 1);
            bulletHit = true;
          } else {
             // Laser hits but continues? Let's say it pierces 1 enemy then dies, or just dies for now.
             // To implement pierce properly we need a "hit list" on the bullet.
             // For simplicity, let's make laser just hit once for now but have high velocity/accuracy.
             bulletPool.release(bullet);
             entities.bullets.splice(i, 1);
             bulletHit = true;
          }
          break;
        }
      }
    }

    if (bulletHit) continue;

    // Colisão com mini-bosses (só se visíveis)
    for (const miniBoss of entities.miniBosses) {
      if (!miniBoss.isActive || bulletHit) continue;

      // Mini-boss precisa estar visível
      if (miniBoss.y < 50) continue;

      if (bullet.x > miniBoss.x && bullet.x < miniBoss.x + miniBoss.width &&
          bullet.y > miniBoss.y && bullet.y < miniBoss.y + miniBoss.height) {
        miniBoss.hp -= bullet.damage;

        if (bullet.type !== 'laser') {
            bulletPool.release(bullet);
            entities.bullets.splice(i, 1);
        } else {
            // Laser hits once per frame effectively if we don't remove it, which is bad.
            bulletPool.release(bullet);
            entities.bullets.splice(i, 1);
        }

        // Efeito de impacto
        addExplosion(bullet.x, bullet.y, '#FF4500');

        if (miniBoss.hp <= 0) {
          miniBoss.isActive = false;
          gameState.score += 200;
          addFloatingText('MINI-BOSS!', miniBoss.x + miniBoss.width / 2, miniBoss.y, '#FF4500');
          // Explosão do mini-boss
          for (let k = 0; k < 3; k++) {
            setTimeout(() => {
              addExplosion(miniBoss.x + Math.random() * miniBoss.width, miniBoss.y + Math.random() * miniBoss.height, '#FF4500');
            }, k * 50);
          }
        }
        bulletHit = true;
        break;
      }
    }

    if (bulletHit) continue;

    // Colisão com boss
    if (entities.boss && entities.boss.isActive) {
      const boss = entities.boss;

      // Hitbox diferente para nave mãe (área circular no topo)
      let hitBoss = false;
      if (boss.type === 'mothership') {
        // A nave está no centro do topo, hitbox circular
        const shipCenterX = boss.x;
        const shipCenterY = boss.y;
        const hitRadius = 70; // Raio da nave
        const dx = bullet.x - shipCenterX;
        const dy = bullet.y - shipCenterY;
        hitBoss = (dx * dx + dy * dy) < (hitRadius * hitRadius);
      } else {
        // Boss normal - hitbox retangular
        hitBoss = bullet.x > boss.x && bullet.x < boss.x + boss.width &&
                  bullet.y > boss.y && bullet.y < boss.y + boss.height;
      }

      if (hitBoss) {
        boss.hp -= bullet.damage;
        bulletPool.release(bullet);
        entities.bullets.splice(i, 1);

        // Efeito de impacto no boss
        addExplosion(bullet.x, bullet.y, boss.type === 'mothership' ? '#00FF88' : '#FF6B6B');

        if (boss.hp <= 0) {
          boss.isActive = false;

          if (boss.type === 'mothership') {
            // Vitória final do jogo - derrotou a nave mãe!
            gameState.isVictory = true;
            gameState.score += 5000; // Bônus maior
            addFloatingText('🎉 VITÓRIA FINAL! 🎉', boss.x, boss.y + 100, '#FFD700');
            addFloatingText('NAVE MÃE DESTRUÍDA!', boss.x, boss.y + 140, '#00FF88');
            // Explosão ÉPICA da nave mãe
            for (let k = 0; k < 15; k++) {
              setTimeout(() => {
                const explosionX = boss.x + (Math.random() - 0.5) * 150;
                const explosionY = boss.y + (Math.random() - 0.5) * 80;
                addExplosion(explosionX, explosionY, k % 2 === 0 ? '#00FF88' : '#FFD700');
                addParticle(boss.x, boss.y, 'star', '#00FFAA', 15);
              }, k * 150);
            }
          } else {
            // Boss normal derrotado - próximo level
            gameState.isVictory = true;
            gameState.score += 500;
            addFloatingText('BOSS DEFEATED!', boss.x + boss.width / 2, boss.y, '#FFD700');
            // Explosão épica do boss
            for (let k = 0; k < 5; k++) {
              setTimeout(() => {
                addExplosion(boss.x + Math.random() * boss.width, boss.y + Math.random() * boss.height, '#FFD700');
                addParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, 'star', '#FF6B6B', 10);
              }, k * 100);
            }
          }
        }
      }
    }
  }
}
