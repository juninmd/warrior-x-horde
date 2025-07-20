// @ts-check
// entityUpdater.ts - Lógica para atualizar e aplicar dano em entidades
import { Boss, Enemy, Entities, GameState, Player } from './types';
import { canvas } from './game';
import { gameState } from './gameState';
import { createBullet } from './entities';
import { sounds } from './audio';

// Atualizar entidades
export function updateEntities(entities: Entities, gameState: GameState, isShooting: boolean): void {
  const now = Date.now();

  // Atualizar aliados
  entities.allies.forEach(ally => {
    if (ally.damageEffect > 0) ally.damageEffect--;
    if (ally.isMainPlayer) {
      if (!gameState.superCannonReady && now - gameState.superCannonLastUsed >= gameState.superCannonCooldown) {
        gameState.superCannonReady = true;
      }
      if (gameState.superCannonActive) {
        if (now - gameState.superCannonTimer > gameState.superCannonDuration) {
          gameState.superCannonActive = false;
          gameState.screenShakeActive = false;
        } else if (now - gameState.superCannonTimer > gameState.superCannonDuration - 1000 && !gameState.superCannonWarningPlayed) { // 1 second warning
          sounds.superCannonWarning.play();
          gameState.superCannonWarningPlayed = true;
        }
      }
      // Player shooting animation state
      if (!isShooting && ally.animationState === 'shooting') {
        ally.animationState = 'idle';
      }
    }
  });

  // Update screen shake
  if (gameState.screenShakeActive) {
    gameState.screenShakeTimer += (now - gameState.lastFrameTime);
    if (gameState.screenShakeTimer >= gameState.screenShakeDuration) {
      gameState.screenShakeActive = false;
      gameState.screenShakeIntensity = 0;
      gameState.screenShakeTimer = 0;
      gameState.superCannonWarningPlayed = false;
    }
  }
  gameState.lastFrameTime = now;

  // Atualizar balas
  entities.bullets = entities.bullets.filter(bullet => {
    bullet.y += bullet.isEnemy ? bullet.speed : -bullet.speed;
    return bullet.y > 0 && bullet.y < canvas.height;
  });

  // Atualizar inimigos
  entities.enemies.forEach((enemy, index) => {
    if (enemy.hp <= 0 && !enemy.isDeadAndAnimating) {
      enemy.animationState = 'dying';
      enemy.isDeadAndAnimating = true;
    }

    if (enemy.isDeadAndAnimating) {
      // Do not move or process dead enemies, just let the animation play
      return;
    } else {
      enemy.y += enemy.speed;
      if (enemy.y > canvas.height) {
        if (entities.allies.length > 0) applyDamage(entities.allies[0], 1);
        entities.enemies.splice(index, 1);
      }
      if (enemy.damageEffect > 0) enemy.damageEffect--;

      // Check for attacking state (melee enemies)
      if (enemy.attackType === 'melee' && entities.allies.length > 0) {
        const mainPlayer = entities.allies[0];
        // Simple proximity check for now
        if (Math.abs(enemy.x - mainPlayer.x) < 50 && Math.abs(enemy.y - mainPlayer.y) < 50) {
          enemy.animationState = 'attacking';
        } else {
          enemy.animationState = 'walking';
        }
      }
    }
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
  processShooting(entities, isShooting);
}

// Aplicar dano
export function applyDamage(entity: Player | Enemy | Boss, damage: number): boolean {
  if ((entity as any)?.shield && (entity as any)?.shield > 0) {
    (entity as any).shield--;
  } else {
    entity.hp -= damage;
    entity.damageEffect = 5;
    if ((entity as Player).isMainPlayer) {
      sounds.playerHit.play();
    } else if ((entity as Enemy).isZombie || (entity as Boss).type === 'boss') {
      sounds.enemyHit.play();
    }
  }
  return entity.hp <= 0;
}

export function processShooting(entities: Entities, isShooting: boolean): void {
  if (entities.allies.length === 0 || !isShooting) return;

  const now = Date.now();

  entities.allies.forEach(ally => {
    if (now - ally.lastShotTime >= ally.fireRate) {
      entities.bullets.push(createBullet(ally, false));
      ally.lastShotTime = now;
    }
  });
}