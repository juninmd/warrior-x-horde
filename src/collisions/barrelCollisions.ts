// @ts-check
// collisions/barrelCollisions.ts - Lógica de colisão para barris
import { processBarrelEffect, isColliding } from './utils';
import { Entities, GameState, Barrel } from '../types';

export function checkBarrelCollisions(entities: Entities, gameState: GameState) {
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
