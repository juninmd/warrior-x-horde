// @ts-check

// collision.ts - Sistema de colisões simplificado
import { sounds } from './audio';
import { applyDamage, createReinforcement } from './entities';
import { canvas } from './game';
import { Entities, GameState, Player, Barrel, Enemy } from './types';

const DAMAGE_EFFECT_DURATION = 5;

export function checkCollisions(entities: Entities, gameState: GameState, handleEntityDeath: (entity: any, index: number | null, type: string) => void) {
  const { allies } = entities;
  if (allies.length > 0 && gameState.superCannonActive) checkSuperCannonCollisions(entities, gameState, handleEntityDeath);
  checkBulletCollisions(entities, gameState, handleEntityDeath);
  checkDirectCollisions(entities, gameState, handleEntityDeath);
  checkBarrelCollisions(entities, gameState);
}

function isColliding(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function checkSuperCannonCollisions(entities: Entities, gameState: GameState, handleEntityDeath: (entity: any, index: number | null, type: string) => void) {
  const { allies, enemies, boss, barrels } = entities;
  if (allies.length === 0) return;
  const mainPlayer = allies[0], beamX = mainPlayer.x + mainPlayer.width / 2 - 10, beamWidth = 20;
  if (boss && boss.y < mainPlayer.y && boss.x + boss.width > beamX && boss.x < beamX + beamWidth) {
    boss.hp -= mainPlayer.bulletDamage * gameState.superCannonDamageMultiply;
    if ('damageEffect' in boss) boss.damageEffect = DAMAGE_EFFECT_DURATION;
    if (boss.hp <= 0) handleEntityDeath(boss, null, 'boss');
  }
  enemies.forEach((enemy, i) => {
    if (enemy.y < mainPlayer.y && enemy.x + enemy.width > beamX && enemy.x < beamX + beamWidth) {
      enemy.hp -= mainPlayer.bulletDamage * gameState.superCannonDamageMultiply;
      enemy.damageEffect = DAMAGE_EFFECT_DURATION;
      if (enemy.hp <= 0) handleEntityDeath(enemy, i, 'enemy');
    }
  });
  barrels.forEach((barrel, i) => {
    if (barrel.y < mainPlayer.y && barrel.x + barrel.width > beamX && barrel.x < beamX + beamWidth) {
      barrel.hp -= mainPlayer.bulletDamage * gameState.superCannonDamageMultiply;
      if (barrel.hp <= 0) {
        barrels.splice(i, 1);
        processBarrelEffect(barrel, mainPlayer, entities, gameState);
      }
    }
  });
}

function checkBulletCollisions(entities: Entities, gameState: GameState, handleEntityDeath: (entity: any, index: number | null, type: string) => void) {
  const { allies, enemies, boss, bullets, barrels } = entities;
  bullets.forEach((bullet, i) => {
    if (bullet.isEnemy) {
      allies.forEach((ally, j) => {
        if (isColliding(bullet, ally)) {
          bullets.splice(i, 1);
          if (applyDamage(ally, bullet.damage)) handleEntityDeath(ally, j, 'ally');
        }
      });
    } else {
      enemies.forEach((enemy, j) => {
        if (isColliding(bullet, enemy)) {
          bullets.splice(i, 1);
          enemy.hp -= bullet.damage;
          enemy.damageEffect = DAMAGE_EFFECT_DURATION;
          if (enemy.hp <= 0) handleEntityDeath(enemy, j, 'enemy');
        }
      });
      if (boss && isColliding(bullet, boss)) {
        bullets.splice(i, 1);
        boss.hp -= bullet.damage;
        boss.damageEffect = DAMAGE_EFFECT_DURATION;
        if (boss.hp <= 0) handleEntityDeath(boss, null, 'boss');
      }
      barrels.forEach((barrel, j) => {
        if (isColliding(bullet, barrel)) {
          bullets.splice(i, 1);
          barrel.hp -= bullet.damage;
          if (barrel.hp <= 0) {
            barrels.splice(j, 1);
            if (entities.allies.length > 0) processBarrelEffect(barrel, entities.allies[0], entities, gameState);
          }
        }
      });
    }
  });
}

function checkDirectCollisions(
  entities: Entities,
  gameState: GameState,
  handleEntityDeath: (entity: any, index: number | null, type: string) => void
) {
  const { allies, enemies, boss, barrels } = entities, canvasHeight = canvas.height;
  allies.forEach((ally: Player, i: number) => {
    enemies.forEach((enemy: Enemy, j: number) => {
      if (isColliding(ally, enemy)) {
        enemies.splice(j, 1);
        if (applyDamage(ally, 1)) handleEntityDeath(ally, i, 'ally');
      }
    });
    if (boss && isColliding(ally, boss)) {
      if (applyDamage(ally, ally.hp)) handleEntityDeath(ally, i, 'ally');
    }
    barrels.forEach((barrel: Barrel, j: number) => {
      if (isColliding(ally, barrel)) {
        barrels.splice(j, 1);
        if (applyDamage(ally, 1)) handleEntityDeath(ally, i, 'ally');
      }
    });
  });
  enemies.forEach((enemy: Enemy, i: number) => {
    if (enemy.y > canvasHeight) {
      enemies.splice(i, 1);
      if (allies.length > 0 && applyDamage(allies[0], 1)) handleEntityDeath(allies[0], 0, 'ally');
    }
  });
}

function checkBarrelCollisions(entities: Entities, gameState: GameState) {
  const { allies, barrels } = entities;
  if (allies.length === 0) return;
  const mainPlayer = allies[0];
  barrels.forEach((barrel: Barrel, i: number) => {
    if (isColliding(mainPlayer, barrel)) {
      barrels.splice(i, 1);
      processBarrelEffect(barrel, mainPlayer, entities, gameState);
    }
  });
}

// Validar
function processBarrelEffect(barrel: Barrel, player: Player, entities: Entities, gameState: GameState) {
  switch (barrel.barrelType) {
    case 'reinforcement':
      if (entities.allies.length < gameState.maxReinforcements) {
        const offsetX = entities.allies.length % 2 === 0 ? -30 * entities.allies.length : 30 * entities.allies.length;
        entities.allies.push(createReinforcement(offsetX, player));
        sounds.buff_damage.play();
      }
      break;
    case 'buff':
      const rand = Math.random();
      if (rand < 0.25) player.shield += 1;
      else if (rand < 0.5) player.bulletDamage += 1;
      else if (rand < 0.75) player.fireRate += Math.max(100, player.fireRate - 100);
      sounds.buff_damage.play();
      break;
    case 'nerf':
      const nerfRand = Math.random();
      if (nerfRand < 0.33) player.bulletDamage -= Math.max(1, player.bulletDamage - 1);
      else if (nerfRand < 0.66) player.fireRate -= 100;
      else player.hp = Math.max(1, player.hp - 1);
      sounds.nerf.play();
      break;
    case 'health':
      player.hp += 1;
      sounds.buff_health.play();
      break;
  }
}
