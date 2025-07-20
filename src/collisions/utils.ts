// @ts-check
// collisions/utils.ts - Funções utilitárias para colisões
import { sounds } from '../audio';
import { createReinforcement } from '../entities';
import { applyDamage } from '../entityUpdater';
import { Entities, GameState, Player, Barrel } from '../types';
import { addBuff } from '../buffs';

export function isColliding(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function processBarrelEffect(barrel: Barrel, player: Player, entities: Entities, gameState: GameState) {
  switch (barrel.barrelType) {
    case 'reinforcement':
      if (entities.allies.length < gameState.maxReinforcements) {
        entities.allies.push(createReinforcement(entities.allies.length, player));
        sounds.buff_damage.play(); // Reusing buff_damage sound for now
        addBuff('Reforço!', 'green');
      }
      break;
    case 'health':
      player.hp += 1;
      sounds.buff_health.play();
      addBuff('Vida +1', 'green');
      break;
    case 'buff_shield':
      player.shield += 5;
      sounds.buff_shield.play();
      addBuff('Escudo +5', 'green');
      break;
    case 'buff_damage':
      player.bulletDamage += 5;
      sounds.buff_damage.play();
      addBuff('Dano +5', 'green');
      break;
    case 'buff_firerate':
      player.fireRate -= Math.max(10, player.fireRate - 100);
      sounds.buff_firerate.play();
      addBuff('Velocidade de Tiro Aumentada!', 'green');
      break;
    case 'nerf_damage':
      player.bulletDamage -= Math.max(1, player.bulletDamage - 1);
      sounds.nerf.play();
      addBuff('Dano Reduzido!', 'red');
      break;
    case 'nerf_firerate':
      player.fireRate += 100;
      sounds.nerf.play();
      addBuff('Velocidade de Tiro Reduzida!', 'red');
      break;
    case 'nerf_health':
      player.hp = Math.max(1, player.hp - 1);
      sounds.nerf.play();
      addBuff('Vida Reduzida!', 'red');
      break;
  }
}
