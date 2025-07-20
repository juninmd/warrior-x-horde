// @ts-check
// collisions/utils.ts - Funções utilitárias para colisões
import { sounds } from '../audio';
import { createReinforcement } from '../entities';
import { applyDamage } from '../entityUpdater';
import { Entities, GameState, Player, Barrel } from '../types';

export function isColliding(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function processBarrelEffect(barrel: Barrel, player: Player, entities: Entities, gameState: GameState) {
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
      if (rand < 0.25) player.shield += 5;
      else if (rand < 0.5) player.bulletDamage += 5;
      else if (rand < 0.75) player.fireRate -= Math.max(10, player.fireRate - 100);
      sounds.buff_damage.play();
      break;
    case 'nerf':
      const nerfRand = Math.random();
      if (nerfRand < 0.33) player.bulletDamage -= Math.max(1, player.bulletDamage - 1);
      else if (nerfRand < 0.66) player.fireRate += 100;
      else player.hp = Math.max(1, player.hp - 1);
      sounds.nerf.play();
      break;
    case 'health':
      player.hp += 1;
      sounds.buff_health.play();
      break;
  }
}
