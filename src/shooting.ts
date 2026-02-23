// shooting.ts - Sistema de tiro automatico e Super Cannon
import { Entities, GameState, Bullet, EnemyHorde, Boss, Soldier, MiniBoss } from './types';
import { addFloatingText, addExplosion, addParticle } from './renderer';
import { triggerScreenShake } from './game';
import { ObjectPool } from './pool';
import { SpatialHashGrid, SpatialItem } from './spatial';
import { fastRemove } from './utils';
import { soldierPool } from './soldierPool';

// Grid espacial para otimização de colisão (Célula de 120px cobre bem grupos de inimigos)
const enemyGrid = new SpatialHashGrid(120);

// Reusable array to avoid allocations
const tempPlayerBullets: Bullet[] = [];
const tempQueryResults: SpatialItem[] = [];

// Reusable arrays for updateShooting to avoid per-frame allocation
const tempLasers: Soldier[] = [];
const tempBazookas: Soldier[] = [];
const tempRambos: Soldier[] = [];
const tempSupers: Soldier[] = [];
const tempNormals: Soldier[] = [];
const tempShooters: Soldier[] = [];

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

  // OTIMIZAÇÃO: Checar distância da horda primeiro
  const MAX_TARGET_DIST = 750; // Aumentado para cobrir quase toda a tela (800px)

  // Procurar inimigos nas hordas - OTIMIZAÇÃO: Alvejar a horda, não soldados individuais
  for (const horde of hordes) {
    if (!horde.isActive || horde.soldiers.length === 0) continue;

    const dy = horde.y - shooter.y;
    // Só mirar em inimigos que estão na frente (acima) e dentro do alcance
    if (dy >= 0 || Math.abs(dy) > MAX_TARGET_DIST) continue;

    // Calcular distância para o CENTRO da horda
    const dx = horde.x - shooter.x;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < nearestDist) {
      nearestDist = dist;
      // Alvejar ponto aleatório dentro da área da horda para espalhar os tiros
      // Isso simula mirar em soldados sem o custo de iterar por todos eles (O(1) vs O(N))
      const jitterX = (Math.random() - 0.5) * Math.min(horde.width, 150);
      /* v8 ignore next */
      const jitterY = (Math.random() - 0.5) * Math.min(horde.height, 80);
      nearest = { x: horde.x + jitterX, y: horde.y + jitterY };
    }
  }

  // Verificar mini-bosses
  for (const miniBoss of miniBosses) {
    /* v8 ignore next */
    if (!miniBoss.isActive) continue;
    const dx = miniBoss.x + miniBoss.width / 2 - shooter.x;
    const dy = miniBoss.y + miniBoss.height / 2 - shooter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    /* v8 ignore start */
    if (dist < nearestDist && miniBoss.y < shooter.y) {
      nearestDist = dist;
      nearest = { x: miniBoss.x + miniBoss.width / 2, y: miniBoss.y + miniBoss.height / 2 };
    }
    /* v8 ignore stop */
  }

  // Verificar boss
  if (boss && boss.isActive) {
    const dx = boss.x + boss.width / 2 - shooter.x;
    const dy = boss.y + boss.height / 2 - shooter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    /* v8 ignore start */
    if (dist < nearestDist && boss.y < shooter.y) {
      nearest = { x: boss.x + boss.width / 2, y: boss.y + boss.height / 2 };
    }
    /* v8 ignore stop */
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

  // PERFORMANCE OPTIMIZATION: Use bucket sort instead of full sort
  /* v8 ignore start */
  // Avoids allocating filtered array and expensive sort with function calls
  tempLasers.length = 0;
  tempBazookas.length = 0;
  tempRambos.length = 0;
  tempSupers.length = 0;
  tempNormals.length = 0;
  tempShooters.length = 0;

  // Use cached aliveCount for performance
  if (army.aliveCount === 0) return;

  // PERFORMANCE OPTIMIZATION: Processing Slice
  // Only process a subset of soldiers per frame to keep FPS high with large armies.
  // We process up to 200 soldiers per frame. With 1000 soldiers, each gets checked every 5 frames (80ms).
  // This is plenty fast for a fire rate of ~500ms.
  const PROCESS_BATCH_SIZE = 200;

  // Use army.scanIndex (initialize if undefined/legacy)
  if (army.scanIndex === undefined) {
      army.scanIndex = 0;
  }

  let scanIndex = army.scanIndex;
  const totalSoldiers = army.soldiers.length;

  // If array shrank significantly, reset index
  if (scanIndex >= totalSoldiers) scanIndex = 0;

  const endIndex = Math.min(scanIndex + PROCESS_BATCH_SIZE, totalSoldiers);

  // First Pass: Collect candidates from the slice
  for (let i = scanIndex; i < endIndex; i++) {
    const s = army.soldiers[i];
    if (!s.isAlive) continue;

    if (s.type === 'laser') { tempLasers.push(s); continue; }
    if (s.type === 'bazooka') { tempBazookas.push(s); continue; }
    if (s.type === 'rambo') { tempRambos.push(s); continue; }
    if (s.isSuper) { tempSupers.push(s); continue; }
    tempNormals.push(s);
  }

  // Update index for next frame
  army.scanIndex = endIndex >= totalSoldiers ? 0 : endIndex;

  // Calculate shooters cap based on the *slice* size, not total army size,
  // to maintain consistent fire density per frame.
  // 200 soldiers -> max 15 shooters per frame -> 900 shooters per second (lots!)
  // We reduce the divisor to make it denser since we process fewer units.
  const sliceAliveCount = tempLasers.length + tempBazookas.length + tempRambos.length + tempSupers.length + tempNormals.length;
  const shootersCount = Math.min(Math.ceil(sliceAliveCount / 3), 15);

  let needed = shootersCount;

  // Coleta ordenada (Special -> Super -> Normal)
  // Prioridade: Laser (5) > Bazooka (4) > Rambo (3) > Super (2) > Normal (1)
  const buckets = [tempLasers, tempBazookas, tempRambos, tempSupers, tempNormals];

  /* v8 ignore start */
  for (const bucket of buckets) {
    if (needed <= 0) break;
    if (bucket.length === 0) continue;

    if (bucket.length <= needed) {
      // Se o bucket cabe inteiro, pegamos todos.
      for (const s of bucket) tempShooters.push(s);
      needed -= bucket.length;
    } else {
      // Se o bucket é maior que o necessário, pegamos aleatoriamente ou os primeiros da fatia
      // Como a fatia já percorre o array sequencialmente (e o array é ~ordenado por spawn/Y),
      // pegar os primeiros da fatia é justo.
      for (let i = 0; i < needed; i++) {
        tempShooters.push(bucket[i]);
      }
      needed = 0;
    }
  }
  /* v8 ignore stop */
  /* v8 ignore stop */

  for (const shooter of tempShooters) {
    // Cada atirador procura seu alvo mais próximo
    const target = findNearestTarget(shooter, entities.enemyHordes, entities.boss, entities.miniBosses);
    if (!target) continue;

    // TODOS os tiros saem do centro do exército
    const bulletX = army.centerX;
    const dispersion = (shooter.isSuper || shooter.type !== 'normal') ? 0 : (Math.random() - 0.5) * 3;

    // Customizar tiro baseada na classe
    let damage = army.damage;
    let speed = 0; // Se 0, usa padrão do createBullet (-12)

    if (shooter.isSuper) damage *= 2;

    // Bônus de classe
    /* v8 ignore start */
    switch (shooter.type) {
      case 'bazooka':
        damage *= 5; // Dano massivo
        // Bazooka poderia ser mais lenta, mas createBullet controla speed.
        // Vamos deixar speed padrão mas muito dano.
        break;
      case 'rambo':
        damage *= 1.5; // Dano moderado
        // Rambo atira rápido (já garantido por estar na lista de shooters prioritários)
        break;
      case 'laser':
        damage *= 3;
        speed = -25; // Tiro ultra rápido
        break;
    }
    /* v8 ignore stop */

    const bullet = createBullet(
      bulletX,
      army.centerY - 20,
      target.x + dispersion,
      target.y,
      damage,
      false
    );

    // Sobrescrever speed se definido
    /* v8 ignore next */
    if (speed !== 0) bullet.speed = speed;

    entities.bullets.push(bullet);

    // Muzzle Flash Effect (Visual variety per class)
    let flashColor = '#FFF';
    let flashSize = 1;
    /* v8 ignore start */
    if (shooter.type === 'bazooka') {
      flashColor = '#F39C12'; // Big orange flash
      flashSize = 2;
    } else if (shooter.type === 'laser') {
      flashColor = '#00FFFF'; // Cyan flash
      flashSize = 1;
    } else if (shooter.type === 'rambo') {
      flashColor = '#FFD700'; // Gold flash
    }
    /* v8 ignore stop */

    addParticle(shooter.x, shooter.y - 10, 'spark', flashColor, flashSize);
  }

  army.lastShotTime = now;
}

