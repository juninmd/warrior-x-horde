// @ts-check
// collisions/directCollisions.ts - Lógica de colisão direta
import { applyDamage } from '../entityUpdater';
import { isColliding } from './utils';
import { Entities, GameState, Player, Barrel, Enemy } from '../types';
import { canvas } from '../game';

export function checkDirectCollisions(
  entities: Entities,
  gameState: GameState,
  handleEntityDeath: (entity: Player | Enemy | Barrel | null, index: number | null, type: string) => void
) {
  const { allies, enemies, boss, barrels } = entities;
  const canvasHeight = canvas.height;
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
