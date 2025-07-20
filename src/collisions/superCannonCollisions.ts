// @ts-check
// collisions/superCannonCollisions.ts - Lógica de colisão para o super canhão
import { sounds } from '../audio';
import { applyDamage } from '../entityUpdater';
import { processBarrelEffect, isColliding } from './utils';
import { Entities, GameState } from '../types';

const DAMAGE_EFFECT_DURATION = 5;

export function checkSuperCannonCollisions(entities: Entities, gameState: GameState, handleEntityDeath: (entity: any, index: number | null, type: string) => void) {
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
