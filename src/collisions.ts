// @ts-check
// collision.ts - Sistema de colisões simplificado
import { Entities, GameState, EntityType } from './types';
import {
  checkSuperCannonCollisions,
  checkBulletCollisions,
  checkDirectCollisions,
  checkBarrelCollisions,
  checkObstacleCollisions
} from './collisionHandlers';

export function checkCollisions(
  entities: Entities,
  gameState: GameState,
  handleEntityDeath: (entity: EntityType | null, index: number | null, type: string) => void
) {
  if (entities.allies.length > 0 && gameState.superCannonActive) {
    checkSuperCannonCollisions(entities, gameState, handleEntityDeath);
  }
  checkBulletCollisions(entities, gameState, handleEntityDeath);
  checkDirectCollisions(entities, gameState, handleEntityDeath);
  checkBarrelCollisions(entities, gameState);
  checkObstacleCollisions(entities);
}