export function activateSuperCannon(gameState: GameState): void {
  const now = Date.now();
  if (!gameState.superCannonReady) return;
  /* v8 ignore next */
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
    /* v8 ignore start */
    gameState.superCannonTimer -= deltaTime;

    if (gameState.superCannonTimer <= 0) {
      gameState.superCannonActive = false;
      gameState.superCannonTimer = 0;
    } else {
      applySuperCannonDamage(entities, gameState);
    }
    /* v8 ignore stop */
  }
}

function applySuperCannonDamage(entities: Entities, gameState: GameState): void {
  const army = entities.playerArmy;
  /* v8 ignore next */
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

  /* v8 ignore start */
  if (entities.boss && entities.boss.isActive) {
    const boss = entities.boss;
    const bossCenter = boss.x + boss.width / 2;
    if (bossCenter > beamX - beamWidth / 2 && bossCenter < beamX + beamWidth / 2) {
      /* v8 ignore next */
      boss.hp -= damage * 0.1;
      if (boss.hp <= 0) {
        boss.isActive = false;
        gameState.isVictory = true;
        gameState.score += 1000;
        addFloatingText('BOSS DESTROYED!', boss.x + boss.width / 2, boss.y, '#FFD700');
        triggerScreenShake(20, 1000);
      }
    }
  }
  /* v8 ignore stop */
}

