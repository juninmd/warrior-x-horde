// @ts-check
// collisions/bulletCollisions.ts - Lógica de colisão para balas
import { applyDamage } from '../entityUpdater';
import { processBarrelEffect, isColliding } from './utils';
import { Entities, GameState } from '../types';

const DAMAGE_EFFECT_DURATION = 5;

export function checkBulletCollisions(entities: Entities, gameState: GameState, handleEntityDeath: (entity: any, index: number | null, type: string) => void) {
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
