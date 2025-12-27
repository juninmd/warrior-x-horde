// shooting.ts - Sistema de tiro automático
import { Entities, GameState, Bullet, Army, EnemyHorde, Boss } from './types';

export function createBullet(x: number, y: number, targetX: number, targetY: number, damage: number, isEnemy: boolean): Bullet {
  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return {
    x,
    y,
    targetX,
    targetY,
    speed: isEnemy ? 3 : -8, // Negativo = para cima
    damage,
    isEnemy,
  };
}

function findNearestTarget(army: Army, hordes: EnemyHorde[], boss: Boss | null): { x: number; y: number } | null {
  let nearestDist = Infinity;
  let nearest: { x: number; y: number } | null = null;

  // Checar hordas
  for (const horde of hordes) {
    if (!horde.isActive || horde.soldiers.length === 0) continue;

    const dx = horde.x - army.centerX;
    const dy = horde.y - army.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < nearestDist && horde.y < army.centerY) {
      nearestDist = dist;
      nearest = { x: horde.x, y: horde.y };
    }
  }

  // Checar boss
  if (boss && boss.isActive) {
    const dx = boss.x + boss.width / 2 - army.centerX;
    const dy = boss.y + boss.height / 2 - army.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < nearestDist) {
      nearest = { x: boss.x + boss.width / 2, y: boss.y + boss.height / 2 };
    }
  }

  return nearest;
}

export function updateShooting(entities: Entities, gameState: GameState): void {
  if (gameState.isGameOver || gameState.isVictory) return;

  const army = entities.playerArmy;
  const now = Date.now();

  // Verificar se pode atirar
  if (now - army.lastShotTime < army.fireRate) return;

  // Encontrar alvo mais próximo
  const target = findNearestTarget(army, entities.enemyHordes, entities.boss);
  if (!target) return;

  // Criar balas de soldados aleatórios
  const aliveSoldiers = army.soldiers.filter(s => s.isAlive);
  const shootersCount = Math.min(3, aliveSoldiers.length);

  for (let i = 0; i < shootersCount; i++) {
    const shooter = aliveSoldiers[Math.floor(Math.random() * aliveSoldiers.length)];
    entities.bullets.push(createBullet(
      shooter.x,
      shooter.y - 10,
      target.x + (Math.random() - 0.5) * 30,
      target.y,
      army.damage,
      false
    ));
  }

  army.lastShotTime = now;
}

export function updateBullets(entities: Entities, gameState: GameState): void {
  // Mover bullets
  for (const bullet of entities.bullets) {
    bullet.y += bullet.speed;
  }

  // Remover bullets fora da tela
  entities.bullets = entities.bullets.filter(b => b.y > -50 && b.y < 900);

  // Checar colisões de bullets com inimigos
  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    const bullet = entities.bullets[i];
    if (bullet.isEnemy) continue;

    let bulletHit = false;

    // Checar colisão com hordas - hitbox maior e mais precisa
    for (const horde of entities.enemyHordes) {
      if (!horde.isActive || bulletHit) continue;

      // Checar contra cada soldado individualmente (mais preciso)
      for (let j = horde.soldiers.length - 1; j >= 0; j--) {
        const soldier = horde.soldiers[j];
        if (!soldier.isAlive) continue;

        const dx = bullet.x - soldier.x;
        const dy = bullet.y - soldier.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Hitbox de 25 pixels por soldado
        if (dist < 25) {
          horde.soldiers.splice(j, 1);
          horde.count = horde.soldiers.length;
          gameState.score += 10;

          if (horde.soldiers.length === 0) {
            horde.isActive = false;
            gameState.score += 50;
          }

          entities.bullets.splice(i, 1);
          bulletHit = true;
          break;
        }
      }

      // Fallback: hitbox grande baseada no tamanho da horda
      if (!bulletHit) {
        const hordeRadius = Math.max(80, horde.width / 2 + 30);
        const dx = bullet.x - horde.x;
        const dy = bullet.y - horde.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < hordeRadius && horde.soldiers.length > 0) {
          const idx = horde.soldiers.findIndex(s => s.isAlive);
          if (idx >= 0) {
            horde.soldiers.splice(idx, 1);
            horde.count = horde.soldiers.length;
            gameState.score += 10;

            if (horde.soldiers.length === 0) {
              horde.isActive = false;
              gameState.score += 50;
            }
          }

          entities.bullets.splice(i, 1);
          bulletHit = true;
        }
      }
    }

    if (bulletHit) continue;

    // Checar colisão com boss
    if (entities.boss && entities.boss.isActive) {
      const boss = entities.boss;
      if (bullet.x > boss.x && bullet.x < boss.x + boss.width &&
          bullet.y > boss.y && bullet.y < boss.y + boss.height) {
        boss.hp -= bullet.damage;
        entities.bullets.splice(i, 1);

        if (boss.hp <= 0) {
          boss.isActive = false;
          gameState.isVictory = true;
          gameState.score += 500;
        }
      }
    }
  }
}