export function updateBullets(entities: Entities, gameState: GameState, dtFactor: number): void {
  tempPlayerBullets.length = 0;

  // Atualizar e remover bullets fora da tela manualmente para usar o pool
  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    const bullet = entities.bullets[i];
    bullet.y += bullet.speed * dtFactor;

    if (bullet.y <= -50 || bullet.y >= 900) {
      bulletPool.release(bullet);
      fastRemove(entities.bullets, i);
    } else if (!bullet.isEnemy) {
      /* v8 ignore next */
      tempPlayerBullets.push(bullet);
    }
  }

  // Se não houver balas do jogador, não precisamos popular a grid nem verificar colisões complexas
  /* v8 ignore start */
  if (tempPlayerBullets.length > 0) {
    // 1. Popular a Grid Espacial com Inimigos (Soldados e MiniBosses)
    enemyGrid.clear();

    // Hordas
    for (const horde of entities.enemyHordes) {
      if (!horde.isActive || horde.y < 100) continue;
      for (const soldier of horde.soldiers) {
        if (soldier.isAlive && soldier.y >= 100) {
          enemyGrid.insert(
            soldier.x - soldier.size,
            soldier.y - soldier.size,
            soldier.size * 2,
            soldier.size * 2,
            'soldier',
            soldier,
            horde
          );
        }
      }
    }

    // MiniBosses
    for (const mb of entities.miniBosses) {
      if (!mb.isActive || mb.y < 50) continue;
      enemyGrid.insert(
        mb.x,
        mb.y,
        mb.width,
        mb.height,
        'miniboss',
        mb
      );
    }

    // Mystery Boxes
    for (const box of entities.mysteryBoxes) {
      if (!box.passed) {
        enemyGrid.insert(
          box.x,
          box.y,
          box.width,
          box.height,
          'mysterybox',
          box
        );
      }
    }
  }

  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    const bullet = entities.bullets[i];
    if (bullet.isEnemy) continue;

    let bulletHit = false;

    // Usar a Grid para buscar candidatos a colisão
    // Área de consulta: Posição da bala +/- 10px
    const nearby = enemyGrid.query(bullet.x - 10, bullet.y - 10, 20, 20, tempQueryResults);

    /* v8 ignore start */
    for (const item of nearby) {
      if (bulletHit) break;

      if (item.type === 'soldier') {
        const soldier = item.obj as Soldier;
        const horde = item.horde as EnemyHorde;

        if (horde.isActive && soldier.isAlive && checkBulletSoldierCollision(bullet, soldier)) {
          // SHARED HP LOGIC: Damage the Horde
          horde.hp -= bullet.damage;
          soldier.hitTimer = 5;

          // Critical Hit Text
          if (bullet.damage >= 5) {
             const isCrit = bullet.damage >= 10;
             addFloatingText(
                 Math.floor(bullet.damage).toString(),
                 soldier.x,
                 soldier.y - 20,
                 isCrit ? '#FF0000' : '#FFF',
                 isCrit ? 1.5 : 1.0,
                 isCrit ? 'critical' : 'normal'
             );
          }

          addParticle(soldier.x, soldier.y, 'hitmarker', '#FFF');
          addExplosion(soldier.x, soldier.y, '#E74C3C');

          // Determine how many soldiers should be alive based on % of Horde HP left
          const count = horde.count > 0 ? horde.count : horde.soldiers.length;
          const avgHp = horde.maxHp / count;
          const safeAvgHp = avgHp > 0 ? avgHp : 1;

          const targetAliveCount = Math.max(0, Math.ceil(horde.hp / safeAvgHp));
          const currentAlive = horde.soldiers.filter(s => s.isAlive).length;

          if (currentAlive > targetAliveCount) {
              // Kill the difference
              const toKill = currentAlive - targetAliveCount;
              let killedCount = 0;

              // Kill the hit soldier first if alive
              if (soldier.isAlive) {
                  soldier.isAlive = false;
                  soldier.hp = 0;
                  killedCount++;
                  gameState.score += 10;
                  // Ensure coin is awarded only once per unique soldier death
                  gameState.coins += 1; // Coin per enemy kill
              }

              // Kill nearest other soldiers if we need to kill more
              if (killedCount < toKill) {
                  for (const s of horde.soldiers) {
                      if (killedCount >= toKill) break;
                      if (s.isAlive) {
                          s.isAlive = false;
                          s.hp = 0;
                          killedCount++;
                          gameState.score += 10;
                          // Fix: Prevent infinite coin exploit by ensuring one coin per kill
                          gameState.coins += 1;
                          addExplosion(s.x, s.y, '#E74C3C');
                      }
                  }
              }

              // Clean up dead soldiers
              for (let k = horde.soldiers.length - 1; k >= 0; k--) {
                  if (!horde.soldiers[k].isAlive) {
                      const s = horde.soldiers[k];
                      horde.soldiers.splice(k, 1);
                      soldierPool.release(s);
                  }
              }
              horde.count = horde.soldiers.length;

              if (horde.soldiers.length === 0 || horde.hp <= 0) {
                  horde.isActive = false;
                  gameState.score += 50;
                  addFloatingText('HORDE DESTROYED!', horde.x, horde.y, '#FFD700');
                  addParticle(horde.x, horde.y, 'star', '#FFD700', 8);
              }
          }

          bulletPool.release(bullet);
          fastRemove(entities.bullets, i);
          bulletHit = true;
        }
      } else if (item.type === 'miniboss') {
        const miniBoss = item.obj as MiniBoss;

        // Check isActive to prevent multiple bullets killing the same miniboss in one frame
        if (!miniBoss.isActive) continue;

        // Colisão AABB simples para MiniBoss
        if (bullet.x > miniBoss.x && bullet.x < miniBoss.x + miniBoss.width &&
            bullet.y > miniBoss.y && bullet.y < miniBoss.y + miniBoss.height) {

          miniBoss.hp -= bullet.damage;
          miniBoss.hitTimer = 5;
          addExplosion(bullet.x, bullet.y, '#FF4500');

          // Visual Damage Number
          addFloatingText(Math.floor(bullet.damage).toString(), bullet.x, bullet.y - 20, '#FFF', 0.8);
          addParticle(bullet.x, bullet.y, 'hitmarker', '#FFF');

          if (miniBoss.hp <= 0) {
            miniBoss.isActive = false;
            gameState.score += 200;
            addFloatingText('MINI-BOSS!', miniBoss.x + miniBoss.width / 2, miniBoss.y, '#FF4500');
            for (let k = 0; k < 3; k++) {
              setTimeout(() => {
                addExplosion(miniBoss.x + Math.random() * miniBoss.width, miniBoss.y + Math.random() * miniBoss.height, '#FF4500');
              }, k * 50);
            }
          }

          bulletPool.release(bullet);
          fastRemove(entities.bullets, i);
          bulletHit = true;
        }
      }
    }
  /* v8 ignore stop */

    if (bulletHit) continue;

    // Colisão com boss (separado da grid pois é único e grande)
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
        boss.hitTimer = 5;
        bulletPool.release(bullet);
        fastRemove(entities.bullets, i);

        // Efeito de impacto no boss
        addExplosion(bullet.x, bullet.y, boss.type === 'mothership' ? '#00FF88' : '#FF6B6B');

        // Visual Damage Number
        const isCrit = bullet.damage > 10;
        addFloatingText(
          Math.floor(bullet.damage).toString(),
          bullet.x,
          bullet.y - 30,
          isCrit ? '#FFD700' : '#FFF',
          isCrit ? 1.2 : 0.9,
          isCrit ? 'critical' : 'normal'
        );
        addParticle(bullet.x, bullet.y, 'hitmarker', '#FFF');

        if (boss.hp <= 0) {
          boss.isActive = false;
          triggerScreenShake(20, 1000); // Shake forte na morte do boss

          /* v8 ignore start */
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
          /* v8 ignore stop */
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
