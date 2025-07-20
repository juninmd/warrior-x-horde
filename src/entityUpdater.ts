// @ts-check
// entityUpdater.ts - Lógica para atualizar e aplicar dano em entidades
import { Entities, GameState, Player } from './types';
import { canvas } from './game';
import { gameState } from './gameState';
import { createBullet } from './entities';

// Atualizar entidades
export function updateEntities(entities: Entities, gameState: GameState): void {
  const now = Date.now();

  // Atualizar aliados
  entities.allies.forEach(ally => {
    if (ally.damageEffect > 0) ally.damageEffect--;
    if (ally.isMainPlayer && !gameState.superCannonReady && now - gameState.superCannonLastUsed >= gameState.superCannonCooldown) {
      gameState.superCannonReady = true;
    }
    if (ally.isMainPlayer && gameState.superCannonActive && now - gameState.superCannonTimer > gameState.superCannonDuration) {
      gameState.superCannonActive = false;
    }
  });

  // Atualizar balas
  entities.bullets = entities.bullets.filter(bullet => {
    bullet.y += bullet.isEnemy ? bullet.speed : -bullet.speed;
    return bullet.y > 0 && bullet.y < canvas.height;
  });

  // Atualizar inimigos
  entities.enemies.forEach((enemy, index) => {
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      if (entities.allies.length > 0) applyDamage(entities.allies[0], 1);
      entities.enemies.splice(index, 1);
    }
    if (enemy.damageEffect > 0) enemy.damageEffect--;
  });

  // Atualizar chefe
  if (entities.boss) {
    entities.boss.y += entities.boss.speed;
    if (entities.boss.damageEffect > 0) entities.boss.damageEffect--;
    if (now - entities.boss.lastShot > entities.boss.bulletDelay) {
      entities.bullets.push(createBullet(entities.boss, true));
      entities.boss.lastShot = now;
    }
    if (entities.boss.y > canvas.height) {
      entities.boss = null;
      if (gameState) gameState.isGameOver = true;
    }
  }

  // Atualizar barris
  entities.barrels.forEach(barrel => {
    barrel.y += barrel.speed;
  });
  entities.barrels = entities.barrels.filter(b => b.y <= canvas.height);
}

// Aplicar dano
export function applyDamage(entity: Player, damage: number): boolean {
  if (entity.shield > 0) {
    entity.shield--;
  } else {
    entity.hp -= damage;
    entity.damageEffect = 5;
  }
  return entity.hp <= 0;
}
