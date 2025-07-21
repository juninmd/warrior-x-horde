// @ts-check
// collisions/obstacleCollisions.ts - Lógica de colisão para obstáculos
import { Entities } from '../types';
import { isColliding } from './utils';

export function checkObstacleCollisions(entities: Entities): void {
  const { allies, enemies, bullets, obstacles } = entities;

  obstacles.forEach(obstacle => {
    // Player-obstacle collisions
    allies.forEach(ally => {
      if (isColliding(ally, obstacle)) {
        // Prevent player movement through obstacles
        // This is a simplified approach; a more robust solution would involve
        // calculating the exact point of collision and adjusting position.
        // For now, we'll just stop movement if a collision is detected.
        // This will be handled in movement.ts
      }
    });

    // Enemy-obstacle collisions
    enemies.forEach(enemy => {
      if (isColliding(enemy, obstacle)) {
        // Prevent enemy movement through obstacles
        // This will be handled in movement.ts
      }
    });

    // Bullet-obstacle collisions
    entities.bullets = bullets.filter(bullet => {
      if (isColliding(bullet, obstacle)) {
        return false; // Remove bullet if it hits an obstacle
      }
      return true;
    });
  });
}
