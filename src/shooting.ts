// shooting.ts - Sistema de tiro automatico e Super Cannon
import { Entities, GameState, Bullet, Army, EnemyHorde, Boss, Soldier, MiniBoss } from './types';
import { addFloatingText, addExplosion, addParticle } from './renderer';
import { ObjectPool } from './pool';

const bulletPool = new ObjectPool<Bullet>(
  () => ({ x: 0, y: 0, targetX: 0, targetY: 0, speed: 0, damage: 0, isEnemy: false }),
  (b) => {
    b.x = 0;
    b.y = 0;
    b.targetX = 0;
    b.targetY = 0;
    b.speed = 0;
    b.damage = 0;
    b.isEnemy = false;
  }
);

export function createBullet(x: number, y: number, targetX: number, targetY: number, damage: number, isEnemy: boolean): Bullet {
  const bullet = bulletPool.get();
  bullet.x = x;
  bullet.y = y;
  bullet.targetX = targetX;
  bullet.targetY = targetY;
  bullet.speed = isEnemy ? 3 : -12; // Tiros do jogador mais rápidos
  bullet.damage = damage;
  bullet.isEnemy = isEnemy;
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
  const bulletRadius = 5;
  const dx = bullet.x - soldier.x;
  const dy = bullet.y - soldier.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < (soldierRadius + bulletRadius);
}

export function updateShooting(entities: Entities, gameState: GameState): void {
  if (gameState.isGameOver || gameState.isVictory) return;

  const army = entities.playerArmy;
  const now = Date.now();

  if (now - army.lastShotTime < army.fireRate) return;

  const aliveSoldiers = army.soldiers.filter(s => s.isAlive);
  if (aliveSoldiers.length === 0) return;

  // Mais soldados atiram baseado no tamanho do exército
  const shootersCount = Math.min(Math.ceil(aliveSoldiers.length / 5), 20); // Até 20 atiradores

  // Selecionar atiradores da frente do exército (menores Y)
  const sortedSoldiers = [...aliveSoldiers].sort((a, b) => a.y - b.y);
  const shooters = sortedSoldiers.slice(0, shootersCount);

  for (const shooter of shooters) {
    // Cada atirador procura seu alvo mais próximo
    const target = findNearestTarget(shooter, entities.enemyHordes, entities.boss, entities.miniBosses);
    if (!target) continue;

    // TODOS os tiros saem do centro do exército (como o Super Cannon)
    // Super guerreiros têm precisão perfeita, normais têm dispersão mínima
    const bulletX = army.centerX;
    const dispersion = shooter.isSuper ? 0 : (Math.random() - 0.5) * 3; // 0 dispersão para super, mínima para normal

    entities.bullets.push(createBullet(
      bulletX,
      army.centerY - 20, // Sai do centro do exército
      target.x + dispersion, // Tiros mais centralizados
      target.y,
      shooter.isSuper ? army.damage * 2 : army.damage, // Super causa 2x dano
      false
    ));
  }

  army.lastShotTime = now;
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

          bulletPool.release(bullet);
          entities.bullets.splice(i, 1);
          bulletHit = true;
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
        bulletPool.release(bullet);
        entities.bullets.splice(i, 1);

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
